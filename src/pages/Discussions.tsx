import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, TrendingUp, TrendingDown, Minus, Users, Clock, Flame, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Discussion {
  id: string;
  title: string;
  type: string;
  comment_count: number;
  sentiment_score: number | null;
  price_at_creation: number | null;
  created_at: string;
  market_item: {
    id: string;
    name: string;
    category: string;
    current_price: number;
    image_url: string | null;
    change_24h: number | null;
  } | null;
}

const Discussions = () => {
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems] = useState<any[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("trending");

  useEffect(() => {
    fetchDiscussions();
  }, [activeTab]);

  const fetchDiscussions = async () => {
    setLoading(true);
    let query = supabase
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

    const { data, error } = await query;

    if (data) {
      // Fetch market items for discussions
      const marketItemIds = data.map(d => d.market_item_id).filter(Boolean);
      const { data: marketItems } = await supabase
        .from("market_items")
        .select("id, name, category, current_price, image_url, change_24h")
        .in("id", marketItemIds);

      const discussionsWithItems = data.map(d => ({
        ...d,
        market_item: marketItems?.find(m => m.id === d.market_item_id) || null
      }));

      setDiscussions(discussionsWithItems);
    }
    setLoading(false);
  };

  const getSentimentIcon = (score: number | null) => {
    if (score === null) return <Minus className="w-4 h-4 text-muted-foreground" />;
    if (score > 0.2) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (score < -0.2) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "card": return "Card Discussion";
      case "market_event": return "Market Event";
      case "strategy": return "Strategy";
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header cartCount={cartItems.length} onCartClick={() => setCartOpen(true)} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Market Discussions</h1>
            <p className="text-muted-foreground">
              Context-driven discussions anchored to cards, market events, and trading strategies.
            </p>
          </div>

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
                  Discussions are created on individual card pages. Browse the marketplace to find cards and join the conversation.
                </p>
                <Button asChild>
                  <Link to="/markets">Browse Markets</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {discussions.map((discussion) => (
                <Link 
                  key={discussion.id} 
                  to={discussion.market_item ? `/card/${discussion.market_item.id}` : "#"}
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
                            {discussion.market_item?.name || discussion.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5" />
                              {discussion.comment_count} comments
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

export default Discussions;
