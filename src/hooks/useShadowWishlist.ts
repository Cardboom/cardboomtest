import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useShadowWishlist() {
  const viewStartTime = useRef<number>(0);
  const currentItemId = useRef<string | null>(null);

  const trackView = useCallback(async (marketItemId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      currentItemId.current = marketItemId;
      viewStartTime.current = Date.now();
    } catch (error) {
      console.error('Error starting view tracking:', error);
    }
  }, []);

  const endViewTracking = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentItemId.current) return;

      const durationSeconds = Math.floor((Date.now() - viewStartTime.current) / 1000);
      
      // Only track if viewed for more than 10 seconds
      if (durationSeconds >= 10) {
        const { data: existing } = await supabase
          .from('shadow_wishlists')
          .select('id, view_count, view_duration_seconds')
          .eq('user_id', user.id)
          .eq('market_item_id', currentItemId.current)
          .single();

        if (existing) {
          await supabase
            .from('shadow_wishlists')
            .update({
              view_count: existing.view_count + 1,
              view_duration_seconds: existing.view_duration_seconds + durationSeconds,
              last_viewed_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('shadow_wishlists')
            .insert({
              user_id: user.id,
              market_item_id: currentItemId.current,
              view_duration_seconds: durationSeconds,
              view_count: 1
            });
        }
      }

      currentItemId.current = null;
      viewStartTime.current = 0;
    } catch (error) {
      console.error('Error ending view tracking:', error);
    }
  }, []);

  const trackSearch = useCallback(async (marketItemId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase
        .from('shadow_wishlists')
        .select('id, search_count')
        .eq('user_id', user.id)
        .eq('market_item_id', marketItemId)
        .single();

      if (existing) {
        await supabase
          .from('shadow_wishlists')
          .update({
            search_count: existing.search_count + 1,
            last_viewed_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('shadow_wishlists')
          .insert({
            user_id: user.id,
            market_item_id: marketItemId,
            search_count: 1,
            view_count: 0
          });
      }
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentItemId.current) {
        endViewTracking();
      }
    };
  }, [endViewTracking]);

  return {
    trackView,
    endViewTracking,
    trackSearch
  };
}
