import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageSquare, ArrowLeft, TrendingUp, TrendingDown, Minus, 
  Clock, ChevronUp, Send, ThumbsUp, AlertCircle, Reply
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { normalizeSlug } from "@/lib/seoSlug";
import { cn } from "@/lib/utils";
import { useDiscussionComments, usePostComment, useUserEligibility, useReactToComment, ReactionType } from "@/hooks/useDiscussions";

interface Discussion {
  id: string;
  type: string;
  title: string;
  description: string | null;
  market_item_id: string | null;
  price_at_creation: number | null;
  is_admin_created: boolean;
  is_active: boolean;
  comment_count: number;
  sentiment_score: number;
  upvotes: number;
  language: string;
  created_at: string;
  market_item?: {
    id: string;
    name: string;
    category: string;
    image_url: string | null;
    current_price: number;
  };
  creator_profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export default function Thread() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [upvoteCount, setUpvoteCount] = useState(0);
  
  const { data: comments = [], isLoading: loadingComments } = useDiscussionComments(discussion?.id);
  const { data: eligibility } = useUserEligibility();
  const postMutation = usePostComment();
  const reactMutation = useReactToComment();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    if (id) {
      fetchDiscussion();
    }
  }, [id]);

  const fetchDiscussion = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('discussions')
        .select(`
          *,
          market_item:market_items (
            id, name, category, image_url, current_price
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Fetch creator profile from the first comment
      if (data) {
        const { data: firstComment } = await supabase
          .from('discussion_comments')
          .select('user_id')
          .eq('discussion_id', id)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (firstComment) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .eq('id', firstComment.user_id)
            .single();
          
          (data as any).creator_profile = profile;
        }

        setUpvoteCount(data.upvotes || 0);
      }

      setDiscussion(data as Discussion);
    } catch (error: any) {
      console.error('Error fetching discussion:', error);
      toast.error('Discussion not found');
      navigate('/circle');
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = () => {
    // Upvote functionality - just update local state for now
    setUpvoteCount(prev => prev + 1);
    toast.success('Upvoted!');
  };

  const handlePost = () => {
    if (!discussion || !newComment.trim() || newComment.length < 10) {
      toast.error('Comment must be at least 10 characters');
      return;
    }
    
    postMutation.mutate({
      discussionId: discussion.id,
      content: newComment,
      parentId: replyingTo || undefined,
      priceAtPost: discussion.market_item?.current_price,
    }, {
      onSuccess: () => {
        setNewComment('');
        setReplyingTo(null);
      },
    });
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0.3) return <TrendingUp className="w-4 h-4 text-gain" />;
    if (score < -0.3) return <TrendingDown className="w-4 h-4 text-loss" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getCardUrl = () => {
    if (!discussion?.market_item) return null;
    const slug = `${normalizeSlug(discussion.market_item.name)}-${discussion.market_item.id.slice(0, 8)}`;
    return `/cards/${discussion.market_item.category.toLowerCase()}/${slug}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto text-center py-20">
            <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Discussion Not Found</h1>
            <p className="text-muted-foreground mb-6">This thread may have been removed or doesn't exist.</p>
            <Button asChild>
              <Link to="/circle">Back to The Circle</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} onRemoveItem={() => {}} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/circle" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to The Circle
            </Link>
          </Button>

          {/* Thread Card */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex gap-4">
                {/* Upvote Section */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={handleUpvote}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                  >
                    <ChevronUp className="w-6 h-6" />
                  </button>
                  <span className="font-semibold">
                    {upvoteCount}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant="secondary">{discussion.type}</Badge>
                    {discussion.market_item && (
                      <Badge variant="outline">{discussion.market_item.category}</Badge>
                    )}
                  </div>

                  <h1 className="text-2xl font-bold mb-3">
                    {discussion.title || discussion.market_item?.name}
                  </h1>

                  {discussion.description && (
                    <p className="text-muted-foreground mb-4 whitespace-pre-wrap">
                      {discussion.description}
                    </p>
                  )}

                  {/* Linked Card */}
                  {discussion.market_item && (
                    <Link 
                      to={getCardUrl() || '#'}
                      className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg mb-4 hover:bg-muted transition-colors"
                    >
                      {discussion.market_item.image_url && (
                        <img 
                          src={discussion.market_item.image_url}
                          alt={discussion.market_item.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold">{discussion.market_item.name}</h3>
                        <p className="text-sm text-muted-foreground">{discussion.market_item.category}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${discussion.market_item.current_price?.toLocaleString()}</div>
                        {discussion.price_at_creation && (
                          <div className="text-xs text-muted-foreground">
                            Price at thread: ${discussion.price_at_creation.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </Link>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {discussion.creator_profile && (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={discussion.creator_profile.avatar_url || undefined} />
                          <AvatarFallback>
                            {discussion.creator_profile.display_name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span>{discussion.creator_profile.display_name || 'Anonymous'}</span>
                      </div>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {discussion.comment_count} comments
                    </span>
                    <span className="flex items-center gap-1">
                      {getSentimentIcon(discussion.sentiment_score)}
                      Sentiment
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comment Form */}
          {eligibility?.eligible ? (
            <Card className="mb-6">
              <CardContent className="p-4">
                {replyingTo && (
                  <div className="flex items-center justify-between mb-2 p-2 bg-muted rounded">
                    <span className="text-sm text-muted-foreground">Replying to comment...</span>
                    <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
                      Cancel
                    </Button>
                  </div>
                )}
                <Textarea
                  placeholder="Share your thoughts..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="mb-3"
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {newComment.length}/1000 characters (min 10)
                  </span>
                  <Button 
                    onClick={handlePost}
                    disabled={postMutation.isPending || newComment.length < 10}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {postMutation.isPending ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : user ? (
            <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                <AlertCircle className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                You need at least 7 days account age or some activity to comment.
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-6">
              <CardContent className="p-4 text-center">
                <Button asChild>
                  <Link to="/auth">Sign in to comment</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Comments Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comments ({discussion.comment_count})
            </h2>

            {loadingComments ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
              </div>
            ) : comments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No comments yet</h3>
                  <p className="text-muted-foreground">Be the first to share your thoughts!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <ThreadComment 
                    key={comment.id} 
                    comment={comment}
                    discussionId={discussion.id}
                    currentPrice={discussion.market_item?.current_price}
                    onReply={() => setReplyingTo(comment.id)}
                    reactMutation={reactMutation}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Thread Comment Component
function ThreadComment({ 
  comment, 
  discussionId, 
  currentPrice,
  onReply,
  reactMutation,
  isReply = false 
}: { 
  comment: any; 
  discussionId: string;
  currentPrice?: number;
  onReply: () => void;
  reactMutation: any;
  isReply?: boolean;
}) {
  const [showReplies, setShowReplies] = useState(true);

  const handleReact = (type: ReactionType) => {
    reactMutation.mutate({
      commentId: comment.id,
      reactionType: type,
      discussionId,
    });
  };

  const priceChange = comment.price_at_post && currentPrice 
    ? ((currentPrice - comment.price_at_post) / comment.price_at_post) * 100
    : null;

  return (
    <Card className={cn(isReply && "ml-8 border-l-2 border-primary/20")}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={comment.profile?.avatar_url || undefined} />
            <AvatarFallback>
              {comment.profile?.display_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{comment.profile?.display_name || 'Anonymous'}</span>
              {comment.profile?.reputation_tier && (
                <Badge variant="outline" className="text-xs">
                  {comment.profile.reputation_tier}
                </Badge>
              )}
              {comment.stance && (
                <Badge 
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    comment.stance === 'buy' && "bg-gain/20 text-gain",
                    comment.stance === 'sell' && "bg-loss/20 text-loss",
                    comment.stance === 'hold' && "bg-amber-500/20 text-amber-500"
                  )}
                >
                  {comment.stance.toUpperCase()}
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Content */}
        <p className="text-sm whitespace-pre-wrap mb-3">{comment.content}</p>

        {/* Price Tracking */}
        {comment.price_at_post && currentPrice && priceChange !== null && (
          <div className="text-xs text-muted-foreground mb-3">
            Price at comment: ${comment.price_at_post.toLocaleString()} → 
            <span className={cn(
              "ml-1 font-medium",
              priceChange > 0 ? "text-gain" : priceChange < 0 ? "text-loss" : ""
            )}>
              {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => handleReact('insightful')}
            className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            {comment.insightful_count || 0}
          </button>
          {!isReply && (
            <button
              onClick={onReply}
              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <Reply className="w-3.5 h-3.5" />
              Reply
            </button>
          )}
        </div>

        {/* Replies */}
        {comment.replies?.length > 0 && (
          <div className="mt-4 space-y-3">
            {showReplies && comment.replies.map((reply: any) => (
              <ThreadComment
                key={reply.id}
                comment={reply}
                discussionId={discussionId}
                currentPrice={currentPrice}
                onReply={onReply}
                reactMutation={reactMutation}
                isReply
              />
            ))}
            {comment.replies.length > 0 && (
              <button 
                onClick={() => setShowReplies(!showReplies)}
                className="text-xs text-primary hover:underline"
              >
                {showReplies ? 'Hide replies' : `Show ${comment.replies.length} replies`}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
