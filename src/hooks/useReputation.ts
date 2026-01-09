import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReputationData {
  score: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  feeDiscount: number;
  withdrawalSpeed: 'standard' | 'fast' | 'instant';
  searchBoost: number;
}

const TIER_BENEFITS = {
  bronze: { feeDiscount: 0, withdrawalSpeed: 'standard' as const, searchBoost: 0 },
  silver: { feeDiscount: 0.05, withdrawalSpeed: 'standard' as const, searchBoost: 5 },
  gold: { feeDiscount: 0.10, withdrawalSpeed: 'fast' as const, searchBoost: 10 },
  platinum: { feeDiscount: 0.15, withdrawalSpeed: 'fast' as const, searchBoost: 20 },
  diamond: { feeDiscount: 0.20, withdrawalSpeed: 'instant' as const, searchBoost: 30 },
};

export function useReputation() {
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  const fetchReputation = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('reputation_score, reputation_tier')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const tier = (profile.reputation_tier || 'bronze') as keyof typeof TIER_BENEFITS;
        const benefits = TIER_BENEFITS[tier];
        
        setReputation({
          score: profile.reputation_score || 100,
          tier,
          ...benefits
        });
      }

      // Fetch recent events
      const { data: events } = await supabase
        .from('reputation_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentEvents(events || []);
    } catch (error) {
      console.error('Error fetching reputation:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getReputationFeeRate = useCallback((baseFee: number) => {
    if (!reputation) return baseFee;
    return baseFee * (1 - reputation.feeDiscount);
  }, [reputation]);

  useEffect(() => {
    fetchReputation();
  }, [fetchReputation]);

  return {
    reputation,
    isLoading,
    recentEvents,
    getReputationFeeRate,
    refetch: fetchReputation,
    tierBenefits: TIER_BENEFITS
  };
}
