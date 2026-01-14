import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TrackCartParams {
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  listingImage?: string | null;
  status?: 'abandoned' | 'checkout_started' | 'browse_only';
}

export const useCartAbandonment = () => {
  /**
   * Track when a user starts checkout or views a listing
   */
  const trackCartAbandonment = useCallback(async (params: TrackCartParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // For non-authenticated users, we rely on ExitIntentPopup to capture email
        return;
      }

      // Check if we already have an abandoned cart for this listing
      const { data: existing } = await supabase
        .from('abandoned_carts')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', params.listingId)
        .in('status', ['abandoned', 'checkout_started'])
        .maybeSingle();

      if (existing) {
        // Update existing record
        await supabase
          .from('abandoned_carts')
          .update({
            status: params.status || 'checkout_started',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Create new abandoned cart record
        await supabase
          .from('abandoned_carts')
          .insert({
            user_id: user.id,
            email: user.email,
            listing_id: params.listingId,
            listing_title: params.listingTitle,
            listing_price: params.listingPrice,
            listing_image: params.listingImage,
            status: params.status || 'checkout_started',
            cart_data: {
              source: 'checkout_dialog',
              timestamp: new Date().toISOString(),
            },
          });
      }
    } catch (error) {
      // Silent fail - don't interrupt user experience
      console.error('Cart abandonment tracking error:', error);
    }
  }, []);

  /**
   * Track when a user views a listing (for "similar cards" emails)
   */
  const trackListingView = useCallback(async (params: Omit<TrackCartParams, 'status'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Only create browse_only if no checkout was started
      const { data: existing } = await supabase
        .from('abandoned_carts')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('listing_id', params.listingId)
        .maybeSingle();

      if (existing) {
        // Don't downgrade checkout_started to browse_only
        return;
      }

      // Create browse_only record
      await supabase
        .from('abandoned_carts')
        .insert({
          user_id: user.id,
          email: user.email,
          listing_id: params.listingId,
          listing_title: params.listingTitle,
          listing_price: params.listingPrice,
          listing_image: params.listingImage,
          status: 'browse_only',
          cart_data: {
            source: 'listing_view',
            timestamp: new Date().toISOString(),
          },
        });
    } catch (error) {
      console.error('Listing view tracking error:', error);
    }
  }, []);

  /**
   * Mark cart as recovered when purchase is completed
   */
  const markCartRecovered = useCallback(async (listingId: string, orderId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      await supabase
        .from('abandoned_carts')
        .update({
          status: 'recovered',
          recovered_at: new Date().toISOString(),
          order_id: orderId,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .in('status', ['abandoned', 'checkout_started', 'browse_only']);
    } catch (error) {
      console.error('Cart recovery tracking error:', error);
    }
  }, []);

  return {
    trackCartAbandonment,
    trackListingView,
    markCartRecovered,
  };
};
