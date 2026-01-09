import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export interface AutoMatch {
  id: string;
  match_type: 'buy_order_to_listing' | 'listing_to_buy_order';
  buy_order_id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  match_score: number;
  price_match_percent: number | null;
  status: 'pending' | 'notified' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
  updated_at: string;
  // Joined data
  buy_order?: {
    id: string;
    item_name: string;
    max_price: number;
    category: string;
    condition: string | null;
    grade: string | null;
    filled_quantity?: number;
    buyer?: {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
    };
  };
  listing?: {
    id: string;
    title: string;
    price: number;
    image_url: string | null;
    condition: string | null;
    seller?: {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
    };
  };
}

export const useAutoMatches = (role: 'buyer' | 'seller' | 'all' = 'all') => {
  const [matches, setMatches] = useState<AutoMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMatches([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('auto_match_queue')
        .select(`
          *,
          buy_order:buy_orders!auto_match_queue_buy_order_id_fkey (
            id,
            item_name,
            max_price,
            category,
            condition,
            grade,
            filled_quantity,
            buyer:profiles!buy_orders_buyer_id_fkey (
              id,
              display_name,
              avatar_url
            )
          ),
          listing:listings!auto_match_queue_listing_id_fkey (
            id,
            title,
            price,
            image_url,
            condition,
            seller:profiles!listings_seller_id_fkey (
              id,
              display_name,
              avatar_url
            )
          )
        `)
        .order('match_score', { ascending: false })
        .order('created_at', { ascending: false });

      // Filter by role
      if (role === 'buyer') {
        query = query.eq('buyer_id', user.id);
      } else if (role === 'seller') {
        query = query.eq('seller_id', user.id);
      }

      const { data, error: fetchError } = await query.limit(50);

      if (fetchError) throw fetchError;

      setMatches((data || []) as unknown as AutoMatch[]);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError('Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [role]);

  // Accept a match (seller accepts buyer's order)
  const acceptMatch = useCallback(async (matchId: string) => {
    try {
      const match = matches.find(m => m.id === matchId);
      if (!match) throw new Error('Match not found');

      // Update match status
      const { error: updateError } = await supabase
        .from('auto_match_queue')
        .update({ 
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', matchId);

      if (updateError) throw updateError;

      // Create buy order fill
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: fillError } = await supabase
        .from('buy_order_fills')
        .insert({
          buy_order_id: match.buy_order_id,
          seller_id: user.id,
          listing_id: match.listing_id,
          fill_price: match.listing?.price || 0,
          quantity: 1,
        });

      if (fillError) throw fillError;

      // Update buy order status
      const currentFilledQty = match.buy_order?.filled_quantity || 0;
      const { error: orderError } = await supabase
        .from('buy_orders')
        .update({
          filled_quantity: currentFilledQty + 1,
          status: 'filled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', match.buy_order_id);

      if (orderError) throw orderError;

      // Update listing status
      const { error: listingError } = await supabase
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', match.listing_id);

      if (listingError) throw listingError;

      // Refresh matches
      await fetchMatches();
      queryClient.invalidateQueries({ queryKey: ['buy-orders'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });

      return true;
    } catch (err) {
      console.error('Error accepting match:', err);
      throw err;
    }
  }, [matches, fetchMatches, queryClient]);

  // Reject a match
  const rejectMatch = useCallback(async (matchId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('auto_match_queue')
        .update({ 
          status: 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq('id', matchId);

      if (updateError) throw updateError;

      await fetchMatches();
      return true;
    } catch (err) {
      console.error('Error rejecting match:', err);
      throw err;
    }
  }, [fetchMatches]);

  // Subscribe to realtime updates
  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const initChannel = async () => {
      if (!isMounted) return;
      await fetchMatches();

      channel = supabase
        .channel('auto_match_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'auto_match_queue',
          },
          () => {
            if (isMounted) {
              fetchMatches();
            }
          }
        )
        .subscribe();
    };

    initChannel();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchMatches]);

  const pendingMatches = matches.filter(m => m.status === 'pending');
  const acceptedMatches = matches.filter(m => m.status === 'accepted');

  return {
    matches,
    pendingMatches,
    acceptedMatches,
    loading,
    error,
    refetch: fetchMatches,
    acceptMatch,
    rejectMatch,
  };
};
