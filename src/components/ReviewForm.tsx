import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useReviews } from '@/hooks/useReviews';

interface ReviewFormProps {
  orderId: string;
  sellerId: string;
  sellerName?: string;
  onComplete?: () => void;
}

export const ReviewForm = ({ orderId, sellerId, sellerName, onComplete }: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { submitReview } = useReviews(sellerId);

  const handleSubmit = async () => {
    if (rating === 0) return;

    setSubmitting(true);
    const success = await submitReview(orderId, sellerId, rating, comment || undefined);
    setSubmitting(false);

    if (success && onComplete) {
      onComplete();
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate Your Experience</CardTitle>
        <CardDescription>
          {sellerName ? `How was your transaction with ${sellerName}?` : 'How was your transaction?'}
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
