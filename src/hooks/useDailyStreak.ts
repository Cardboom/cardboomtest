import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StreakData {
  currentStreak: number;
  lastLoginDate: string | null;
  hasLoggedToday: boolean;
  loading: boolean;
}

export const useDailyStreak = () => {
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    lastLoginDate: null,
    hasLoggedToday: false,
    loading: true
  });
  const { toast } = useToast();

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
        .single();

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
      const streakBonus = Math.min(newStreak * 5, 50); // Max 50 bonus XP
      const totalXP = baseXP + streakBonus;

      // Check if user is beta tester for 2x bonus
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_beta_tester, xp, level')
        .eq('id', user.id)
        .single();

      const finalXP = profile?.is_beta_tester ? totalXP * 2 : totalXP;

      // Insert XP record
      await supabase
        .from('xp_history')
        .insert({
          user_id: user.id,
          action: 'daily_login',
          xp_earned: finalXP,
          description: `Daily login - Day ${newStreak} streak${profile?.is_beta_tester ? ' (2x Beta Bonus!)' : ''}`
        });

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
          .from('xp_history')
          .insert({
            user_id: user.id,
            action: 'streak_bonus',
            xp_earned: finalBonusXP,
            description: `${newStreak}-day streak milestone!${profile?.is_beta_tester ? ' (2x Beta Bonus!)' : ''}`
          });

        await supabase
          .from('profiles')
          .update({ xp: newXP + finalBonusXP })
          .eq('id', user.id);

        toast({
          title: `🎉 ${newStreak}-Day Streak!`,
          description: `You earned ${finalBonusXP} bonus XP for your dedication!`,
        });
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
  }, [toast]);

  useEffect(() => {
    checkAndLogDailyLogin();
  }, [checkAndLogDailyLogin]);

  return streakData;
};
