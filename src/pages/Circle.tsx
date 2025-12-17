import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, TrendingUp, TrendingDown, Minus, Clock, Flame, ArrowRight, Plus, AtSign, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { normalizeSlug } from "@/lib/seoSlug";

interface MarketItem {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  current_price: number;
  change_24h?: number | null;
}

interface Discussion {
  id: string;
  title: string;
  type: string;
  comment_count: number;
  sentiment_score: number | null;
  price_at_creation: number | null;
  created_at: string;
  market_item: MarketItem | null;
}

const Circle = () => {
  const navigate = useNavigate();
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems] = useState<any[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("trending");
  const [user, setUser] = useState<any>(null);
  
  // New thread state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [threadTitle, setThreadTitle] = useState("");
  const [threadContent, setThreadContent] = useState("");
  const [linkedCard, setLinkedCard] = useState<MarketItem | null>(null);
  const [cardSearch, setCardSearch] = useState("");
  const [cardResults, setCardResults] = useState<MarketItem[]>([]);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [creating, setCreating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchDiscussions();
  }, [activeTab]);

  useEffect(() => {
    if (cardSearch.length >= 2) {
      searchCards();
    } else {
      setCardResults([]);
    }
  }, [cardSearch]);

  const fetchDiscussions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("discussions")
      .select(`
        id,
        title,
        type,
        comment_count,
        sentiment_score,
        price_at_creation,
        created_at,
        market_item_id
      `)
      .eq("is_active", true)
      .order(activeTab === "trending" ? "comment_count" : "created_at", { ascending: false })
      .limit(50);

    if (data) {
      const marketItemIds = data.map(d => d.market_item_id).filter(Boolean);
      let marketItems: MarketItem[] = [];
      
      if (marketItemIds.length > 0) {
        const { data: items } = await supabase
          .from("market_items")
          .select("id, name, category, current_price, image_url, change_24h")
          .in("id", marketItemIds);
        marketItems = items || [];
      }

      const discussionsWithItems = data.map(d => ({
        ...d,
        market_item: marketItems.find(m => m.id === d.market_item_id) || null
      }));

      setDiscussions(discussionsWithItems);
    }
    setLoading(false);
  };

  const searchCards = async () => {
    const { data } = await supabase
      .from("market_items")
      .select("id, name, category, image_url, current_price")
      .ilike("name", `%${cardSearch}%`)
      .limit(8);
    
    setCardResults(data || []);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setThreadContent(value);
    
    // Check for @ trigger
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (atMatch) {
      setCardSearch(atMatch[1]);
      setShowCardPicker(true);
    } else {
      setShowCardPicker(false);
    }
  };

  const insertCardMention = (card: MarketItem) => {
    setLinkedCard(card);
    
    // Replace @search with card name in content
    const cursorPos = textareaRef.current?.selectionStart || threadContent.length;
    const textBeforeCursor = threadContent.slice(0, cursorPos);
    const textAfterCursor = threadContent.slice(cursorPos);
    const newTextBefore = textBeforeCursor.replace(/@\w*$/, `@${card.name} `);
    
    setThreadContent(newTextBefore + textAfterCursor);
    setShowCardPicker(false);
    setCardSearch("");
    textareaRef.current?.focus();
  };

  const createThread = async () => {
    if (!user) {
      toast.error("Please sign in to create a thread");
      return;
    }

    if (!threadTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!threadContent.trim() || threadContent.length < 20) {
      toast.error("Please write at least 20 characters");
      return;
    }

    setCreating(true);

    try {
      // Create the discussion
      const { data: discussion, error: discussionError } = await supabase
        .from("discussions")
        .insert({
          title: threadTitle,
          description: threadContent,
          type: linkedCard ? "card" : "strategy",
          market_item_id: linkedCard?.id || null,
          price_at_creation: linkedCard?.current_price || null,
          is_admin_created: false
        })
        .select()
        .single();

      if (discussionError) throw discussionError;

      // Add the first comment (the thread content)
      const { error: commentError } = await supabase
        .from("discussion_comments")
        .insert({
          discussion_id: discussion.id,
          user_id: user.id,
          content: threadContent,
          price_at_post: linkedCard?.current_price || null
        });

      if (commentError) throw commentError;

      toast.success("Thread created!");
      setCreateDialogOpen(false);
      setThreadTitle("");
      setThreadContent("");
      setLinkedCard(null);
      
      // Navigate to the card page if linked, otherwise refresh
      if (linkedCard) {
        const slug = `${normalizeSlug(linkedCard.name)}-${linkedCard.id.slice(0, 8)}`;
        navigate(`/cards/${linkedCard.category.toLowerCase()}/${slug}`);
      } else {
        fetchDiscussions();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create thread");
    } finally {
      setCreating(false);
    }
  };

  const getSentimentIcon = (score: number | null) => {
    if (score === null) return <Minus className="w-4 h-4 text-muted-foreground" />;
    if (score > 0.2) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (score < -0.2) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "card": return "Card";
      case "market_event": return "Market Event";
      case "strategy": return "Question";
      default: return type;
    }
  };

  const getCardUrl = (discussion: Discussion) => {
    if (!discussion.market_item) return "#";
    const slug = `${normalizeSlug(discussion.market_item.name)}-${discussion.market_item.id.slice(0, 8)}`;
    return `/cards/${discussion.market_item.category.toLowerCase()}/${slug}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header cartCount={cartItems.length} onCartClick={() => setCartOpen(true)} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">The Circle</h1>
              <p className="text-muted-foreground">
                Ask questions, share insights, and discuss cards with the community. Use <span className="text-primary font-medium">@</span> to link cards.
              </p>
            </div>
            
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Thread
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Start a Discussion</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 mt-4">
                  <div>
                    <Input
                      placeholder="What's your question or topic?"
                      value={threadTitle}
                      onChange={(e) => setThreadTitle(e.target.value)}
                      className="text-lg"
                    />
                  </div>
                  
                  <div className="relative">
                    <Textarea
                      ref={textareaRef}
                      placeholder="Share your thoughts... Use @ to link a card"
                      value={threadContent}
                      onChange={handleContentChange}
                      rows={6}
                      className="resize-none"
                    />
                    
                    {/* Card picker dropdown */}
                    {showCardPicker && cardResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-64 overflow-auto">
                        {cardResults.map((card) => (
                          <button
                            key={card.id}
                            onClick={() => insertCardMention(card)}
                            className="w-full flex items-center gap-3 p-2 hover:bg-muted transition-colors text-left"
                          >
                            {card.image_url && (
                              <img src={card.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{card.name}</div>
                              <div className="text-xs text-muted-foreground">{card.category}</div>
                            </div>
                            <div className="text-sm font-medium">${card.current_price.toLocaleString()}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Linked card preview */}
                  {linkedCard && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <AtSign className="w-4 h-4 text-primary" />
                      {linkedCard.image_url && (
                        <img src={linkedCard.image_url} alt="" className="w-12 h-12 rounded object-cover" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{linkedCard.name}</div>
                        <div className="text-sm text-muted-foreground">${linkedCard.current_price.toLocaleString()}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLinkedCard(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Quick card search */}
                  {!linkedCard && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Or search to link a card..."
                        value={cardSearch}
                        onChange={(e) => {
                          setCardSearch(e.target.value);
                          setShowCardPicker(true);
                        }}
                        className="pl-10"
                      />
                    </div>
                  )}
                  
                  <Button 
                    onClick={createThread} 
                    disabled={creating || !threadTitle.trim() || threadContent.length < 20}
                    className="w-full"
                  >
                    {creating ? "Creating..." : "Post Thread"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="trending" className="flex items-center gap-2">
                <Flame className="w-4 h-4" />
                Trending
              </TabsTrigger>
              <TabsTrigger value="recent" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Content */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-16 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : discussions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No discussions yet</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to start a conversation! Ask questions about cards or share your market insights.
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  Start a Thread
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {discussions.map((discussion) => (
                <Link 
                  key={discussion.id} 
                  to={getCardUrl(discussion)}
                  className="block"
                >
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {discussion.market_item?.image_url && (
                          <img 
                            src={discussion.market_item.image_url} 
                            alt={discussion.market_item.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {getTypeLabel(discussion.type)}
                            </Badge>
                            {discussion.market_item && (
                              <Badge variant="outline" className="text-xs">
                                {discussion.market_item.category}
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold truncate mb-1">
                            {discussion.title || discussion.market_item?.name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5" />
                              {discussion.comment_count} replies
                            </span>
                            <span className="flex items-center gap-1">
                              {getSentimentIcon(discussion.sentiment_score)}
                              Sentiment
                            </span>
                            <span>
                              {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {discussion.market_item && (
                            <div className="text-right">
                              <div className="font-semibold">
                                ${discussion.market_item.current_price.toLocaleString()}
                              </div>
                              {discussion.market_item.change_24h !== null && (
                                <div className={`text-xs ${discussion.market_item.change_24h >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {discussion.market_item.change_24h >= 0 ? '+' : ''}{discussion.market_item.change_24h.toFixed(1)}%
                                </div>
                              )}
                            </div>
                          )}
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={cartItems} onRemoveItem={() => {}} />
    </div>
  );
};

export default Circle;
