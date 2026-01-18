import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ListingWatcher {
  id: string;
  user_id: string;
  listing_id: string;
  notify_on_price_change: boolean;
  notify_on_expiry: boolean;
  notify_on_sold: boolean;
  created_at: string;
}

export const useListingWatchers = (listingId?: string) => {
  const [isWatching, setIsWatching] = useState(false);
  const [watcherCount, setWatcherCount] = useState(0);
  const [watcher, setWatcher] = useState<ListingWatcher | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!listingId) {
      setLoading(false);
      return;
    }

    try {
      // Get watcher count (public)
      const { count, error: countError } = await supabase
        .from('listing_watchers')
        .select('*', { count: 'exact', head: true })
        .eq('listing_id', listingId);

      if (!countError) {
        setWatcherCount(count || 0);
      }

      // Check if current user is watching
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('listing_watchers')
          .select('*')
          .eq('user_id', user.id)
          .eq('listing_id', listingId)
          .maybeSingle();

        if (!error && data) {
          setWatcher(data as ListingWatcher);
          setIsWatching(true);
        } else {
          setWatcher(null);
          setIsWatching(false);
        }
      }
    } catch (err) {
      console.error('Error fetching watcher data:', err);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const watch = async (options?: { 
    priceChange?: boolean; 
    expiry?: boolean; 
    sold?: boolean 
  }) => {
    if (!listingId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to watch listings');
        return false;
      }

      const { data, error } = await supabase
        .from('listing_watchers')
        .upsert({
          user_id: user.id,
          listing_id: listingId,
          notify_on_price_change: options?.priceChange ?? true,
          notify_on_expiry: options?.expiry ?? true,
          notify_on_sold: options?.sold ?? true,
        }, { onConflict: 'user_id,listing_id' })
        .select()
        .single();

      if (error) throw error;

      setWatcher(data as ListingWatcher);
      setIsWatching(true);
      setWatcherCount(prev => prev + 1);
      toast.success('Watching this listing');
      return true;
    } catch (err) {
      console.error('Error watching listing:', err);
      toast.error('Failed to watch listing');
      return false;
    }
  };

  const unwatch = async () => {
    if (!listingId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('listing_watchers')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listingId);

      if (error) throw error;

      setWatcher(null);
      setIsWatching(false);
      setWatcherCount(prev => Math.max(0, prev - 1));
      toast.success('Removed from watched listings');
      return true;
    } catch (err) {
      console.error('Error unwatching:', err);
      toast.error('Failed to unwatch');
      return false;
    }
  };

  const toggleWatch = async () => {
    if (isWatching) {
      return unwatch();
    } else {
      return watch();
    }
  };

  return {
    isWatching,
    watcherCount,
    watcher,
    loading,
    watch,
    unwatch,
    toggleWatch,
    refetch: fetchData,
  };
};

// Hook to get all watchers for notification purposes
export const useListingWatcherNotifications = () => {
  const getWatchersToNotify = async (
    listingId: string, 
    notificationType: 'price_change' | 'expiry' | 'sold',
    excludeUserId?: string
  ): Promise<string[]> => {
    try {
      const fieldMap = {
        price_change: 'notify_on_price_change',
        expiry: 'notify_on_expiry',
        sold: 'notify_on_sold',
      } as const;

      const field = fieldMap[notificationType];
      
      const { data, error } = await supabase
        .from('listing_watchers')
        .select('user_id')
        .eq('listing_id', listingId)
        .eq(field, true);

      if (error) throw error;
      
      const userIds = data?.map(w => w.user_id) || [];
      return excludeUserId ? userIds.filter(id => id !== excludeUserId) : userIds;
    } catch (err) {
      console.error('Error getting watchers:', err);
      return [];
    }
  };

  return { getWatchersToNotify };
};
