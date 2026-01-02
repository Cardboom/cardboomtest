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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, TrendingUp, TrendingDown, Minus, Clock, Flame, ArrowRight, Plus, AtSign, X, Search, ChevronUp, Globe, Sparkles, Swords, Trophy, Crown, Gem, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { normalizeSlug } from "@/lib/seoSlug";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useCardboomPoints } from "@/hooks/useCardboomPoints";

// Mini Card Wars Vote Banner Component
const CardWarsMiniVoteBanner = ({ userId }: { userId?: string }) => {
  const navigate = useNavigate();
  const { balance } = useCardboomPoints(userId);
  const [showInsufficientFunds, setShowInsufficientFunds] = useState(false);
  
  const hasEnoughFunds = balance >= 100; // Minimum 100 points to participate (~$0.10)
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("Please sign in to participate");
      navigate("/auth");
      return;
    }
    
    if (hasEnoughFunds) {
      navigate("/card-wars");
    } else {
      setShowInsufficientFunds(true);
    }
  };
  
  if (showInsufficientFunds) {
    return (
      <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-amber-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-amber-500">Not Enough Funds</h3>
              <p className="text-sm text-muted-foreground">
                Get Pro for $2.50 free Cardboom Points monthly!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowInsufficientFunds(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
              onClick={() => navigate("/pricing")}
            >
              <Crown className="w-3 h-3 mr-1" />
              Get Pro
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <button
      onClick={handleClick}
      className="w-full mb-6 p-3 rounded-lg bg-gradient-to-r from-orange-500/5 via-red-500/5 to-orange-500/5 border border-orange-500/20 hover:border-orange-500/40 transition-colors text-left group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium">Did you vote this week's Card War battle?</span>
          <Badge variant="outline" className="border-orange-500/30 text-orange-500 text-xs py-0">
            <Flame className="w-2.5 h-2.5 mr-0.5 animate-pulse" />
            LIVE
          </Badge>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-orange-500 transition-colors" />
      </div>
    </button>
  );
};

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
  upvotes: number;
  language: string;
  market_item: MarketItem | null;
  hasVoted?: boolean;
}

type SortTab = "hot" | "top" | "new";
type LanguageFilter = "all" | "en" | "tr" | "de" | "fr" | "it" | "ar";

const LANGUAGE_LABELS: Record<LanguageFilter, string> = {
  all: "All Languages",
  en: "English",
  tr: "Türkçe",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  ar: "العربية",
};

// Reddit-style hot score algorithm
const calculateHotScore = (upvotes: number, createdAt: string): number => {
  const epochSeconds = new Date(createdAt).getTime() / 1000;
  const order = Math.log10(Math.max(Math.abs(upvotes), 1));
  const sign = upvotes > 0 ? 1 : upvotes < 0 ? -1 : 0;
  const seconds = epochSeconds - 1134028003; // Reddit epoch
  return sign * order + seconds / 45000;
};

const Circle = () => {
  const navigate = useNavigate();
  const { locale } = useLanguage();
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems] = useState<any[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortTab, setSortTab] = useState<SortTab>("hot");
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>("all");
  const [user, setUser] = useState<any>(null);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  
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
  }, [sortTab, languageFilter]);

  useEffect(() => {
    if (user) {
      fetchUserVotes();
    }
  }, [user]);

  useEffect(() => {
    if (cardSearch.length >= 2) {
      searchCards();
    } else {
      setCardResults([]);
    }
  }, [cardSearch]);

  const fetchUserVotes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("discussion_votes")
      .select("discussion_id")
      .eq("user_id", user.id);
    
    if (data) {
      setUserVotes(new Set(data.map(v => v.discussion_id)));
    }
  };

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
        upvotes,
        language,
        market_item_id
      `)
      .eq("is_active", true);

    // Language filter
    if (languageFilter !== "all") {
      query = query.eq("language", languageFilter);
    }

    // Sorting
    if (sortTab === "new") {
      query = query.order("created_at", { ascending: false });
    } else if (sortTab === "top") {
      query = query.order("upvotes", { ascending: false });
    } else {
      // Hot: fetch all and sort client-side
      query = query.order("created_at", { ascending: false });
    }

    query = query.limit(100);

    const { data, error } = await query;

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

      let discussionsWithItems = data.map(d => ({
        ...d,
        upvotes: d.upvotes || 0,
        language: d.language || "en",
        market_item: marketItems.find(m => m.id === d.market_item_id) || null,
        hasVoted: userVotes.has(d.id)
      }));

      // Apply hot sort client-side
      if (sortTab === "hot") {
        discussionsWithItems.sort((a, b) => 
          calculateHotScore(b.upvotes, b.created_at) - calculateHotScore(a.upvotes, a.created_at)
        );
      }

      setDiscussions(discussionsWithItems);
    }
    setLoading(false);
  };

  const handleUpvote = async (discussionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Please sign in to upvote");
      return;
    }

    const hasVoted = userVotes.has(discussionId);

    try {
      if (hasVoted) {
        // Remove vote
        await supabase
          .from("discussion_votes")
          .delete()
          .eq("discussion_id", discussionId)
          .eq("user_id", user.id);

        setUserVotes(prev => {
          const next = new Set(prev);
          next.delete(discussionId);
          return next;
        });

        setDiscussions(prev => prev.map(d => 
          d.id === discussionId ? { ...d, upvotes: Math.max(0, d.upvotes - 1), hasVoted: false } : d
        ));
      } else {
        // Add vote
        await supabase
          .from("discussion_votes")
          .insert({ discussion_id: discussionId, user_id: user.id });

        setUserVotes(prev => new Set([...prev, discussionId]));

        setDiscussions(prev => prev.map(d => 
          d.id === discussionId ? { ...d, upvotes: d.upvotes + 1, hasVoted: true } : d
        ));
      }
    } catch (error: any) {
      toast.error("Failed to vote");
    }
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
      const { data: discussion, error: discussionError } = await supabase
        .from("discussions")
        .insert({
          title: threadTitle,
          description: threadContent,
          type: linkedCard ? "card" : "strategy",
          market_item_id: linkedCard?.id || null,
          price_at_creation: linkedCard?.current_price || null,
          language: locale,
          is_admin_created: false
        })
        .select()
        .single();

      if (discussionError) throw discussionError;

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
    if (!discussion.market_item) return `/circle/${discussion.id}`;
    const slug = `${normalizeSlug(discussion.market_item.name)}-${discussion.market_item.id.slice(0, 8)}`;
    return `/cards/${discussion.market_item.category.toLowerCase()}/${slug}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header cartCount={cartItems.length} onCartClick={() => setCartOpen(true)} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Card Wars Mini Banner */}
          <CardWarsMiniVoteBanner userId={user?.id} />

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">The Circle</h1>
              <p className="text-muted-foreground">
                Ask questions, share insights, and discuss cards. Use <span className="text-primary font-medium">@</span> to link cards.
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
                  <Input
                    placeholder="What's your question or topic?"
                    value={threadTitle}
                    onChange={(e) => setThreadTitle(e.target.value)}
                    className="text-lg"
                  />
                  
                  <div className="relative">
                    <Textarea
                      ref={textareaRef}
                      placeholder="Share your thoughts... Use @ to link a card"
                      value={threadContent}
                      onChange={handleContentChange}
                      rows={6}
                      className="resize-none"
                    />
                    
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
                      <Button variant="ghost" size="icon" onClick={() => setLinkedCard(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
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

          {/* Sort Tabs */}
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
              <button
                onClick={() => setSortTab("hot")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  sortTab === "hot" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Flame className="w-4 h-4" />
                Hot
              </button>
              <button
                onClick={() => setSortTab("top")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  sortTab === "top" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sparkles className="w-4 h-4" />
                Top
              </button>
              <button
                onClick={() => setSortTab("new")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  sortTab === "new" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Clock className="w-4 h-4" />
                New
              </button>
            </div>

            {/* Language Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <Globe className="w-4 h-4 text-muted-foreground" />
              {(Object.keys(LANGUAGE_LABELS) as LanguageFilter[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguageFilter(lang)}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm transition-colors",
                    languageFilter === lang 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {LANGUAGE_LABELS[lang]}
                </button>
              ))}
            </div>
          </div>

          {/* Threads List */}
          {loading ? (
            <div className="space-y-0 divide-y divide-border border rounded-lg overflow-hidden">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 animate-pulse bg-card">
                  <div className="h-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : discussions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No discussions yet</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to start a conversation!
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  Start a Thread
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="divide-y divide-border border rounded-lg overflow-hidden bg-card">
              {discussions.map((discussion) => (
                <Link 
                  key={discussion.id} 
                  to={getCardUrl(discussion)}
                  className="block hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-stretch">
                    {/* Upvote Section */}
                    <div className="flex flex-col items-center justify-center px-3 py-4 border-r border-border bg-muted/30">
                      <button
                        onClick={(e) => handleUpvote(discussion.id, e)}
                        className={cn(
                          "p-1 rounded hover:bg-muted transition-colors",
                          userVotes.has(discussion.id) && "text-primary"
                        )}
                      >
                        <ChevronUp className="w-5 h-5" />
                      </button>
                      <span className={cn(
                        "text-sm font-semibold",
                        userVotes.has(discussion.id) && "text-primary"
                      )}>
                        {discussion.upvotes}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex items-center gap-4 p-4">
                      {discussion.market_item?.image_url && (
                        <img 
                          src={discussion.market_item.image_url} 
                          alt={discussion.market_item.name}
                          className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {getTypeLabel(discussion.type)}
                          </Badge>
                          {discussion.market_item && (
                            <Badge variant="outline" className="text-xs">
                              {discussion.market_item.category}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {LANGUAGE_LABELS[discussion.language as LanguageFilter] || discussion.language}
                          </Badge>
                        </div>
                        <h3 className="font-semibold line-clamp-2 mb-1">
                          {discussion.title || discussion.market_item?.name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {discussion.comment_count}
                          </span>
                          <span className="flex items-center gap-1">
                            {getSentimentIcon(discussion.sentiment_score)}
                          </span>
                          <span>
                            {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      {discussion.market_item && (
                        <div className="text-right flex-shrink-0">
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
                      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
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