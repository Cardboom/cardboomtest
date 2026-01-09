import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WatchlistItem {
  id: string;
  user_id: string;
  market_item_id: string;
  target_price: number | null;
  notify_on_price_drop: boolean;
  notify_on_new_listing: boolean;
  created_at: string;
  market_item?: {
    id: string;
    name: string;
    image_url: string | null;
    current_price: number;
    change_24h: number | null;
  };
}

export const useWatchlist = () => {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemIds, setItemIds] = useState<Set<string>>(new Set());

  const fetchWatchlist = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setItems([]);
        setItemIds(new Set());
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('watchlist')
        .select(`*, market_item:market_items(id, name, image_url, current_price, change_24h)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data || []) as WatchlistItem[]);
      setItemIds(new Set((data || []).map(d => d.market_item_id)));
    } catch (err) {
      console.error('Error fetching watchlist:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);

  const addToWatchlist = async (marketItemId: string): Promise<boolean> => {
    if (!marketItemId) {
      toast.error('Invalid item');
      return false;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Please sign in'); return false; }

      const { error } = await supabase.from('watchlist').insert({ user_id: user.id, market_item_id: marketItemId });
      if (error) { 
        console.error('Watchlist add error:', error);
        toast.error('Failed to add'); 
        return false; 
      }
      
      toast.success('Added to watchlist');
      fetchWatchlist();
      return true;
    } catch (err) {
      console.error('Watchlist add error:', err);
      toast.error('Failed to add');
      return false;
    }
  };

  const removeFromWatchlist = async (marketItemId: string): Promise<boolean> => {
    if (!marketItemId) return false;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.from('watchlist').delete().eq('user_id', user.id).eq('market_item_id', marketItemId);
      if (error) { 
        console.error('Watchlist remove error:', error);
        toast.error('Failed to remove'); 
        return false; 
      }
      
      toast.success('Removed from watchlist');
      setItems(prev => prev.filter(i => i.market_item_id !== marketItemId));
      setItemIds(prev => { 
        const newSet = new Set(prev);
        newSet.delete(marketItemId); 
        return newSet; 
      });
      return true;
    } catch (err) {
      console.error('Watchlist remove error:', err);
      toast.error('Failed to remove');
      return false;
    }
  };

  const isInWatchlist = (marketItemId: string) => itemIds.has(marketItemId);

  return { items, isLoading, addToWatchlist, removeFromWatchlist, isInWatchlist, refetch: fetchWatchlist };
};
