import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Review {
  id: string;
  order_id: string;
  reviewer_id: string;
  reviewed_id: string;
  rating: number;
  comment: string | null;
  photos: string[] | null;
  review_type: string;
  created_at: string;
}

interface SellerRating {
  avg_rating: number;
  review_count: number;
}

export const useReviews = (sellerId?: string) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sellerRating, setSellerRating] = useState<SellerRating>({ avg_rating: 0, review_count: 0 });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReviews = async () => {
    if (!sellerId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewed_id', sellerId)
        .eq('review_type', 'buyer_to_seller')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);

      // Calculate rating
      if (data && data.length > 0) {
        const avgRating = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setSellerRating({
          avg_rating: Math.round(avgRating * 10) / 10,
          review_count: data.length,
        });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (
    orderId: string,
    reviewedId: string,
    rating: number,
    comment?: string,
    photos?: string[]
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Login Required',
          description: 'Please log in to submit a review',
          variant: 'destructive',
        });
        return false;
      }

      const { error } = await supabase
        .from('reviews')
        .insert({
          order_id: orderId,
          reviewer_id: user.id,
          reviewed_id: reviewedId,
          rating,
          comment,
          photos,
          review_type: 'buyer_to_seller',
        });

      if (error) throw error;

      toast({
        title: 'Review Submitted',
        description: 'Thank you for your feedback!',
      });

      fetchReviews();
      return true;
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit review',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [sellerId]);

  return {
    reviews,
    sellerRating,
    loading,
    submitReview,
    refetch: fetchReviews,
  };
};
