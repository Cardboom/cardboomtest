import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AchievementUnlockNotification from '@/components/achievements/AchievementUnlockNotification';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  xp_reward: number;
}

interface AchievementContextType {
  showAchievementUnlock: (achievement: Achievement) => void;
  checkAndAwardAchievement: (achievementKey: string, userId: string) => Promise<boolean>;
}

const AchievementContext = createContext<AchievementContextType | undefined>(undefined);

export const useAchievementNotifications = () => {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error('useAchievementNotifications must be used within AchievementProvider');
  }
  return context;
};

export const AchievementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);
  const [queue, setQueue] = useState<Achievement[]>([]);

  const showAchievementUnlock = useCallback((achievement: Achievement) => {
    setQueue(prev => [...prev, achievement]);
  }, []);

  const checkAndAwardAchievement = useCallback(async (achievementKey: string, userId: string): Promise<boolean> => {
    try {
      // Get the achievement by key
      const { data: achievement, error: achievementError } = await supabase
        .from('achievements')
        .select('*')
        .eq('key', achievementKey)
        .eq('is_active', true)
        .single();

      if (achievementError || !achievement) {
        console.error('Achievement not found:', achievementKey);
        return false;
      }

      // Check if user already has this achievement
      const { data: existing } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_id', achievement.id)
        .single();

      if (existing) {
        return false; // Already has achievement
      }

      // Award the achievement
      const { error: insertError } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievement.id,
          progress: achievement.requirement_value
        });

      if (insertError) {
        console.error('Failed to award achievement:', insertError);
        return false;
      }

      // Get current XP and update
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', userId)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ xp: (profile.xp || 0) + achievement.xp_reward })
          .eq('id', userId);
      }

      // Show the notification
      showAchievementUnlock({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        tier: achievement.tier as 'bronze' | 'silver' | 'gold' | 'platinum',
        xp_reward: achievement.xp_reward
      });

      return true;
    } catch (error) {
      console.error('Error checking/awarding achievement:', error);
      return false;
    }
  }, [showAchievementUnlock]);

  // Process queue - show one achievement at a time
  useEffect(() => {
    if (queue.length > 0 && !unlockedAchievement) {
      setUnlockedAchievement(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  }, [queue, unlockedAchievement]);

  const handleClose = () => {
    setUnlockedAchievement(null);
  };

  return (
    <AchievementContext.Provider value={{ showAchievementUnlock, checkAndAwardAchievement }}>
      {children}
      <AchievementUnlockNotification 
        achievement={unlockedAchievement} 
        onClose={handleClose} 
      />
    </AchievementContext.Provider>
  );
};
