import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DigitalDelivery {
  id: string;
  product_name: string;
  delivered_at: string;
  delivery_method: string;
  code: string;
  game_name: string;
}

export const useDigitalDeliveries = (userId: string | null) => {
  return useQuery({
    queryKey: ['digital-deliveries', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase.functions.invoke('digital-fulfillment', {
        body: { action: 'get_deliveries', user_id: userId },
      });

      if (error) throw error;
      
      return (data?.deliveries || []).map((d: any) => ({
        id: d.id,
        product_name: d.product_name,
        delivered_at: d.delivered_at,
        delivery_method: d.delivery_method,
        code: d.digital_product_codes?.code || '••••••••',
        game_name: d.digital_product_codes?.game_name || 'Unknown',
      })) as DigitalDelivery[];
    },
    enabled: !!userId,
  });
};
