import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RecentlyViewedItem {
  id: string;
  name: string;
  image_url: string | null;
  category: string;
  current_price: number;
  viewedAt: string;
}

const STORAGE_KEY = 'cardboom_recently_viewed';
const MAX_ITEMS = 20;

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadRecentlyViewed = async () => {
      try {
        // First try localStorage for quick load
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && isMounted) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setItems(parsed);
            }
          } catch {
            // Invalid JSON, ignore
          }
        }

        // Then try to get from shadow_wishlists for logged-in users
        const { data: { user } } = await supabase.auth.getUser();
        if (user && isMounted) {
          // Fetch shadow wishlists first
          const { data: wishlists, error: wishlistError } = await supabase
            .from('shadow_wishlists')
            .select('market_item_id, last_viewed_at')
            .eq('user_id', user.id)
            .order('last_viewed_at', { ascending: false })
            .limit(MAX_ITEMS);

          if (wishlistError || !wishlists || wishlists.length === 0) {
            if (isMounted) setIsLoading(false);
            return;
          }

          // Get market item IDs
          const itemIds = wishlists.map(w => w.market_item_id).filter(Boolean);
          
          if (itemIds.length === 0) {
            if (isMounted) setIsLoading(false);
            return;
          }

          // Fetch market items separately
          const { data: marketItems, error: marketError } = await supabase
            .from('market_items')
            .select('id, name, image_url, category, current_price')
            .in('id', itemIds);

          if (marketError || !marketItems) {
            if (isMounted) setIsLoading(false);
            return;
          }

          // Create a map for quick lookup
          const itemMap = new Map(marketItems.map(item => [item.id, item]));

          // Combine data
          const dbItems: RecentlyViewedItem[] = wishlists
            .map(w => {
              const item = itemMap.get(w.market_item_id);
              if (!item) return null;
              return {
                id: item.id,
                name: item.name,
                image_url: item.image_url,
                category: item.category,
                current_price: item.current_price || 0,
                viewedAt: w.last_viewed_at,
              };
            })
            .filter((item): item is RecentlyViewedItem => item !== null);
          
          if (dbItems.length > 0 && isMounted) {
            setItems(dbItems);
            // Sync to localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dbItems));
          }
        }
      } catch (error) {
        console.error('Error loading recently viewed:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadRecentlyViewed();
    return () => { isMounted = false; };
  }, []);

  // Add item to recently viewed
  const addItem = useCallback(async (item: Omit<RecentlyViewedItem, 'viewedAt'>) => {
    const newItem: RecentlyViewedItem = {
      ...item,
      viewedAt: new Date().toISOString(),
    };

    setItems(prev => {
      // Remove duplicate if exists
      const filtered = prev.filter(i => i.id !== item.id);
      // Add to front and limit
      const updated = [newItem, ...filtered].slice(0, MAX_ITEMS);
      
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }
      
      return updated;
    });
  }, []);

  // Clear all recently viewed
  const clearAll = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing localStorage:', e);
    }
  }, []);

  return {
    items,
    isLoading,
    addItem,
    clearAll,
  };
}
