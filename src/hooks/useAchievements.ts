import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  xp_reward: number;
  requirement_type: string;
  requirement_value: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  progress: number;
  achievement?: Achievement;
}

export const useAchievements = (userId?: string) => {
  const { data: allAchievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });
      if (error) throw error;
      return data as Achievement[];
    },
  });

  const { data: userAchievements, isLoading: userAchievementsLoading } = useQuery({
    queryKey: ['user-achievements', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*, achievement:achievements(*)')
        .eq('user_id', userId);
      if (error) throw error;
      return data as (UserAchievement & { achievement: Achievement })[];
    },
    enabled: !!userId,
  });

  const earnedAchievementIds = new Set(userAchievements?.map(ua => ua.achievement_id) || []);

  const achievementsByCategory = allAchievements?.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push({
      ...achievement,
      earned: earnedAchievementIds.has(achievement.id),
      earnedAt: userAchievements?.find(ua => ua.achievement_id === achievement.id)?.earned_at,
    });
    return acc;
  }, {} as Record<string, (Achievement & { earned: boolean; earnedAt?: string })[]>) || {};

  const earnedCount = userAchievements?.length || 0;
  const totalCount = allAchievements?.length || 0;
  const totalXpEarned = userAchievements?.reduce((sum, ua) => sum + (ua.achievement?.xp_reward || 0), 0) || 0;

  return {
    allAchievements,
    userAchievements,
    achievementsByCategory,
    earnedCount,
    totalCount,
    totalXpEarned,
    isLoading: achievementsLoading || userAchievementsLoading,
  };
};

export const tierColors = {
  bronze: 'from-amber-600 to-amber-800',
  silver: 'from-slate-300 to-slate-500',
  gold: 'from-yellow-400 to-yellow-600',
  platinum: 'from-cyan-300 to-cyan-500',
};

export const tierBgColors = {
  bronze: 'bg-amber-500/10 border-amber-500/30',
  silver: 'bg-slate-400/10 border-slate-400/30',
  gold: 'bg-yellow-500/10 border-yellow-500/30',
  platinum: 'bg-cyan-400/10 border-cyan-400/30',
};

export const categoryLabels: Record<string, string> = {
  holding: '💎 Diamond Hands',
  trading: '📈 Trading',
  engagement: '👁️ Engagement',
  collection: '📦 Collection',
  social: '⭐ Social',
  special: '🏆 Special',
};
