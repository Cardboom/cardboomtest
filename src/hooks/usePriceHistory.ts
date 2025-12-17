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
}

// Generate search patterns from item name
const generateSearchPatterns = (itemName?: string): string[] => {
  if (!itemName) return [];
  
  const patterns: string[] = [];
  const cleanName = itemName.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim();
  
  // Add words from the name
  const words = cleanName.split(/\s+/).filter(w => w.length > 2);
  words.forEach(word => patterns.push(word));
  
  // Add first two words combined
  if (words.length >= 2) {
    patterns.push(`${words[0]}-${words[1]}`);
    patterns.push(`${words[0]}%${words[1]}`);
  }
  
  return [...new Set(patterns)];
};

export const usePriceHistory = ({ 
  productId, 
  itemName,
  category,
  days = 30, 
  enabled = true 
}: UsePriceHistoryOptions) => {
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

      let historyData: any[] = [];

      // Strategy 1: Exact match on productId
      const { data: exactMatch } = await supabase
        .from('price_history')
        .select('price, recorded_at, product_id')
        .eq('product_id', productId)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (exactMatch && exactMatch.length > 0) {
        historyData = exactMatch;
      }

      // Strategy 2: Try partial match - productId contains our search term
      if (historyData.length === 0) {
        const { data: partialMatch } = await supabase
          .from('price_history')
          .select('price, recorded_at, product_id')
          .ilike('product_id', `%${productId}%`)
          .gte('recorded_at', startDate.toISOString())
          .order('recorded_at', { ascending: true })
          .limit(200);

        if (partialMatch && partialMatch.length > 0) {
          historyData = partialMatch;
        }
      }

      // Strategy 3: Our productId contains the price_history product_id
      if (historyData.length === 0 && productId.includes('-')) {
        const baseName = productId.split('-').slice(0, 2).join('-');
        const { data: baseMatch } = await supabase
          .from('price_history')
          .select('price, recorded_at, product_id')
          .ilike('product_id', `${baseName}%`)
          .gte('recorded_at', startDate.toISOString())
          .order('recorded_at', { ascending: true })
          .limit(200);

        if (baseMatch && baseMatch.length > 0) {
          historyData = baseMatch;
        }
      }

      // Strategy 4: Search by item name patterns
      if (historyData.length === 0 && itemName) {
        const patterns = generateSearchPatterns(itemName);
        
        for (const pattern of patterns) {
          const { data: nameMatch } = await supabase
            .from('price_history')
            .select('price, recorded_at, product_id')
            .ilike('product_id', `%${pattern}%`)
            .gte('recorded_at', startDate.toISOString())
            .order('recorded_at', { ascending: true })
            .limit(200);

          if (nameMatch && nameMatch.length > 0) {
            historyData = nameMatch;
            break;
          }
        }
      }

      // Strategy 5: Category-based fallback
      if (historyData.length === 0 && category) {
        const categoryPrefix = category.split('-')[0].toLowerCase();
        const { data: categoryMatch } = await supabase
          .from('price_history')
          .select('price, recorded_at, product_id')
          .ilike('product_id', `${categoryPrefix}%`)
          .gte('recorded_at', startDate.toISOString())
          .order('recorded_at', { ascending: true })
          .limit(50);

        if (categoryMatch && categoryMatch.length > 0) {
          // Take the most recent entries for this category
          historyData = categoryMatch;
        }
      }

      if (historyData.length > 0) {
        // Group by date and average if multiple entries per day
        const groupedByDate = historyData.reduce((acc: Record<string, { total: number; count: number; recorded_at: string }>, point) => {
          const dateKey = new Date(point.recorded_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          });
          if (!acc[dateKey]) {
            acc[dateKey] = { total: 0, count: 0, recorded_at: point.recorded_at };
          }
          acc[dateKey].total += Number(point.price);
          acc[dateKey].count += 1;
          return acc;
        }, {});

        const formattedData = Object.entries(groupedByDate)
          .map(([date, value]: [string, { total: number; count: number; recorded_at: string }]) => ({
            date,
            price: value.total / value.count,
            recorded_at: value.recorded_at,
          }))
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
  }, [productId, itemName, category, days, enabled]);

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
