import { Star, StarHalf } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useReviews } from '@/hooks/useReviews';

interface SellerRatingProps {
  sellerId: string;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const SellerRating = ({ sellerId, showCount = true, size = 'md' }: SellerRatingProps) => {
  const { sellerRating, loading } = useReviews(sellerId);

  if (loading) {
    return <div className="animate-pulse h-4 w-20 bg-muted rounded" />;
  }

  const { avg_rating, review_count } = sellerRating;

  const starSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(avg_rating);
    const hasHalfStar = avg_rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} className={`${starSize} fill-yellow-400 text-yellow-400`} />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <StarHalf key={i} className={`${starSize} fill-yellow-400 text-yellow-400`} />
        );
      } else {
        stars.push(
          <Star key={i} className={`${starSize} text-muted-foreground/30`} />
        );
      }
    }
    return stars;
  };

  const getBadge = () => {
    if (review_count >= 100) {
      return (
        <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
          Trusted Seller
        </Badge>
      );
    }
    if (review_count >= 50) {
      return (
        <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
          Top Rated
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">{renderStars()}</div>
      <span className={`${textSize} font-medium ml-1`}>
        {avg_rating > 0 ? avg_rating.toFixed(1) : 'New'}
      </span>
      {showCount && review_count > 0 && (
        <span className={`${textSize} text-muted-foreground`}>
          ({review_count})
        </span>
      )}
      {getBadge()}
    </div>
  );
};
