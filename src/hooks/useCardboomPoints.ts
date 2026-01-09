import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CardboomPoints {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface PointsHistory {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'earn' | 'spend' | 'refund';
  source: string;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export const useCardboomPoints = (userId?: string) => {
  const [points, setPoints] = useState<CardboomPoints | null>(null);
  const [history, setHistory] = useState<PointsHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPoints = useCallback(async () => {
    if (!userId) {
      setPoints(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cardboom_points')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setPoints(data as CardboomPoints | null);
    } catch (error) {
      console.error('Error fetching Cardboom Gems:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchHistory = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('cardboom_points_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory((data || []) as PointsHistory[]);
    } catch (error) {
      console.error('Error fetching points history:', error);
    }
  }, [userId]);

  useEffect(() => {
    fetchPoints();
    fetchHistory();
  }, [fetchPoints, fetchHistory]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    const channel = supabase
      .channel('cardboom_points_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cardboom_points',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (isMounted) {
            fetchPoints();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId, fetchPoints]);

  // Listen for custom balance update events (e.g., from bounty claims)
  useEffect(() => {
    const handleBalanceUpdate = () => {
      fetchPoints();
      fetchHistory();
    };

    window.addEventListener('gems-balance-updated', handleBalanceUpdate);
    return () => {
      window.removeEventListener('gems-balance-updated', handleBalanceUpdate);
    };
  }, [fetchPoints, fetchHistory]);

  return {
    points,
    balance: points?.balance ?? 0,
    totalEarned: points?.total_earned ?? 0,
    totalSpent: points?.total_spent ?? 0,
    history,
    loading,
    refetch: () => {
      fetchPoints();
      fetchHistory();
    },
  };
};
