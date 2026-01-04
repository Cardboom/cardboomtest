import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SellerShippingPrompt } from '@/components/seller/SellerShippingPrompt';

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
    const checkForNewSales = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

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

      if (orders && orders.length > 0) {
        const order = orders[0] as any;
        setPendingOrder({
          id: order.id,
          title: order.listing?.title || 'Item',
          price: order.price,
          buyerName: order.buyer?.display_name,
          deliveryOption: order.delivery_option,
          shippingAddress: null,
        });
        setShowPrompt(true);
      }
    };

    // Check on mount
    checkForNewSales();

    // Subscribe to new sales
    const setupSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const channel = supabase
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

            if (order) {
              setPendingOrder({
                id: order.id,
                title: (order as any).listing?.title || 'Item',
                price: order.price,
                buyerName: (order as any).buyer?.display_name,
                deliveryOption: order.delivery_option,
                shippingAddress: null,
              });
              setShowPrompt(true);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
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
