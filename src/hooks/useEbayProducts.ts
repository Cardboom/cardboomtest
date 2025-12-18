import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MarketItem {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  current_price: number;
  base_price: number;
  change_24h: number | null;
  change_7d: number | null;
  change_30d: number | null;
  image_url: string | null;
  is_trending: boolean | null;
  liquidity: string | null;
  sales_count_30d: number | null;
  external_id: string | null;
  data_source: string | null;
  created_at: string;
}

interface UseEbayProductsResult {
  products: MarketItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  populateProducts: () => Promise<void>;
}

export function useEbayProducts(category?: string, limit: number = 50): UseEbayProductsResult {
  const [products, setProducts] = useState<MarketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('market_items')
        .select('*')
        .not('image_url', 'is', null)
        .neq('image_url', '')
        .order('is_trending', { ascending: false })
        .order('current_price', { ascending: false })
        .limit(limit);

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching market items:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  }, [category, limit]);

  const populateProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('[useEbayProducts] Triggering eBay product population...');

      const { data, error: fnError } = await supabase.functions.invoke('populate-ebay-products', {
        body: { limit: 10 }
      });

      if (fnError) {
        console.error('[useEbayProducts] Population error:', fnError);
        throw fnError;
      }

      console.log('[useEbayProducts] Population result:', data);

      // Refetch products after population
      await fetchProducts();
    } catch (err) {
      console.error('Error populating products:', err);
      setError(err instanceof Error ? err.message : 'Failed to populate products');
    } finally {
      setIsLoading(false);
    }
  }, [fetchProducts]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('market-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_items',
        },
        () => {
          // Refetch on any change
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProducts]);

  return {
    products,
    isLoading,
    error,
    refetch: fetchProducts,
    populateProducts,
  };
}