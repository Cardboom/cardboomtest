import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  // UI state for animations
  priceUpdated?: boolean;
  justListed?: boolean;
  justSold?: boolean;
}

interface UseMarketItemsOptions {
  category?: string;
  limit?: number;
  trending?: boolean;
  refreshInterval?: number; // Cache TTL in ms (default 30s)
  requireImage?: boolean; // Only fetch items with images
}

interface MarketItemsState {
  items: MarketItem[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  updateCount: number;
}

export const useMarketItems = (options: UseMarketItemsOptions = {}) => {
  const { category, limit = 100, trending, refreshInterval = 30000, requireImage = false } = options;
  
  const [state, setState] = useState<MarketItemsState>({
    items: [],
    isLoading: true,
    error: null,
    lastUpdated: null,
    updateCount: 0,
  });
  
  const previousPrices = useRef<Map<string, number>>(new Map());
  const justListedIds = useRef<Set<string>>(new Set());

  // Efficient item update without full refetch for single item changes
  const updateSingleItem = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    setState(prev => {
      let updatedItems = [...prev.items];
      
      if (eventType === 'INSERT') {
        // New listing - add to top with animation flag
        const newItem: MarketItem = {
          ...newRecord,
          justListed: true,
          priceUpdated: false,
        };
        justListedIds.current.add(newRecord.id);
        updatedItems = [newItem, ...updatedItems.slice(0, limit - 1)];
        
        // Clear justListed flag after animation
        setTimeout(() => {
          justListedIds.current.delete(newRecord.id);
          setState(s => ({
            ...s,
            items: s.items.map(item => 
              item.id === newRecord.id ? { ...item, justListed: false } : item
            ),
          }));
        }, 3000);
        
      } else if (eventType === 'UPDATE') {
        // Price change or other update
        const prevPrice = previousPrices.current.get(newRecord.id);
        const priceChanged = prevPrice !== undefined && prevPrice !== newRecord.current_price;
        
        updatedItems = updatedItems.map(item => {
          if (item.id === newRecord.id) {
            return {
              ...newRecord,
              priceUpdated: priceChanged,
              justListed: justListedIds.current.has(newRecord.id),
            };
          }
          return item;
        });
        
        // Update price tracking
        previousPrices.current.set(newRecord.id, newRecord.current_price);
        
        // Clear priceUpdated flag after animation
        if (priceChanged) {
          setTimeout(() => {
            setState(s => ({
              ...s,
              items: s.items.map(item => 
                item.id === newRecord.id ? { ...item, priceUpdated: false } : item
              ),
            }));
          }, 500);
        }
        
      } else if (eventType === 'DELETE') {
        // Item sold or delisted - remove immediately
        updatedItems = updatedItems.filter(item => item.id !== oldRecord.id);
        previousPrices.current.delete(oldRecord.id);
      }
      
      return {
        ...prev,
        items: updatedItems,
        lastUpdated: new Date(),
        updateCount: prev.updateCount + 1,
      };
    });
  }, [limit]);

  // Full fetch for initial load and cache refresh
  const fetchItems = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setState(prev => ({ ...prev, isLoading: true }));
      }

      let query = supabase
        .from('market_items')
        .select('*')
        .gt('current_price', 0) // Only items with real prices
        .order('is_trending', { ascending: false })
        .order('current_price', { ascending: false })
        .limit(limit);

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (trending) {
        query = query.eq('is_trending', true);
      }

      // Only fetch items with images if required (default true for homepage)
      if (requireImage) {
        query = query.not('image_url', 'is', null).neq('image_url', '');
      }
      
      // Only show items with verified data sources (not mock)
      query = query.not('data_source', 'is', null);

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Update price tracking
      const newPriceMap = new Map<string, number>();
      (data || []).forEach(item => {
        const prevPrice = previousPrices.current.get(item.id);
        newPriceMap.set(item.id, item.current_price);
        
        // Mark items with price changes
        if (prevPrice !== undefined && prevPrice !== item.current_price) {
          (item as MarketItem).priceUpdated = true;
        }
      });
      previousPrices.current = newPriceMap;

      setState(prev => ({
        ...prev,
        items: data || [],
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      }));

      // Clear price update flags after animation
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          items: prev.items.map(item => ({ ...item, priceUpdated: false })),
        }));
      }, 500);

    } catch (err) {
      console.error('Error fetching market items:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch items',
      }));
    }
  }, [category, limit, trending, requireImage]);

  // Initial fetch - run only once on mount or when category/trending changes
  const initialFetchDone = useRef(false);
  useEffect(() => {
    initialFetchDone.current = false;
    fetchItems();
    initialFetchDone.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, trending, limit, requireImage]);

  // Real-time subscription - separate from fetch to prevent re-subscription loops
  useEffect(() => {
    const channel = supabase
      .channel(`market-items-${category || 'all'}-${trending ? 'trending' : 'all'}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'market_items' },
        (payload) => updateSingleItem({ ...payload, eventType: 'INSERT' })
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'market_items' },
        (payload) => updateSingleItem({ ...payload, eventType: 'UPDATE' })
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'market_items' },
        (payload) => updateSingleItem({ ...payload, eventType: 'DELETE' })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [category, trending, updateSingleItem]);

  // Cache refresh interval (max 30 seconds TTL)
  useEffect(() => {
    if (refreshInterval <= 0) return;
    
    const interval = setInterval(() => {
      fetchItems(true); // Silent refresh
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [fetchItems, refreshInterval]);

  // Get all unique categories from the database
  const categories = useMemo(() => {
    const cats = [...new Set(state.items.map(item => item.category))];
    return ['all', ...cats.sort()];
  }, [state.items]);

  // Compute time since last update
  const getTimeSinceUpdate = useCallback(() => {
    if (!state.lastUpdated) return null;
    const seconds = Math.floor((Date.now() - state.lastUpdated.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  }, [state.lastUpdated]);

  return {
    items: state.items,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    updateCount: state.updateCount,
    categories,
    refetch: () => fetchItems(false),
    getTimeSinceUpdate,
  };
};

// Hook for listings (user-created listings) with seller info
export const useListings = (options: { sellerId?: string; status?: 'active' | 'sold' | 'cancelled' | 'reserved' } = {}) => {
  const { sellerId, status = 'active' } = options;
  const [listings, setListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isInitialLoad = useRef(true);

  const fetchListings = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      
      let query = supabase
        .from('listings')
        .select(`
          *,
          profiles:seller_id (
            display_name,
            country_code
          )
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (sellerId) {
        query = query.eq('seller_id', sellerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Transform to include seller info at top level
      const listingsWithSeller = (data || []).map((listing: any) => ({
        ...listing,
        seller_username: listing.profiles?.display_name || 'Seller',
        seller_country_code: listing.profiles?.country_code || 'TR',
      }));
      
      setListings(listingsWithSeller);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching listings:', err);
    } finally {
      setIsLoading(false);
      isInitialLoad.current = false;
    }
  }, [sellerId, status]);

  // Initial fetch - only on mount or when sellerId/status changes
  useEffect(() => {
    isInitialLoad.current = true;
    fetchListings(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId, status]);

  // Real-time subscription - separate effect to prevent re-subscription loops
  useEffect(() => {
    const channel = supabase
      .channel(`listings-realtime-${sellerId || 'all'}-${status}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings' },
        () => {
          // Silent refresh - don't show loading state for realtime updates
          fetchListings(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sellerId, status, fetchListings]);

  return { listings, isLoading, lastUpdated, refetch: () => fetchListings(false) };
};
