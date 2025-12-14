import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MarketItem {
  id: string;
  name: string;
  category: string;
  subcategory?: string | null;
  current_price: number;
  base_price: number;
  change_24h: number | null;
  change_7d: number | null;
  change_30d: number | null;
  image_url: string | null;
  is_trending: boolean | null;
  liquidity: 'high' | 'medium' | 'low' | null;
  sales_count_30d: number | null;
  views_24h: number | null;
  views_7d: number | null;
  watchlist_count: number | null;
  set_name: string | null;
  rarity: string | null;
  series: string | null;
  created_at: string;
  updated_at: string;
}

interface UseMarketItemsOptions {
  category?: string;
  limit?: number;
  trending?: boolean;
}

export const useMarketItems = (options: UseMarketItemsOptions = {}) => {
  const { category, limit = 100, trending } = options;
  const [items, setItems] = useState<MarketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('market_items')
        .select('*')
        .order('is_trending', { ascending: false })
        .order('current_price', { ascending: false })
        .limit(limit);

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (trending) {
        query = query.eq('is_trending', true);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      setItems(data || []);
    } catch (err) {
      console.error('Error fetching market items:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch items');
    } finally {
      setIsLoading(false);
    }
  }, [category, limit, trending]);

  useEffect(() => {
    fetchItems();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('market-items-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'market_items' },
        () => fetchItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems]);

  // Get all unique categories from the database
  const categories = useMemo(() => {
    const cats = [...new Set(items.map(item => item.category))];
    return ['all', ...cats.sort()];
  }, [items]);

  return {
    items,
    isLoading,
    error,
    categories,
    refetch: fetchItems,
  };
};
