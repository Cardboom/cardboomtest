import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Star, Shield, MessageCircle, ThumbsUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProfileTrustReviewsProps {
  profileId: string;
  trustRating: number;
  reviewCount: number;
  currentUserId?: string;
}

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  transaction_type: string;
  created_at: string;
  reviewer?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function ProfileTrustReviews({ 
  profileId, 
  trustRating, 
  reviewCount, 
  currentUserId 
}: ProfileTrustReviewsProps) {
  const [showWriteDialog, setShowWriteDialog] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const queryClient = useQueryClient();

  // Fetch reviews for this profile
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['profile-reviews', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile_reviews')
        .select(`
          id,
          reviewer_id,
          rating,
          comment,
          transaction_type,
          created_at
        `)
        .eq('reviewed_user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch reviewer profiles from public view (excludes PII)
      const reviewerIds = data?.map(r => r.reviewer_id) || [];
      if (reviewerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('public_profiles')
          .select('id, display_name, avatar_url')
          .in('id', reviewerIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        return data?.map(r => ({
          ...r,
          reviewer: profileMap.get(r.reviewer_id)
        })) as Review[];
      }

      return data as Review[];
    },
  });

  // Check if user can leave a review (has completed transaction)
  const { data: canReview } = useQuery({
    queryKey: ['can-review', profileId, currentUserId],
    queryFn: async () => {
      if (!currentUserId || currentUserId === profileId) return false;

      // Check if there's a completed order between users
      const { data } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'completed')
        .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)
        .or(`buyer_id.eq.${profileId},seller_id.eq.${profileId}`)
        .limit(1);

      return (data?.length || 0) > 0;
    },
    enabled: !!currentUserId && currentUserId !== profileId,
  });

  // Submit review mutation
  const submitReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profile_reviews')
        .insert({
          reviewer_id: currentUserId!,
          reviewed_user_id: profileId,
          rating: newRating,
          comment: newComment || null,
          transaction_type: 'purchase',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Review submitted!');
      setShowWriteDialog(false);
      setNewRating(5);
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['profile-reviews', profileId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit review');
    },
  });

  const getTrustBadge = (rating: number) => {
    if (rating >= 4.5) return { label: 'Highly Trusted', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
    if (rating >= 4) return { label: 'Trusted', color: 'bg-primary/20 text-primary border-primary/30' };
    if (rating >= 3) return { label: 'Neutral', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
    if (rating >= 2) return { label: 'Caution', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
    return { label: 'Low Trust', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
  };

  const trustBadge = getTrustBadge(trustRating);

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Trust & Reviews
          </div>
          {currentUserId && currentUserId !== profileId && (
            <Dialog open={showWriteDialog} onOpenChange={setShowWriteDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Write Review
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Leave a Review</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {!canReview && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm">
                      <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                      <p className="text-muted-foreground">
                        You can leave a review after completing a transaction with this user.
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Rating</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setNewRating(star)}
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            className={cn(
                              "w-8 h-8 transition-colors",
                              (hoveredRating || newRating) >= star
                                ? "fill-gold text-gold"
                                : "text-muted-foreground"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Comment (Optional)</p>
                    <Textarea
                      placeholder="Share your experience with this user..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowWriteDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => submitReview.mutate()} 
                    disabled={submitReview.isPending || !canReview}
                  >
                    Submit Review
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trust Rating Summary */}
        <div className="flex items-center gap-4 p-4 bg-card/50 rounded-lg border">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "w-5 h-5",
                    trustRating >= star
                      ? "fill-gold text-gold"
                      : trustRating >= star - 0.5
                        ? "fill-gold/50 text-gold"
                        : "text-muted-foreground"
                  )}
                />
              ))}
            </div>
            <p className="text-2xl font-bold">{trustRating.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">{reviewCount} review{reviewCount !== 1 ? 's' : ''}</p>
          </div>
          <Badge variant="outline" className={cn("ml-auto", trustBadge.color)}>
            <Shield className="w-3 h-3 mr-1" />
            {trustBadge.label}
          </Badge>
        </div>

        {/* Reviews List */}
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading reviews...</div>
        ) : reviews && reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="p-3 bg-card/30 rounded-lg border border-border/50">
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={review.reviewer?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {(review.reviewer?.display_name || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {review.reviewer?.display_name || 'Anonymous'}
                      </span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "w-3 h-3",
                              review.rating >= star ? "fill-gold text-gold" : "text-muted-foreground"
                            )}
                          />
                        ))}
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {review.transaction_type}
                      </Badge>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No reviews yet</p>
            <p className="text-sm">Be the first to leave a review after a transaction!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}