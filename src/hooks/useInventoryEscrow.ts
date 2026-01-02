import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LockInventoryParams {
  cardInstanceId: string;
  orderId: string;
}

interface UnlockInventoryParams {
  cardInstanceId: string;
  orderId: string;
  reason: string;
}

interface DetermineLaneParams {
  sellerId: string;
  cardValue: number;
  cardInstanceId: string;
}

interface CompleteSaleParams {
  orderId: string;
  escrowId: string;
}

export function useInventoryEscrow() {
  const queryClient = useQueryClient();

  // Lock inventory for sale
  const lockInventory = useMutation({
    mutationFn: async ({ cardInstanceId, orderId }: LockInventoryParams) => {
      const { data, error } = await supabase.functions.invoke('inventory-escrow', {
        body: {
          action: 'lock',
          card_instance_id: cardInstanceId,
          order_id: orderId,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to lock inventory: ${error.message}`);
    }
  });

  // Unlock inventory on failure
  const unlockInventory = useMutation({
    mutationFn: async ({ cardInstanceId, orderId, reason }: UnlockInventoryParams) => {
      const { data, error } = await supabase.functions.invoke('inventory-escrow', {
        body: {
          action: 'unlock',
          card_instance_id: cardInstanceId,
          order_id: orderId,
          reason,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to unlock inventory: ${error.message}`);
    }
  });

  // Determine sale lane (instant vs escrow)
  const determineSaleLane = useMutation({
    mutationFn: async ({ sellerId, cardValue, cardInstanceId }: DetermineLaneParams) => {
      const { data, error } = await supabase.functions.invoke('inventory-escrow', {
        body: {
          action: 'determine_lane',
          seller_id: sellerId,
          card_value: cardValue,
          card_instance_id: cardInstanceId,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data as {
        success: boolean;
        lane: 'instant' | 'escrow_verification';
        reason: string;
        requires_verification: boolean;
        seller_trust_score: number;
        instant_eligible: boolean;
      };
    }
  });

  // Complete sale and transfer ownership
  const completeSale = useMutation({
    mutationFn: async ({ orderId, escrowId }: CompleteSaleParams) => {
      const { data, error } = await supabase.functions.invoke('inventory-escrow', {
        body: {
          action: 'complete_sale',
          order_id: orderId,
          escrow_id: escrowId,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      queryClient.invalidateQueries({ queryKey: ['escrow-transactions'] });
      toast.success('Sale completed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete sale: ${error.message}`);
    }
  });

  // Run integrity check
  const runIntegrityCheck = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('inventory-escrow', {
        body: { action: 'integrity_check' }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['integrity-issues'] });
      if (data.total_issues === 0) {
        toast.success('Integrity check passed - no issues found');
      } else {
        toast.warning(`Integrity check found ${data.total_issues} issues`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Integrity check failed: ${error.message}`);
    }
  });

  return {
    lockInventory,
    unlockInventory,
    determineSaleLane,
    completeSale,
    runIntegrityCheck,
  };
}

// Hook to get card instance by ID
export function useCardInstance(cardInstanceId: string | undefined) {
  return useQuery({
    queryKey: ['card-instance', cardInstanceId],
    queryFn: async () => {
      if (!cardInstanceId) return null;
      
      const { data, error } = await supabase
        .from('card_instances')
        .select('*')
        .eq('id', cardInstanceId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!cardInstanceId,
  });
}

// Hook to get user's card instances
export function useUserCardInstances(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-card-instances', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('card_instances')
        .select('*')
        .eq('owner_user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

// Hook to get escrow transaction for an order
export function useEscrowTransaction(orderId: string | undefined) {
  return useQuery({
    queryKey: ['escrow-transaction', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!orderId,
  });
}
