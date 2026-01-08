import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Search, ChevronLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  listing_id: string | null;
  last_message_at: string | null;
  created_at: string;
  other_user_name?: string;
  listing_title?: string;
  last_message?: string;
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

const Messages = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchConversations(session.user.id);
      }
    });
  }, []);

  // Subscribe to new messages
  useEffect(() => {
    if (!user || !selectedConversation) return;

    const channel = supabase
      .channel(`messages-${selectedConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async (userId: string) => {
    try {
      const { data: convos, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Fetch additional info for each conversation
      const enrichedConvos = await Promise.all(
        (convos || []).map(async (conv) => {
          const otherUserId = conv.participant_1 === userId ? conv.participant_2 : conv.participant_1;
          
          // Get other user's profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', otherUserId)
            .single();

          const otherUserName = profile?.display_name || 'User';

          // Get listing title if exists
          let listingTitle = '';
          if (conv.listing_id) {
            const { data: listing } = await supabase
              .from('listings')
              .select('title')
              .eq('id', conv.listing_id)
              .single();
            listingTitle = listing?.title || '';
          }

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', userId);

          return {
            ...conv,
            other_user_name: otherUserName,
            listing_title: listingTitle,
            last_message: lastMsg?.content || '',
            unread_count: count || 0,
          };
        })
      );

      setConversations(enrichedConvos);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      if (user) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectConversation = (convId: string) => {
    setSelectedConversation(convId);
    fetchMessages(convId);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setIsLoading(true);

    try {
      // Filter message through edge function
      const { data: filterResult, error: filterError } = await supabase.functions.invoke('messaging', {
        body: { action: 'filter', content: newMessage }
      });

      if (filterError) throw filterError;

      if (filterResult?.isFiltered) {
        toast.error('Message contains prohibited content');
        setIsLoading(false);
        return;
      }

      // Insert message into database
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: user.id,
          content: filterResult?.filteredContent || newMessage,
          is_read: false,
        });

      if (insertError) throw insertError;

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation);

      setNewMessage('');
      // Refresh conversations to update last message
      fetchConversations(user.id);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const currentConversation = conversations.find(c => c.id === selectedConversation);

  const filteredConversations = conversations.filter(conv => 
    conv.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.listing_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={cartItems.length} onCartClick={() => {}} />
        <main className="container mx-auto px-4 py-20 text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Sign in to view messages</h1>
          <p className="text-muted-foreground mb-6">You need to be logged in to access your conversations.</p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header cartCount={cartItems.length} onCartClick={() => {}} />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="glass rounded-xl overflow-hidden h-[calc(100vh-200px)] flex">
          {/* Conversations List */}
          <div className={cn(
            "w-full md:w-80 border-r border-border/50 flex flex-col",
            selectedConversation && "hidden md:flex"
          )}>
            <div className="p-4 border-b border-border/50">
              <h2 className="font-display text-xl font-bold text-foreground mb-3">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              {loadingConversations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">Start by messaging a seller</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={cn(
                      "p-4 border-b border-border/30 cursor-pointer transition-colors",
                      selectedConversation === conv.id ? "bg-secondary" : "hover:bg-secondary/50",
                      conv.unread_count && conv.unread_count > 0 && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "font-medium text-foreground",
                        conv.unread_count && conv.unread_count > 0 && "font-semibold"
                      )}>
                        {conv.other_user_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true }) : ''}
                      </span>
                    </div>
                    {conv.listing_title && (
                      <p className="text-sm text-muted-foreground truncate">{conv.listing_title}</p>
                    )}
                    <p className={cn(
                      "text-sm truncate mt-1",
                      conv.unread_count && conv.unread_count > 0 ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {conv.last_message || 'No messages yet'}
                    </p>
                    {conv.unread_count && conv.unread_count > 0 && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                        {conv.unread_count} new
                      </span>
                    )}
                  </div>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Messages Area */}
          <div className={cn(
            "flex-1 flex flex-col",
            !selectedConversation && "hidden md:flex"
          )}>
            {selectedConversation && currentConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border/50 flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <h3 className="font-semibold text-foreground">{currentConversation.other_user_name}</h3>
                    {currentConversation.listing_title && (
                      <p className="text-sm text-muted-foreground">{currentConversation.listing_title}</p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex",
                            msg.sender_id === user.id ? "justify-end" : "justify-start"
                          )}
                        >
                          <div className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2",
                            msg.sender_id === user.id 
                              ? "bg-primary text-primary-foreground rounded-br-md" 
                              : "bg-secondary text-foreground rounded-bl-md"
                          )}>
                            <p className="text-sm">{msg.content}</p>
                            <p className={cn(
                              "text-xs mt-1",
                              msg.sender_id === user.id ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-border/50">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      disabled={isLoading}
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={isLoading || !newMessage.trim()}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Messages;
