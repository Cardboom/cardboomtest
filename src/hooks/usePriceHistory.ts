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

// Generate alternative product_id formats to search
const generateProductIdVariants = (productId: string, itemName?: string, category?: string): string[] => {
  const variants: string[] = [productId];
  
  // Common prefix mappings
  const prefixMappings: Record<string, string[]> = {
    'mtg': ['tcg', 'mtg'],
    'tcg': ['tcg', 'mtg'],
    'pokemon': ['tcg', 'pokemon'],
    'yugioh': ['yugioh', 'tcg'],
    'sports': ['nba', 'football', 'baseball'],
    'figures': ['figure', 'figures'],
  };

  // Try to extract and swap prefixes
  const parts = productId.split('-');
  if (parts.length > 1) {
    const prefix = parts[0].toLowerCase();
    const rest = parts.slice(1).join('-');
    
    // Add variants with different prefixes
    Object.entries(prefixMappings).forEach(([key, values]) => {
      if (prefix === key || values.includes(prefix)) {
        values.forEach(v => {
          if (v !== prefix) {
            variants.push(`${v}-${rest}`);
          }
        });
      }
    });
  }

  // If we have item name, create variants from that
  if (itemName && category) {
    const cleanName = itemName.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
    
    const catPrefix = category.toLowerCase().split('-')[0];
    variants.push(`${catPrefix}-${cleanName}`);
  }

  return [...new Set(variants)];
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

      // Generate all possible product_id variants
      const variants = generateProductIdVariants(productId, itemName, category);

      // Try each variant until we find data
      let historyData: any[] = [];
      
      for (const variant of variants) {
        const { data: result, error: fetchError } = await supabase
          .from('price_history')
          .select('price, recorded_at, product_id')
          .eq('product_id', variant)
          .gte('recorded_at', startDate.toISOString())
          .order('recorded_at', { ascending: true });

        if (!fetchError && result && result.length > 0) {
          historyData = result;
          break;
        }
      }

      // If still no data, try fuzzy match using ILIKE
      if (historyData.length === 0 && itemName) {
        const searchTerm = itemName.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(' ')[0]; // First word
        
        const { data: fuzzyResult } = await supabase
          .from('price_history')
          .select('price, recorded_at, product_id')
          .ilike('product_id', `%${searchTerm}%`)
          .gte('recorded_at', startDate.toISOString())
          .order('recorded_at', { ascending: true })
          .limit(100);

        if (fuzzyResult && fuzzyResult.length > 0) {
          historyData = fuzzyResult;
        }
      }

      if (historyData.length > 0) {
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
