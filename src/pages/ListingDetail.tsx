import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ChevronLeft, Vault, Truck, ArrowLeftRight, MessageCircle, 
  ShoppingCart, TrendingUp, TrendingDown, Send, Trash2, User
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PurchaseDialog } from '@/components/purchase/PurchaseDialog';

interface Listing {
  id: string;
  title: string;
  description: string | null;
  category: string;
  condition: string;
  price: number;
  status: string;
  allows_vault: boolean;
  allows_trade: boolean;
  allows_shipping: boolean;
  created_at: string;
  seller_id: string;
  image_url: string | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: { display_name: string | null } | null;
}

interface VoteCounts {
  up: number;
  down: number;
  userVote: 'up' | 'down' | null;
}

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [votes, setVotes] = useState<VoteCounts>({ up: 0, down: 0, userVote: null });
  const [voting, setVoting] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    if (id) {
      fetchListing();
      fetchComments();
      fetchVotes();
    }
  }, [id, user]);

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setListing(data);
    } catch (error) {
      console.error('Error fetching listing:', error);
      toast.error('Failed to load listing');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('listing_comments')
        .select('*')
        .eq('listing_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchVotes = async () => {
    try {
      const { data: allVotes, error } = await supabase
        .from('price_votes')
        .select('*')
        .eq('listing_id', id);

      if (error) throw error;

      const upVotes = allVotes?.filter(v => v.vote_type === 'up').length || 0;
      const downVotes = allVotes?.filter(v => v.vote_type === 'down').length || 0;
      const userVote = user ? allVotes?.find(v => v.user_id === user.id)?.vote_type as 'up' | 'down' | null : null;

      setVotes({ up: upVotes, down: downVotes, userVote });
    } catch (error) {
      console.error('Error fetching votes:', error);
    }
  };

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!user) {
      toast.error('Please sign in to vote');
      navigate('/auth');
      return;
    }

    setVoting(true);
    try {
      if (votes.userVote === voteType) {
        // Remove vote
        const { error } = await supabase
          .from('price_votes')
          .delete()
          .eq('listing_id', id)
          .eq('user_id', user.id);

        if (error) throw error;
        toast.success('Vote removed');
      } else if (votes.userVote) {
        // Update vote
        const { error } = await supabase
          .from('price_votes')
          .update({ vote_type: voteType })
          .eq('listing_id', id)
          .eq('user_id', user.id);

        if (error) throw error;
        toast.success('Vote updated');
      } else {
        // New vote
        const { error } = await supabase
          .from('price_votes')
          .insert({
            listing_id: id,
            user_id: user.id,
            vote_type: voteType,
          });

        if (error) throw error;
        toast.success(`You predict the price will go ${voteType}!`);
      }

      fetchVotes();
    } catch (error: any) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    } finally {
      setVoting(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error('Please sign in to comment');
      navigate('/auth');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('listing_comments')
        .insert({
          listing_id: id,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) throw error;
      toast.success('Comment added');
      setNewComment('');
      fetchComments();
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('listing_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      toast.success('Comment deleted');
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      nba: 'NBA',
      football: 'Football',
      tcg: 'TCG',
      figures: 'Figures',
    };
    return labels[cat] || cat.toUpperCase();
  };

  const totalVotes = votes.up + votes.down;
  const upPercent = totalVotes > 0 ? Math.round((votes.up / totalVotes) * 100) : 50;
  const downPercent = totalVotes > 0 ? Math.round((votes.down / totalVotes) * 100) : 50;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        <main className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Listing not found</h1>
          <Button onClick={() => navigate('/explorer')}>Back to Explorer</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={0} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4 gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Image */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-4 aspect-square">
              {listing.image_url ? (
                <img 
                  src={listing.image_url} 
                  alt={listing.title}
                  className="w-full h-full object-contain rounded-xl"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary rounded-xl">
                  <ShoppingCart className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{getCategoryLabel(listing.category)}</Badge>
                <Badge variant="outline">{listing.condition}</Badge>
                <Badge className={listing.status === 'active' ? 'bg-gain text-gain-foreground' : 'bg-secondary'}>
                  {listing.status}
                </Badge>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                {listing.title}
              </h1>
              {listing.description && (
                <p className="text-muted-foreground">{listing.description}</p>
              )}
            </div>

            {/* Price */}
            <div className="glass rounded-xl p-6">
              <p className="text-muted-foreground text-sm mb-1">Price</p>
              <p className="font-display text-4xl font-bold text-foreground">
                {formatPrice(listing.price)}
              </p>
            </div>

            {/* Delivery Options */}
            <div className="flex flex-wrap gap-2">
              {listing.allows_vault && (
                <Badge variant="outline" className="gap-1">
                  <Vault className="h-3 w-3" /> Vault Storage
                </Badge>
              )}
              {listing.allows_trade && (
                <Badge variant="outline" className="gap-1">
                  <ArrowLeftRight className="h-3 w-3" /> Trade Online
                </Badge>
              )}
              {listing.allows_shipping && (
                <Badge variant="outline" className="gap-1">
                  <Truck className="h-3 w-3" /> Shipping
                </Badge>
              )}
            </div>

            {/* Actions */}
            {user?.id !== listing.seller_id && listing.status === 'active' && (
              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="gap-2" onClick={() => setPurchaseDialogOpen(true)}>
                  <ShoppingCart className="w-4 h-4" />
                  Buy Now
                </Button>
                <Button variant="outline" size="lg" className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Message Seller
                </Button>
              </div>
            )}

            {/* Purchase Dialog */}
            <PurchaseDialog
              open={purchaseDialogOpen}
              onOpenChange={setPurchaseDialogOpen}
              listing={listing}
            />

            {user?.id === listing.seller_id && (
              <Badge className="bg-primary/20 text-primary">This is your listing</Badge>
            )}
          </div>
        </div>

        {/* Price Prediction Voting */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Price Prediction - Will it go up or down?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant={votes.userVote === 'up' ? 'default' : 'outline'}
                onClick={() => handleVote('up')}
                disabled={voting}
                className={cn(
                  "flex-1 h-16 gap-2 text-lg",
                  votes.userVote === 'up' && "bg-gain hover:bg-gain/90"
                )}
              >
                <TrendingUp className="w-6 h-6" />
                Going Up
              </Button>
              <Button
                variant={votes.userVote === 'down' ? 'default' : 'outline'}
                onClick={() => handleVote('down')}
                disabled={voting}
                className={cn(
                  "flex-1 h-16 gap-2 text-lg",
                  votes.userVote === 'down' && "bg-loss hover:bg-loss/90"
                )}
              >
                <TrendingDown className="w-6 h-6" />
                Going Down
              </Button>
            </div>
            
            {/* Vote Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gain font-medium">{votes.up} votes ({upPercent}%)</span>
                <span className="text-loss font-medium">{votes.down} votes ({downPercent}%)</span>
              </div>
              <div className="h-4 bg-secondary rounded-full overflow-hidden flex">
                <div 
                  className="bg-gain transition-all duration-500"
                  style={{ width: `${upPercent}%` }}
                />
                <div 
                  className="bg-loss transition-all duration-500"
                  style={{ width: `${downPercent}%` }}
                />
              </div>
              <p className="text-center text-muted-foreground text-sm">
                {totalVotes} total predictions
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Comments ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Comment */}
            <div className="flex gap-2">
              <Textarea
                placeholder={user ? "Add a comment..." : "Sign in to comment"}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={!user}
                className="flex-1"
                rows={2}
              />
              <Button 
                onClick={handleSubmitComment}
                disabled={!user || submittingComment || !newComment.trim()}
                size="icon"
                className="h-auto"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="glass rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {comment.user_id === user?.id ? 'You' : 'Anonymous User'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {comment.user_id === user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-loss"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-foreground">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default ListingDetail;
