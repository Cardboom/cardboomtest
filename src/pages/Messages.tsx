import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Search, ChevronLeft, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Mock conversations
const MOCK_CONVERSATIONS = [
  { 
    id: '1', 
    participant: 'TopCollector', 
    lastMessage: 'Is this still available?', 
    time: '2m ago',
    unread: true,
    listing: 'Charizard Base Set PSA 10'
  },
  { 
    id: '2', 
    participant: 'CardKing99', 
    lastMessage: 'I can do $400K', 
    time: '1h ago',
    unread: false,
    listing: 'Pikachu Illustrator'
  },
  { 
    id: '3', 
    participant: 'VintageCards', 
    lastMessage: 'Deal! Let me know when you ship.', 
    time: '3h ago',
    unread: false,
    listing: 'Black Lotus Alpha'
  },
];

const MOCK_MESSAGES = [
  { id: '1', sender: 'TopCollector', content: 'Hi, is this card still available?', time: '10:30 AM', isMe: false },
  { id: '2', sender: 'Me', content: 'Yes, it is! Are you interested?', time: '10:32 AM', isMe: true },
  { id: '3', sender: 'TopCollector', content: 'Very interested. Would you consider $410K?', time: '10:33 AM', isMe: false },
  { id: '4', sender: 'Me', content: 'I can do $415K, that\'s my best price.', time: '10:35 AM', isMe: true },
  { id: '5', sender: 'TopCollector', content: 'Is this still available?', time: '10:40 AM', isMe: false },
];

const Messages = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState<any>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>('1');
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsLoading(true);

    try {
      // Filter message through edge function
      const { data: filterResult, error: filterError } = await supabase.functions.invoke('messaging', {
        body: { action: 'filter', content: newMessage }
      });

      if (filterError) throw filterError;

      if (filterResult.isFiltered) {
        toast.error('Message contains prohibited content');
        setIsLoading(false);
        return;
      }

      // In production, save to database
      toast.success('Message sent');
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const currentConversation = MOCK_CONVERSATIONS.find(c => c.id === selectedConversation);

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
              {MOCK_CONVERSATIONS.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={cn(
                    "p-4 border-b border-border/30 cursor-pointer transition-colors",
                    selectedConversation === conv.id ? "bg-secondary" : "hover:bg-secondary/50",
                    conv.unread && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "font-medium text-foreground",
                      conv.unread && "font-semibold"
                    )}>
                      {conv.participant}
                    </span>
                    <span className="text-xs text-muted-foreground">{conv.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{conv.listing}</p>
                  <p className={cn(
                    "text-sm truncate mt-1",
                    conv.unread ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {conv.lastMessage}
                  </p>
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Messages Area */}
          <div className={cn(
            "flex-1 flex flex-col",
            !selectedConversation && "hidden md:flex"
          )}>
            {selectedConversation ? (
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
                    <p className="font-semibold text-foreground">{currentConversation?.participant}</p>
                    <p className="text-xs text-muted-foreground">{currentConversation?.listing}</p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {MOCK_MESSAGES.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.isMe ? "justify-end" : "justify-start"
                        )}
                      >
                        <div className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2",
                          msg.isMe 
                            ? "bg-primary text-primary-foreground rounded-br-sm" 
                            : "bg-secondary text-foreground rounded-bl-sm"
                        )}>
                          <p className="text-sm">{msg.content}</p>
                          <p className={cn(
                            "text-xs mt-1",
                            msg.isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {msg.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Warning Banner */}
                <div className="px-4 py-2 bg-accent/10 border-t border-accent/20 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-accent shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Keep transactions safe. Do not share contact details or use external payment methods.
                  </p>
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-border/50 flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={isLoading || !newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Select a conversation to view messages</p>
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
