import { useState, useEffect } from 'react';
import { Star, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OrderReviewSectionProps {
  orderId: string;
  currentUserId: string;
  isBuyer: boolean;
  counterpartyId: string;
  counterpartyName: string;
}

export const OrderReviewSection = ({ 
  orderId, 
  currentUserId, 
  isBuyer, 
  counterpartyId, 
  counterpartyName 
}: OrderReviewSectionProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [existingReview, setExistingReview] = useState<{ rating: number; comment: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const reviewType = isBuyer ? 'buyer_to_seller' : 'seller_to_buyer';

  useEffect(() => {
    const checkExistingReview = async () => {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('id, rating, comment')
          .eq('order_id', orderId)
          .eq('reviewer_id', currentUserId)
          .eq('review_type', reviewType)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setHasReviewed(true);
          setExistingReview({ rating: data.rating, comment: data.comment });
        }
      } catch (error) {
        console.error('Error checking existing review:', error);
      } finally {
        setLoading(false);
      }
    };

    checkExistingReview();
  }, [orderId, currentUserId, reviewType]);

  const handleSubmit = async () => {
    if (rating === 0) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          order_id: orderId,
          reviewer_id: currentUserId,
          reviewed_id: counterpartyId,
          rating,
          comment: comment || null,
          review_type: reviewType,
        });

      if (error) throw error;

      toast({
        title: 'Review Submitted',
        description: 'Thank you for your feedback!',
      });

      setHasReviewed(true);
      setExistingReview({ rating, comment });
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit review',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (hasReviewed && existingReview) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            Review Submitted
          </CardTitle>
          <CardDescription>
            You rated {counterpartyName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= existingReview.rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          {existingReview.comment && (
            <p className="text-sm text-muted-foreground italic">"{existingReview.comment}"</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400" />
          Rate {counterpartyName}
        </CardTitle>
        <CardDescription>
          {isBuyer 
            ? 'How was your experience with this seller?' 
            : 'How was your experience with this buyer?'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div className="flex items-center justify-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="p-1 transition-transform hover:scale-110"
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
            >
              <Star
                className={`h-8 w-8 ${
                  star <= displayRating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground/30'
                }`}
              />
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {displayRating === 0 && 'Click to rate'}
          {displayRating === 1 && 'Poor'}
          {displayRating === 2 && 'Fair'}
          {displayRating === 3 && 'Good'}
          {displayRating === 4 && 'Very Good'}
          {displayRating === 5 && 'Excellent'}
        </p>

        {/* Comment */}
        <Textarea
          placeholder="Share your experience (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />

        {/* Submit */}
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Review'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
