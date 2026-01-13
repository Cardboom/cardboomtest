import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PassSeason {
  id: string;
  season_number: number;
  name: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

export interface PassTier {
  id: string;
  tier_number: number;
  xp_required: number;
  free_reward_type: string | null;
  free_reward_value: any;
  pro_reward_type: string | null;
  pro_reward_value: any;
}

export interface PassProgress {
  id: string;
  user_id: string;
  season_id: string;
  current_xp: number;
  current_tier: number;
  is_pro: boolean;
  pro_purchased_at: string | null;
  claimed_tiers: number[];
}

export const useCardboomPass = (userId?: string) => {
  const [season, setSeason] = useState<PassSeason | null>(null);
  const [tiers, setTiers] = useState<PassTier[]>([]);
  const [progress, setProgress] = useState<PassProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async (isMountedCheck?: () => boolean) => {
    setLoading(true);
    try {
      // Fetch active season
      const { data: seasonData } = await supabase
        .from('cardboom_pass_seasons')
        .select('*')
        .eq('is_active', true)
        .single();

      // Check if still mounted before updating state
      if (isMountedCheck && !isMountedCheck()) return;

      if (seasonData) {
        setSeason(seasonData);

        // Fetch all tiers
        const { data: tiersData } = await supabase
          .from('cardboom_pass_tiers')
          .select('*')
          .order('tier_number', { ascending: true });

        if (isMountedCheck && !isMountedCheck()) return;
        setTiers(tiersData || []);

        // Fetch user progress if logged in
        if (userId) {
          const { data: progressData } = await supabase
            .from('cardboom_pass_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('season_id', seasonData.id)
            .single();

          if (isMountedCheck && !isMountedCheck()) return;
          if (progressData) {
            setProgress(progressData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching pass data:', error);
    } finally {
      if (!isMountedCheck || isMountedCheck()) {
        setLoading(false);
      }
    }
  };

  const purchaseProPass = async () => {
    if (!userId) {
      toast({
        title: "Login required",
        description: "Please log in to purchase the Pro Pass",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('purchase_pro_pass', {
        p_user_id: userId
      });

      if (error) throw error;

      if (data) {
        toast({
          title: "Pro Pass Activated! 🎉",
          description: "You now earn gems at 1.25× rate and unlock exclusive rewards!"
        });
        await fetchData();
        return true;
      } else {
        toast({
          title: "Insufficient Balance",
          description: "You need $10 in your wallet to purchase Pro Pass",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Error purchasing pro pass:', error);
      toast({
        title: "Error",
        description: "Failed to purchase Pro Pass. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const claimTierReward = async (tierNumber: number, isProReward: boolean = false): Promise<{ success: boolean; reward?: any; error?: string }> => {
    if (!userId) {
      return { success: false, error: 'Login required' };
    }

    try {
      const { data, error } = await supabase.rpc('claim_tier_reward', {
        p_user_id: userId,
        p_tier_number: tierNumber,
        p_is_pro_reward: isProReward
      });

      if (error) throw error;

      const result = data as { success: boolean; reward?: any; error?: string } | null;

      if (result?.success) {
        toast({
          title: "Reward Claimed! 🎉",
          description: `You received: ${formatRewardDescription(result.reward)}`
        });
        await fetchData();
        return { success: true, reward: result.reward };
      } else {
        return { success: false, error: result?.error || 'Failed to claim reward' };
      }
    } catch (error) {
      console.error('Error claiming tier reward:', error);
      return { success: false, error: 'Failed to claim reward' };
    }
  };

  const isRewardClaimed = (tierNumber: number, isProReward: boolean): boolean => {
    if (!progress?.claimed_tiers) return false;
    const claimKey = tierNumber * 10 + (isProReward ? 2 : 1);
    return progress.claimed_tiers.includes(claimKey);
  };

  const formatRewardDescription = (reward: any): string => {
    if (!reward) return 'Unknown reward';
    switch (reward.type) {
      case 'gems': return `${reward.amount} Gems`;
      case 'badge': return `Badge: ${reward.name}`;
      case 'cosmetic': return `${reward.cosmetic_type?.replace('_', ' ')} Unlocked`;
      case 'discount_cap': return `${reward.percent}% Checkout Discount`;
      case 'priority': return `${reward.days} Days Priority Support`;
      default: return 'Reward';
    }
  };

  const getNextTier = () => {
    if (!progress || tiers.length === 0) return tiers[0] || null;
    return tiers.find(t => t.tier_number === progress.current_tier + 1) || null;
  };

  const getCumulativeXpForTier = (tierNum: number) => {
    // Sum up all XP required for tiers 1 through tierNum
    // Guard against empty tiers array
    if (!tiers || tiers.length === 0) return 0;
    return tiers
      .filter(t => t.tier_number <= tierNum)
      .reduce((sum, t) => sum + t.xp_required, 0);
  };

  const getProgressToNextTier = () => {
    if (!progress || tiers.length === 0) return { current: 0, required: 125, percent: 0, totalXp: 0, cumulativeForNext: 125 };
    
    const currentTier = progress.current_tier;
    const nextTierData = tiers.find(t => t.tier_number === currentTier + 1);
    
    // Max tier reached
    if (!nextTierData) {
      return { 
        current: progress.current_xp, 
        required: progress.current_xp, 
        percent: 100, 
        totalXp: progress.current_xp,
        cumulativeForNext: getCumulativeXpForTier(30)
      };
    }
    
    // Cumulative XP needed to complete current tier
    const cumulativeForCurrent = getCumulativeXpForTier(currentTier);
    // Cumulative XP needed to complete next tier
    const cumulativeForNext = getCumulativeXpForTier(currentTier + 1);
    // XP needed just for the next tier
    const xpNeededForNextTier = nextTierData.xp_required;
    // How much XP user has towards next tier (after completing current tier)
    const progressInCurrentTier = progress.current_xp - cumulativeForCurrent;
    
    return {
      current: Math.max(0, progressInCurrentTier),
      required: xpNeededForNextTier,
      percent: Math.min(100, Math.max(0, (progressInCurrentTier / xpNeededForNextTier) * 100)),
      totalXp: progress.current_xp,
      cumulativeForNext
    };
  };

  const getTotalXpRequired = () => {
    return tiers.reduce((sum, t) => sum + t.xp_required, 0);
  };

  const getSeasonTimeRemaining = () => {
    if (!season) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const now = new Date();
    const end = new Date(season.ends_at);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds };
  };

  useEffect(() => {
    let isMounted = true;
    fetchData(() => isMounted);
    return () => { isMounted = false; };
  }, [userId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!userId || !season) return;

    const channel = supabase
      .channel('pass_progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cardboom_pass_progress',
          filter: `user_id=eq.${userId}`
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, season?.id]);

  return {
    season,
    tiers,
    progress,
    loading,
    purchaseProPass,
    claimTierReward,
    isRewardClaimed,
    getNextTier,
    getProgressToNextTier,
    getSeasonTimeRemaining,
    getTotalXpRequired,
    refetch: fetchData
  };
};
