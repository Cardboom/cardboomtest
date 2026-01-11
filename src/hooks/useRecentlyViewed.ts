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
          const parsed = JSON.parse(stored);
          setItems(parsed);
        }

        // Then try to get from shadow_wishlists for logged-in users
        const { data: { user } } = await supabase.auth.getUser();
        if (user && isMounted) {
          const { data } = await supabase
            .from('shadow_wishlists')
            .select(`
              market_item_id,
              last_viewed_at,
              market_items:market_item_id (
                id,
                name,
                image_url,
                category,
                current_price
              )
            `)
            .eq('user_id', user.id)
            .order('last_viewed_at', { ascending: false })
            .limit(MAX_ITEMS);

          if (data && isMounted) {
            const dbItems: RecentlyViewedItem[] = data
              .filter((d: any) => d.market_items)
              .map((d: any) => ({
                id: d.market_items.id,
                name: d.market_items.name,
                image_url: d.market_items.image_url,
                category: d.market_items.category,
                current_price: d.market_items.current_price,
                viewedAt: d.last_viewed_at,
              }));
            
            if (dbItems.length > 0) {
              setItems(dbItems);
              // Sync to localStorage
              localStorage.setItem(STORAGE_KEY, JSON.stringify(dbItems));
            }
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
