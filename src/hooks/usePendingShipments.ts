import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PendingShipment {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  price: number;
  delivery_option: string;
  status: string;
  created_at: string;
  shipped_at: string | null;
  tracking_number: string | null;
  listing?: {
    title: string;
    image_url: string | null;
  };
  buyer?: {
    display_name: string | null;
  };
  shipping_address?: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
  } | null;
}

export const usePendingShipments = () => {
  const [pendingShipments, setPendingShipments] = useState<PendingShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [currentShipment, setCurrentShipment] = useState<PendingShipment | null>(null);

  const fetchPendingShipments = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          listing_id,
          buyer_id,
          seller_id,
          price,
          delivery_option,
          status,
          created_at,
          shipped_at,
          tracking_number,
          listing:listings(title, image_url),
          buyer:profiles!orders_buyer_id_fkey(display_name)
        `)
        .eq('seller_id', session.user.id)
        .eq('status', 'paid')
        .is('shipped_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const shipments = (data || []).map((order: any) => ({
        ...order,
        listing: order.listing,
        buyer: order.buyer,
      }));
      
      setPendingShipments(shipments);
      
      // Auto-show prompt for the most recent unshipped order
      if (shipments.length > 0 && !currentShipment) {
        setCurrentShipment({
          ...shipments[0],
          listing: shipments[0].listing,
        });
        setShowPrompt(true);
      }
    } catch (error) {
      console.error('Error fetching pending shipments:', error);
    } finally {
      setLoading(false);
    }
  }, [currentShipment]);

  useEffect(() => {
    fetchPendingShipments();
  }, [fetchPendingShipments]);

  // Subscribe to new sales
  useEffect(() => {
    const subscribeToSales = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const channel = supabase
        .channel('seller-sales')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `seller_id=eq.${session.user.id}`,
          },
          (payload) => {
            // New sale detected - refresh and show prompt
            fetchPendingShipments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    subscribeToSales();
  }, [fetchPendingShipments]);

  const dismissPrompt = () => {
    setShowPrompt(false);
    setCurrentShipment(null);
  };

  const completeShipment = () => {
    setShowPrompt(false);
    setCurrentShipment(null);
    fetchPendingShipments();
  };

  return {
    pendingShipments,
    loading,
    showPrompt,
    currentShipment,
    setShowPrompt,
    setCurrentShipment,
    dismissPrompt,
    completeShipment,
    refetch: fetchPendingShipments,
  };
};
