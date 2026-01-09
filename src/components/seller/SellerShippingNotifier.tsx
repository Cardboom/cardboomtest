import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SellerShippingPrompt } from '@/components/seller/SellerShippingPrompt';

// Helper to extract first item from Supabase relation (may return array or single object)
const getRelation = <T,>(relation: T | T[] | null | undefined): T | null => {
  if (!relation) return null;
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation;
};

interface OrderWithRelations {
  id: string;
  price: number;
  delivery_option: string;
  created_at?: string;
  listing?: { title: string; image_url?: string } | { title: string; image_url?: string }[] | null;
  buyer?: { display_name: string } | { display_name: string }[] | null;
}

interface OrderForShipping {
  id: string;
  title: string;
  price: number;
  buyerName?: string;
  deliveryOption: string;
  shippingAddress?: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
  } | null;
}

export const SellerShippingNotifier = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<OrderForShipping | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    const checkForNewSales = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !isMounted) return;

      // Check for recent unshipped sales (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          id,
          price,
          delivery_option,
          created_at,
          listing:listings(title, image_url),
          buyer:profiles!orders_buyer_id_fkey(display_name)
        `)
        .eq('seller_id', session.user.id)
        .eq('status', 'paid')
        .is('shipped_at', null)
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1);

      if (orders && orders.length > 0 && isMounted) {
        const order = orders[0] as OrderWithRelations;
        const listing = getRelation(order.listing);
        const buyer = getRelation(order.buyer);
        setPendingOrder({
          id: order.id,
          title: listing?.title || 'Item',
          price: order.price,
          buyerName: buyer?.display_name,
          deliveryOption: order.delivery_option,
          shippingAddress: null,
        });
        setShowPrompt(true);
      }
    };

    // Subscribe to new sales - proper cleanup pattern
    const setupSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !isMounted) return;

      channel = supabase
        .channel('seller-new-sales')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `seller_id=eq.${session.user.id}`,
          },
          async (payload) => {
            if (!isMounted) return;
            
            // Fetch full order details
            const { data: order } = await supabase
              .from('orders')
              .select(`
                id,
                price,
                delivery_option,
                listing:listings(title, image_url),
                buyer:profiles!orders_buyer_id_fkey(display_name)
              `)
              .eq('id', payload.new.id)
              .single();

            if (order && isMounted) {
              const typedOrder = order as OrderWithRelations;
              const listing = getRelation(typedOrder.listing);
              const buyer = getRelation(typedOrder.buyer);
              setPendingOrder({
                id: typedOrder.id,
                title: listing?.title || 'Item',
                price: typedOrder.price,
                buyerName: buyer?.display_name,
                deliveryOption: typedOrder.delivery_option,
                shippingAddress: null,
              });
              setShowPrompt(true);
            }
          }
        )
        .subscribe();
    };

    // Check on mount
    checkForNewSales();
    setupSubscription();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return (
    <SellerShippingPrompt
      open={showPrompt}
      onOpenChange={setShowPrompt}
      order={pendingOrder}
      onComplete={() => {
        setShowPrompt(false);
        setPendingOrder(null);
      }}
    />
  );
};
