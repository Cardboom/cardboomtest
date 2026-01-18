import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Json } from '@/integrations/supabase/types';

interface OrderStatusEntry {
  id: string;
  order_id: string;
  status: string;
  previous_status: string | null;
  changed_by: string | null;
  change_reason: string | null;
  metadata: Json;
  created_at: string;
}

interface OrderTimelineData {
  entries: OrderStatusEntry[];
  currentStatus: string | null;
  isComplete: boolean;
}

// Define the canonical order flow
const ORDER_FLOW = [
  'pending',
  'confirmed',
  'payment_confirmed',
  'processing',
  'shipped',
  'in_transit',
  'delivered',
  'completed'
] as const;

const VAULT_FLOW = [
  'pending',
  'confirmed',
  'payment_confirmed',
  'vaulted',
  'completed'
] as const;

const GRADING_FLOW = [
  'pending',
  'confirmed',
  'payment_confirmed',
  'grading_submitted',
  'grading_in_progress',
  'graded',
  'vaulted',
  'completed'
] as const;

export const useOrderTimeline = (orderId?: string) => {
  const [timeline, setTimeline] = useState<OrderTimelineData>({
    entries: [],
    currentStatus: null,
    isComplete: false,
  });
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const fetchTimeline = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const entries = (data || []) as OrderStatusEntry[];
      const currentStatus = entries.length > 0 
        ? entries[entries.length - 1].status 
        : null;
      
      const isComplete = currentStatus === 'completed' || currentStatus === 'refunded';

      setTimeline({ entries, currentStatus, isComplete });
    } catch (err) {
      console.error('Error fetching order timeline:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-timeline-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_status_history',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const newEntry = payload.new as OrderStatusEntry;
          setTimeline(prev => ({
            entries: [...prev.entries, newEntry],
            currentStatus: newEntry.status,
            isComplete: newEntry.status === 'completed' || newEntry.status === 'refunded',
          }));
          queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, queryClient]);

  // Add a new status entry
  const addStatusEntry = async (
    newStatus: string,
    reason?: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!orderId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status: newStatus,
          previous_status: timeline.currentStatus,
          changed_by: user?.id || null,
          change_reason: reason || null,
          metadata: (metadata || {}) as Json,
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error adding status entry:', err);
      return false;
    }
  };

  // Get the appropriate flow based on order type
  const getOrderFlow = (isVault?: boolean, isGrading?: boolean): readonly string[] => {
    if (isGrading) return GRADING_FLOW;
    if (isVault) return VAULT_FLOW;
    return ORDER_FLOW;
  };

  // Calculate progress percentage
  const getProgress = (isVault?: boolean, isGrading?: boolean) => {
    if (!timeline.currentStatus) return 0;
    
    const flow = getOrderFlow(isVault, isGrading);
    const currentIndex = flow.indexOf(timeline.currentStatus);
    
    if (currentIndex === -1) return 0;
    return ((currentIndex + 1) / flow.length) * 100;
  };

  return {
    timeline,
    loading,
    addStatusEntry,
    getOrderFlow,
    getProgress,
    refetch: fetchTimeline,
    ORDER_FLOW,
    VAULT_FLOW,
    GRADING_FLOW,
  };
};
