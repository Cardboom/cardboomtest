import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface XPHistoryItem {
  id: string;
  action: string;
  xp_earned: number;
  description: string | null;
  created_at: string;
}

interface XPStats {
  totalXP: number;
  level: number;
  xpToNextLevel: number;
  progressPercent: number;
  recentHistory: XPHistoryItem[];
}

export const useXP = () => {
  const [stats, setStats] = useState<XPStats>({
    totalXP: 0,
    level: 1,
    xpToNextLevel: 100,
    progressPercent: 0,
    recentHistory: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const getLevelFromXP = (xp: number): number => {
    return Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
  };

  const getXPForLevel = (level: number): number => {
    return Math.pow(level - 1, 2) * 100;
  };

  const fetchXPData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get user's XP from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, level')
        .eq('id', user.id)
        .single();

      const totalXP = profile?.xp || 0;
      const level = getLevelFromXP(totalXP);
      const currentLevelXP = getXPForLevel(level);
      const nextLevelXP = getXPForLevel(level + 1);
      const progressInLevel = totalXP - currentLevelXP;
      const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
      const progressPercent = (progressInLevel / xpNeededForNextLevel) * 100;

      // Get recent XP history
      const { data: history } = await supabase
        .from('xp_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setStats({
        totalXP,
        level,
        xpToNextLevel: nextLevelXP - totalXP,
        progressPercent,
        recentHistory: history || []
      });
    } catch (error) {
      console.error('Error fetching XP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const awardXP = async (
    action: 'purchase' | 'sale' | 'listing' | 'referral' | 'daily_login' | 'review' | 'first_purchase' | 'streak_bonus', 
    xpAmount: number, 
    description?: string, 
    referenceId?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Insert XP history record
      const { error: historyError } = await supabase
        .from('xp_history')
        .insert([{
          user_id: user.id,
          action: action,
          xp_earned: xpAmount,
          description: description || null,
          reference_id: referenceId || null
        }]);

      if (historyError) throw historyError;

      // Update profile XP
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', user.id)
        .single();

      const newXP = (profile?.xp || 0) + xpAmount;
      const newLevel = getLevelFromXP(newXP);
      const oldLevel = getLevelFromXP(profile?.xp || 0);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ xp: newXP, level: newLevel })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Check for level up
      if (newLevel > oldLevel) {
        toast({
          title: '🎉 Level Up!',
          description: `Congratulations! You reached Level ${newLevel}!`,
        });
      }

      await fetchXPData();
      return true;
    } catch (error) {
      console.error('Error awarding XP:', error);
      return false;
    }
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    fetchXPData();

    // Subscribe to XP changes - proper cleanup pattern
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      channel = supabase
        .channel('xp-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'xp_history',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (!isMounted) return;
            const newXP = payload.new as XPHistoryItem;
            toast({
              title: `+${newXP.xp_earned} XP!`,
              description: newXP.description || `Earned from ${newXP.action}`,
            });
            fetchXPData();
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [toast]);

  return {
    ...stats,
    loading,
    awardXP,
    refetch: fetchXPData
  };
};
