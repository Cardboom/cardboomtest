import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SellerWatcher {
  id: string;
  user_id: string;
  seller_id: string;
  notify_on_new_listing: boolean;
  created_at: string;
}

export const useSellerWatchers = (sellerId?: string) => {
  const [isWatching, setIsWatching] = useState(false);
  const [watcherCount, setWatcherCount] = useState(0);
  const [watcher, setWatcher] = useState<SellerWatcher | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!sellerId) {
      setLoading(false);
      return;
    }

    try {
      // Get watcher count
      const { count, error: countError } = await supabase
        .from('seller_watchers')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId);

      if (!countError) {
        setWatcherCount(count || 0);
      }

      // Check if current user is watching
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('seller_watchers')
          .select('*')
          .eq('user_id', user.id)
          .eq('seller_id', sellerId)
          .maybeSingle();

        if (!error) {
          setWatcher(data);
          setIsWatching(!!data);
        }
      }
    } catch (err) {
      console.error('Error fetching seller watcher data:', err);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const watch = async () => {
    if (!sellerId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to follow sellers');
        return false;
      }

      // Prevent watching yourself
      if (user.id === sellerId) {
        toast.error("You can't follow yourself");
        return false;
      }

      const { data, error } = await supabase
        .from('seller_watchers')
        .upsert({
          user_id: user.id,
          seller_id: sellerId,
          notify_on_new_listing: true,
        }, { onConflict: 'user_id,seller_id' })
        .select()
        .single();

      if (error) throw error;

      setWatcher(data);
      setIsWatching(true);
      setWatcherCount(prev => prev + 1);
      toast.success('Following seller - you\'ll be notified of new listings');
      return true;
    } catch (err) {
      console.error('Error watching seller:', err);
      toast.error('Failed to follow seller');
      return false;
    }
  };

  const unwatch = async () => {
    if (!sellerId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('seller_watchers')
        .delete()
        .eq('user_id', user.id)
        .eq('seller_id', sellerId);

      if (error) throw error;

      setWatcher(null);
      setIsWatching(false);
      setWatcherCount(prev => Math.max(0, prev - 1));
      toast.success('Unfollowed seller');
      return true;
    } catch (err) {
      console.error('Error unwatching seller:', err);
      toast.error('Failed to unfollow');
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
