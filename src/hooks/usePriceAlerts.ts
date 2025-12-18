import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PriceAlert {
  id: string;
  user_id: string;
  market_item_id: string;
  target_price: number;
  alert_type: 'above' | 'below';
  is_triggered: boolean;
  triggered_at: string | null;
  is_active: boolean;
  created_at: string;
  market_item?: {
    id: string;
    name: string;
    image_url: string | null;
    current_price: number;
  };
}

export const usePriceAlerts = () => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAlerts([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('price_alerts')
        .select(`
          *,
          market_item:market_items(id, name, image_url, current_price)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts((data || []) as PriceAlert[]);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const createAlert = async (
    marketItemId: string,
    targetPrice: number,
    alertType: 'above' | 'below'
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to create price alerts');
        return false;
      }

      const { error } = await supabase
        .from('price_alerts')
        .insert({
          user_id: user.id,
          market_item_id: marketItemId,
          target_price: targetPrice,
          alert_type: alertType,
        });

      if (error) throw error;

      toast.success('Price alert created!');
      fetchAlerts();
      return true;
    } catch (err) {
      console.error('Error creating alert:', err);
      toast.error('Failed to create alert');
      return false;
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('price_alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;

      toast.success('Alert deleted');
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Error deleting alert:', err);
      toast.error('Failed to delete alert');
    }
  };

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('price_alerts')
        .update({ is_active: isActive })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, is_active: isActive } : a
      ));
    } catch (err) {
      console.error('Error toggling alert:', err);
      toast.error('Failed to update alert');
    }
  };

  return {
    alerts,
    isLoading,
    createAlert,
    deleteAlert,
    toggleAlert,
    refetch: fetchAlerts,
  };
};
