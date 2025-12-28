import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PriceHistoryPoint {
  date: string;
  price: number;
  recorded_at: string;
}

interface UsePriceHistoryOptions {
  productId: string;
  itemName?: string;
  category?: string;
  days?: number;
  enabled?: boolean;
  marketItemId?: string;
}

export const usePriceHistory = ({ 
  productId, 
  itemName,
  category,
  days = 30, 
  enabled = true,
  marketItemId
}: UsePriceHistoryOptions) => {
  const [data, setData] = useState<PriceHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!enabled || (!productId && !marketItemId)) return;

    setIsLoading(true);
    setError(null);

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let historyData: any[] = [];

      // Strategy 1: Direct match by market_item_id (most accurate)
      if (marketItemId || productId) {
        const itemId = marketItemId || productId;
        const { data: directMatch } = await supabase
          .from('price_history')
          .select('price, recorded_at, product_id, market_item_id')
          .eq('market_item_id', itemId)
          .gte('recorded_at', startDate.toISOString())
          .order('recorded_at', { ascending: true });

        if (directMatch && directMatch.length > 0) {
          historyData = directMatch;
        }
      }

      // Strategy 2: Exact match on productId string
      if (historyData.length === 0 && productId) {
        const { data: exactMatch } = await supabase
          .from('price_history')
          .select('price, recorded_at, product_id, market_item_id')
          .eq('product_id', productId)
          .gte('recorded_at', startDate.toISOString())
          .order('recorded_at', { ascending: true });

        if (exactMatch && exactMatch.length > 0) {
          historyData = exactMatch;
        }
      }

      // Strategy 3: Try partial match on product_id
      if (historyData.length === 0 && productId) {
        const { data: partialMatch } = await supabase
          .from('price_history')
          .select('price, recorded_at, product_id, market_item_id')
          .ilike('product_id', `%${productId}%`)
          .gte('recorded_at', startDate.toISOString())
          .order('recorded_at', { ascending: true })
          .limit(200);

        if (partialMatch && partialMatch.length > 0) {
          historyData = partialMatch;
        }
      }

      // Strategy 4: Search by item name keywords
      if (historyData.length === 0 && itemName) {
        const keywords = itemName.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 3)
          .slice(0, 2);
        
        for (const keyword of keywords) {
          const { data: keywordMatch } = await supabase
            .from('price_history')
            .select('price, recorded_at, product_id, market_item_id')
            .ilike('product_id', `%${keyword}%`)
            .gte('recorded_at', startDate.toISOString())
            .order('recorded_at', { ascending: true })
            .limit(200);

          if (keywordMatch && keywordMatch.length > 0) {
            historyData = keywordMatch;
            break;
          }
        }
      }

      if (historyData.length > 0) {
        // Group by date and calculate median price for anti-manipulation
        const groupedByDate = historyData.reduce((acc: Record<string, { prices: number[]; recorded_at: string }>, point) => {
          const dateKey = new Date(point.recorded_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          });
          if (!acc[dateKey]) {
            acc[dateKey] = { prices: [], recorded_at: point.recorded_at };
          }
          acc[dateKey].prices.push(Number(point.price));
          return acc;
        }, {});

        const formattedData = Object.entries(groupedByDate)
          .map(([date, value]: [string, { prices: number[]; recorded_at: string }]) => {
            // Use median for more robust pricing (anti-manipulation)
            const sorted = value.prices.sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            const median = sorted.length % 2 !== 0 
              ? sorted[mid] 
              : (sorted[mid - 1] + sorted[mid]) / 2;
            
            return {
              date,
              price: median,
              recorded_at: value.recorded_at,
            };
          })
          .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
        
        setData(formattedData);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error('Error fetching price history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch price history');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [productId, itemName, category, days, enabled, marketItemId]);

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
