import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PriceHistoryPoint {
  date: string;
  price: number;
  recorded_at: string;
}

interface UsePriceHistoryOptions {
  productId: string;
  days?: number;
  enabled?: boolean;
}

export const usePriceHistory = ({ productId, days = 30, enabled = true }: UsePriceHistoryOptions) => {
  const [data, setData] = useState<PriceHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!enabled || !productId) return;

    setIsLoading(true);
    setError(null);

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: historyData, error: fetchError } = await supabase
        .from('price_history')
        .select('price, recorded_at, product_id')
        .eq('product_id', productId)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (historyData && historyData.length > 0) {
        const formattedData = historyData.map((point) => ({
          date: new Date(point.recorded_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
          price: Number(point.price),
          recorded_at: point.recorded_at,
        }));
        setData(formattedData);
      } else {
        // No data in database yet - return empty array
        setData([]);
      }
    } catch (err) {
      console.error('Error fetching price history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch price history');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [productId, days, enabled]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchHistory,
    hasData: data.length > 0,
  };
};
