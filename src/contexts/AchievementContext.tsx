import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
  const hasSynced = useRef(false);

  const showAchievementUnlock = useCallback((achievement: Achievement) => {
    setQueue(prev => [...prev, achievement]);
  }, []);

  const checkAndAwardAchievement = useCallback(async (achievementKey: string, userId: string): Promise<boolean> => {
    try {
      // Get the current logged-in user to ensure we only show notifications to them
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const isCurrentUser = currentUser?.id === userId;

      // Get the achievement by key
      const { data: achievement, error: achievementError } = await supabase
        .from('achievements')
        .select('*')
        .eq('key', achievementKey)
        .eq('is_active', true)
        .single();

      if (achievementError || !achievement) {
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

      // Only show notification if this achievement is for the currently logged-in user
      if (isCurrentUser) {
        showAchievementUnlock({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          tier: achievement.tier as 'bronze' | 'silver' | 'gold' | 'platinum',
          xp_reward: achievement.xp_reward
        });
      }

      return true;
    } catch (error) {
      console.error('Error checking/awarding achievement:', error);
      return false;
    }
  }, [showAchievementUnlock]);

  // Sync achievements for existing users on login
  const syncAchievementsForUser = useCallback(async (userId: string) => {
    if (hasSynced.current) return;
    hasSynced.current = true;

    try {
      // Check purchase achievements
      const { count: purchaseCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('buyer_id', userId);

      const purchases = purchaseCount || 0;
      if (purchases >= 1) await checkAndAwardAchievement('first_purchase', userId);
      if (purchases >= 5) await checkAndAwardAchievement('purchase_5', userId);
      if (purchases >= 10) await checkAndAwardAchievement('purchase_10', userId);
      if (purchases >= 25) await checkAndAwardAchievement('purchase_25', userId);
      if (purchases >= 50) await checkAndAwardAchievement('purchase_50', userId);
      if (purchases >= 100) await checkAndAwardAchievement('purchase_100', userId);

      // Check sale achievements
      const { count: saleCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', userId);

      const sales = saleCount || 0;
      if (sales >= 1) await checkAndAwardAchievement('first_sale', userId);
      if (sales >= 5) await checkAndAwardAchievement('sales_5', userId);
      if (sales >= 10) await checkAndAwardAchievement('sales_10', userId);
      if (sales >= 25) await checkAndAwardAchievement('sales_25', userId);
      if (sales >= 50) await checkAndAwardAchievement('sales_50', userId);
      if (sales >= 100) await checkAndAwardAchievement('sales_100', userId);

      // Check listing achievements
      const { count: listingCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', userId);

      const listings = listingCount || 0;
      if (listings >= 1) await checkAndAwardAchievement('first_listing', userId);
      if (listings >= 5) await checkAndAwardAchievement('listings_5', userId);
      if (listings >= 10) await checkAndAwardAchievement('listings_10', userId);
      if (listings >= 25) await checkAndAwardAchievement('listings_25', userId);
      if (listings >= 50) await checkAndAwardAchievement('listings_50', userId);
      if (listings >= 100) await checkAndAwardAchievement('listings_100', userId);

      // Check collection/portfolio achievements
      const { count: portfolioCount } = await supabase
        .from('portfolio_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const portfolio = portfolioCount || 0;
      if (portfolio >= 1) await checkAndAwardAchievement('collection_1', userId);
      if (portfolio >= 5) await checkAndAwardAchievement('collection_5', userId);
      if (portfolio >= 10) await checkAndAwardAchievement('collection_10', userId);
      if (portfolio >= 20) await checkAndAwardAchievement('collection_20', userId);
      if (portfolio >= 50) await checkAndAwardAchievement('collection_50', userId);
      if (portfolio >= 100) await checkAndAwardAchievement('collection_100', userId);

      // Check follower achievements
      const { count: followerCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      const followers = followerCount || 0;
      if (followers >= 1) await checkAndAwardAchievement('followers_1', userId);
      if (followers >= 10) await checkAndAwardAchievement('followers_10', userId);
      if (followers >= 50) await checkAndAwardAchievement('followers_50', userId);
      if (followers >= 100) await checkAndAwardAchievement('followers_100', userId);

      // Check review achievements
      const { count: reviewCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('reviewer_id', userId);

      const reviews = reviewCount || 0;
      if (reviews >= 1) await checkAndAwardAchievement('first_review', userId);
      if (reviews >= 10) await checkAndAwardAchievement('reviews_10', userId);
      if (reviews >= 50) await checkAndAwardAchievement('reviews_50', userId);

      // Check vault achievements
      const { count: vaultCount } = await supabase
        .from('vault_items')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId);

      const vault = vaultCount || 0;
      if (vault >= 1) await checkAndAwardAchievement('vault_1', userId);
      if (vault >= 5) await checkAndAwardAchievement('vault_5', userId);
      if (vault >= 10) await checkAndAwardAchievement('vault_10', userId);
      if (vault >= 25) await checkAndAwardAchievement('vault_25', userId);

      // Check spending achievements
      const { data: buyOrders } = await supabase
        .from('orders')
        .select('price')
        .eq('buyer_id', userId);

      const totalSpent = buyOrders?.reduce((sum, order) => sum + Number(order.price), 0) || 0;
      if (totalSpent >= 100) await checkAndAwardAchievement('spent_100', userId);
      if (totalSpent >= 500) await checkAndAwardAchievement('spent_500', userId);
      if (totalSpent >= 1000) await checkAndAwardAchievement('spent_1000', userId);
      if (totalSpent >= 5000) await checkAndAwardAchievement('spent_5000', userId);

      // Check earnings achievements
      const { data: sellOrders } = await supabase
        .from('orders')
        .select('price, seller_fee')
        .eq('seller_id', userId);

      const totalEarned = sellOrders?.reduce((sum, order) => sum + (Number(order.price) - Number(order.seller_fee)), 0) || 0;
      if (totalEarned >= 100) await checkAndAwardAchievement('earned_100', userId);
      if (totalEarned >= 500) await checkAndAwardAchievement('earned_500', userId);
      if (totalEarned >= 1000) await checkAndAwardAchievement('earned_1000', userId);
      if (totalEarned >= 5000) await checkAndAwardAchievement('earned_5000', userId);

      // Check streak achievements from daily_logins
      const { data: streakData } = await supabase
        .from('daily_logins')
        .select('streak_count')
        .eq('user_id', userId)
        .order('login_date', { ascending: false })
        .limit(1)
        .single();

      const streak = streakData?.streak_count || 0;
      if (streak >= 3) await checkAndAwardAchievement('streak_3', userId);
      if (streak >= 7) await checkAndAwardAchievement('streak_7', userId);
      if (streak >= 14) await checkAndAwardAchievement('streak_14', userId);
      if (streak >= 30) await checkAndAwardAchievement('streak_30', userId);

    } catch (error) {
      console.error('Error syncing achievements:', error);
    }
  }, [checkAndAwardAchievement]);

  // Auto-sync achievements on login
  useEffect(() => {
    const checkAndSync = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        syncAchievementsForUser(user.id);
      }
    };

    checkAndSync();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        hasSynced.current = false;
        syncAchievementsForUser(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [syncAchievementsForUser]);

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

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    showAchievementUnlock,
    checkAndAwardAchievement,
  }), [showAchievementUnlock, checkAndAwardAchievement]);

  return (
    <AchievementContext.Provider value={contextValue}>
      {children}
      <AchievementUnlockNotification 
        achievement={unlockedAchievement} 
        onClose={handleClose} 
      />
    </AchievementContext.Provider>
  );
};
