import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingConfirmation {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  price: number;
  status: string;
  buyer_confirmed_at: string | null;
  seller_confirmed_at: string | null;
  confirmation_deadline: string | null;
  delivered_at: string | null;
}

export function useOrderConfirmation(orderId: string | undefined) {
  const queryClient = useQueryClient();

  const orderQuery = useQuery({
    queryKey: ['order-confirmation', orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          buyer_id,
          seller_id,
          price,
          status,
          buyer_confirmed_at,
          seller_confirmed_at,
          confirmation_deadline,
          escrow_status
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  return {
    order: orderQuery.data,
    isLoading: orderQuery.isLoading,
    refetch: orderQuery.refetch,
  };
}

export function usePendingConfirmations(userId: string | undefined) {
  return useQuery({
    queryKey: ['pending-confirmations', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Get orders where user is buyer or seller and confirmation is pending
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          buyer_id,
          seller_id,
          price,
          status,
          buyer_confirmed_at,
          seller_confirmed_at,
          confirmation_deadline,
          escrow_status,
          listing:listings(title, image_url)
        `)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .in('status', ['shipped', 'delivered'])
        .or('buyer_confirmed_at.is.null,seller_confirmed_at.is.null')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useAdminEscalations() {
  return useQuery({
    queryKey: ['admin-escalations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_escalations')
        .select(`
          *,
          order:orders(
            id,
            price,
            status,
            buyer_id,
            seller_id,
            buyer_confirmed_at,
            seller_confirmed_at,
            listing:listings(title, image_url)
          )
        `)
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useAutoEscalateOverdueOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Find overdue orders (7 days past delivery with missing confirmations)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: overdueOrders, error: fetchError } = await supabase
        .from('orders')
        .select('id, buyer_id, seller_id, buyer_confirmed_at, seller_confirmed_at')
        .in('status', ['shipped', 'delivered'])
        .lt('updated_at', sevenDaysAgo.toISOString())
        .or('buyer_confirmed_at.is.null,seller_confirmed_at.is.null');

      if (fetchError) throw fetchError;

      if (!overdueOrders || overdueOrders.length === 0) {
        return { escalated: 0 };
      }

      // Create escalations for each overdue order
      const escalations = overdueOrders.map(order => ({
        order_id: order.id,
        escalation_type: !order.buyer_confirmed_at ? 'buyer_no_confirm' : 'seller_no_confirm',
        escalated_by: 'system',
        reason: `Automatic escalation: No confirmation received within 7 days of delivery`,
      }));

      const { error: insertError } = await supabase
        .from('order_escalations')
        .insert(escalations);

      if (insertError) throw insertError;

      // Update orders with escalation timestamp
      for (const order of overdueOrders) {
        await supabase
          .from('orders')
          .update({ admin_escalated_at: new Date().toISOString() })
          .eq('id', order.id);
      }

      return { escalated: overdueOrders.length };
    },
    onSuccess: (data) => {
      if (data.escalated > 0) {
        toast.info(`${data.escalated} order(s) automatically escalated to admin`);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-escalations'] });
    },
  });
}
