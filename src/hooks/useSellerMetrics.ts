import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SellerMetrics {
  seller_id: string;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  disputed_orders: number;
  fulfillment_rate: number;
  avg_ship_time_hours: number | null;
  avg_response_time_hours: number | null;
  dispute_rate: number;
  total_reviews: number;
  avg_rating: number;
  last_calculated_at: string;
}

interface SellerMetricsAnalysis {
  metrics: SellerMetrics | null;
  healthStatus: 'excellent' | 'good' | 'warning' | 'critical' | 'new';
  warnings: string[];
  badges: string[];
}

export const useSellerMetrics = (sellerId?: string) => {
  const [analysis, setAnalysis] = useState<SellerMetricsAnalysis>({
    metrics: null,
    healthStatus: 'new',
    warnings: [],
    badges: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    if (!sellerId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('seller_metrics')
        .select('*')
        .eq('seller_id', sellerId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setAnalysis({ metrics: null, healthStatus: 'new', warnings: [], badges: [] });
      } else {
        const warnings: string[] = [];
        const badges: string[] = [];
        let healthStatus: SellerMetricsAnalysis['healthStatus'] = 'excellent';

        // Analyze fulfillment rate
        if (data.fulfillment_rate < 80) {
          warnings.push('Low fulfillment rate - complete more orders to improve');
          healthStatus = 'critical';
        } else if (data.fulfillment_rate < 90) {
          warnings.push('Fulfillment rate could be improved');
          healthStatus = 'warning';
        }

        // Analyze dispute rate
        if (data.dispute_rate > 0.05) {
          warnings.push('High dispute rate - address customer concerns promptly');
          healthStatus = healthStatus === 'excellent' ? 'warning' : healthStatus;
        } else if (data.dispute_rate > 0.02) {
          warnings.push('Dispute rate is above average');
        }

        // Analyze shipping time
        if (data.avg_ship_time_hours && data.avg_ship_time_hours > 72) {
          warnings.push('Slow shipping time - ship within 48 hours for better ratings');
        }

        // Assign badges
        if (data.fulfillment_rate >= 98 && data.total_orders >= 10) {
          badges.push('Top Seller');
        }
        if (data.avg_rating >= 4.8 && data.total_reviews >= 5) {
          badges.push('Highly Rated');
        }
        if (data.avg_ship_time_hours && data.avg_ship_time_hours <= 24 && data.completed_orders >= 5) {
          badges.push('Fast Shipper');
        }
        if (data.dispute_rate === 0 && data.total_orders >= 10) {
          badges.push('Dispute-Free');
        }
        if (data.total_orders >= 100) {
          badges.push('Veteran Seller');
        }

        // Determine overall health if no critical issues
        if (healthStatus !== 'critical' && healthStatus !== 'warning') {
          if (data.fulfillment_rate >= 95 && data.avg_rating >= 4.5) {
            healthStatus = 'excellent';
          } else if (data.fulfillment_rate >= 85 && data.avg_rating >= 4.0) {
            healthStatus = 'good';
          }
        }

        setAnalysis({ metrics: data, healthStatus, warnings, badges });
      }
    } catch (err) {
      console.error('Error fetching seller metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    ...analysis,
    loading,
    refetch: fetchMetrics,
  };
};

// Hook to recalculate seller metrics (call after order completion, review, etc.)
export const useRecalculateSellerMetrics = () => {
  const recalculate = async (sellerId: string) => {
    try {
      // Get all orders for seller
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, created_at, updated_at')
        .eq('seller_id', sellerId);

      if (ordersError) throw ordersError;

      const totalOrders = orders?.length || 0;
      if (totalOrders === 0) return;

      const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
      const cancelledOrders = orders?.filter(o => o.status === 'cancelled').length || 0;
      const disputedOrders = orders?.filter(o => (o.status as string) === 'disputed').length || 0;
      
      const fulfillmentRate = totalOrders > 0 
        ? (completedOrders / totalOrders) * 100 
        : 100;
      
      const disputeRate = totalOrders > 0 
        ? disputedOrders / totalOrders 
        : 0;

      // Calculate average completion time (using created_at to updated_at for completed orders)
      const completedOrdersList = orders?.filter(o => o.status === 'completed' && o.updated_at) || [];
      let avgShipTime = null;
      if (completedOrdersList.length > 0) {
        const totalHours = completedOrdersList.reduce((sum, o) => {
          const created = new Date(o.created_at).getTime();
          const updated = new Date(o.updated_at).getTime();
          return sum + (updated - created) / (1000 * 60 * 60);
        }, 0);
        avgShipTime = totalHours / completedOrdersList.length;
      }

      // Get reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_id', sellerId);

      if (reviewsError) throw reviewsError;

      const totalReviews = reviews?.length || 0;
      const avgRating = totalReviews > 0
        ? reviews!.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
        : 0;

      // Upsert metrics
      const { error: upsertError } = await supabase
        .from('seller_metrics')
        .upsert({
          seller_id: sellerId,
          total_orders: totalOrders,
          completed_orders: completedOrders,
          cancelled_orders: cancelledOrders,
          disputed_orders: disputedOrders,
          fulfillment_rate: Math.round(fulfillmentRate * 100) / 100,
          avg_ship_time_hours: avgShipTime ? Math.round(avgShipTime * 100) / 100 : null,
          dispute_rate: Math.round(disputeRate * 10000) / 10000,
          total_reviews: totalReviews,
          avg_rating: Math.round(avgRating * 100) / 100,
          last_calculated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'seller_id' });

      if (upsertError) throw upsertError;
      return true;
    } catch (err) {
      console.error('Error recalculating seller metrics:', err);
      return false;
    }
  };

  return { recalculate };
};
