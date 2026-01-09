import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAchievementNotifications } from '@/contexts/AchievementContext';

interface StreakData {
  currentStreak: number;
  lastLoginDate: string | null;
  hasLoggedToday: boolean;
  loading: boolean;
}

export const useDailyStreakWithAchievements = () => {
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    lastLoginDate: null,
    hasLoggedToday: false,
    loading: true
  });
  const { toast } = useToast();
  const { checkAndAwardAchievement } = useAchievementNotifications();

  const checkStreakAchievements = useCallback(async (userId: string, streakCount: number) => {
    // Check streak achievements based on current streak
    if (streakCount >= 3) await checkAndAwardAchievement('streak_3', userId);
    if (streakCount >= 7) await checkAndAwardAchievement('streak_7', userId);
    if (streakCount >= 14) await checkAndAwardAchievement('streak_14', userId);
    if (streakCount >= 30) await checkAndAwardAchievement('streak_30', userId);
    if (streakCount >= 60) await checkAndAwardAchievement('streak_60', userId);
    if (streakCount >= 90) await checkAndAwardAchievement('streak_90', userId);
    if (streakCount >= 180) await checkAndAwardAchievement('streak_180', userId);
    if (streakCount >= 365) await checkAndAwardAchievement('streak_365', userId);
  }, [checkAndAwardAchievement]);

  const checkAndLogDailyLogin = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStreakData(prev => ({ ...prev, loading: false }));
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Check if already logged in today
      const { data: todayLogin } = await supabase
        .from('daily_logins')
        .select('*')
        .eq('user_id', user.id)
        .eq('login_date', today)
        .single();

      if (todayLogin) {
        setStreakData({
          currentStreak: todayLogin.streak_count || 1,
          lastLoginDate: today,
          hasLoggedToday: true,
          loading: false
        });
        return;
      }

      // Get yesterday's login to calculate streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const { data: yesterdayLogin } = await supabase
        .from('daily_logins')
        .select('streak_count')
        .eq('user_id', user.id)
        .eq('login_date', yesterdayStr)
        .maybeSingle();

      const newStreak = yesterdayLogin ? (yesterdayLogin.streak_count || 0) + 1 : 1;

      // Insert today's login
      const { error: insertError } = await supabase
        .from('daily_logins')
        .insert({
          user_id: user.id,
          login_date: today,
          streak_count: newStreak
        });

      if (insertError) throw insertError;

      // Award XP for daily login
      const baseXP = 10;
      const streakBonus = Math.min(newStreak * 5, 50);
      const totalXP = baseXP + streakBonus;

      // Check if user is beta tester for 2x bonus
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_beta_tester, xp, level')
        .eq('id', user.id)
        .single();

      const finalXP = profile?.is_beta_tester ? totalXP * 2 : totalXP;

      // Update profile XP
      const newXP = (profile?.xp || 0) + finalXP;
      const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;

      await supabase
        .from('profiles')
        .update({ xp: newXP, level: newLevel })
        .eq('id', user.id);

      // Award streak bonus for milestones
      if (newStreak === 7 || newStreak === 30 || newStreak === 100) {
        const bonusXP = newStreak === 7 ? 100 : newStreak === 30 ? 500 : 1000;
        const finalBonusXP = profile?.is_beta_tester ? bonusXP * 2 : bonusXP;
        
        await supabase
          .from('profiles')
          .update({ xp: newXP + finalBonusXP })
          .eq('id', user.id);

        toast({
          title: `🎉 ${newStreak}-Day Streak!`,
          description: `You earned ${finalBonusXP} bonus XP for your dedication!`,
        });
      }

      // Check streak achievements
      try {
        await checkStreakAchievements(user.id, newStreak);
      } catch (error) {
        console.error('Error checking streak achievements:', error);
      }

      setStreakData({
        currentStreak: newStreak,
        lastLoginDate: today,
        hasLoggedToday: true,
        loading: false
      });

      toast({
        title: `🔥 Day ${newStreak} Streak!`,
        description: `You earned ${finalXP} XP for logging in today!`,
      });

    } catch (error) {
      console.error('Error logging daily login:', error);
      setStreakData(prev => ({ ...prev, loading: false }));
    }
  }, [toast, checkStreakAchievements]);

  useEffect(() => {
    checkAndLogDailyLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return streakData;
};
