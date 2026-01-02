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

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch active season
      const { data: seasonData } = await supabase
        .from('cardboom_pass_seasons')
        .select('*')
        .eq('is_active', true)
        .single();

      if (seasonData) {
        setSeason(seasonData);

        // Fetch all tiers
        const { data: tiersData } = await supabase
          .from('cardboom_pass_tiers')
          .select('*')
          .order('tier_number', { ascending: true });

        setTiers(tiersData || []);

        // Fetch user progress if logged in
        if (userId) {
          const { data: progressData } = await supabase
            .from('cardboom_pass_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('season_id', seasonData.id)
            .single();

          if (progressData) {
            setProgress(progressData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching pass data:', error);
    } finally {
      setLoading(false);
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

  const getNextTier = () => {
    if (!progress || tiers.length === 0) return tiers[0] || null;
    return tiers.find(t => t.tier_number === progress.current_tier + 1) || null;
  };

  const getProgressToNextTier = () => {
    if (!progress) return { current: 0, required: 100, percent: 0 };
    
    const currentTierData = tiers.find(t => t.tier_number === progress.current_tier);
    const nextTierData = tiers.find(t => t.tier_number === progress.current_tier + 1);
    
    if (!nextTierData) return { current: progress.current_xp, required: progress.current_xp, percent: 100 };
    
    const baseXp = currentTierData?.xp_required || 0;
    const targetXp = nextTierData.xp_required;
    const progressXp = progress.current_xp - baseXp;
    const neededXp = targetXp - baseXp;
    
    return {
      current: progressXp,
      required: neededXp,
      percent: Math.min(100, (progressXp / neededXp) * 100)
    };
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
    fetchData();
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
    getNextTier,
    getProgressToNextTier,
    getSeasonTimeRemaining,
    refetch: fetchData
  };
};
