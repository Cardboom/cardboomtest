import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAchievementNotifications } from '@/contexts/AchievementContext';

/**
 * Hook to retroactively sync achievements for existing users on login
 * This checks all achievement categories and awards any that the user qualifies for
 */
export const useAchievementSync = () => {
  const { checkAndAwardAchievement } = useAchievementNotifications();
  const hasSynced = useRef(false);

  const syncAllAchievements = useCallback(async (userId: string) => {
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
      // Match database achievement keys (consistent with useAchievementTriggers)
      if (totalSpent >= 100) await checkAndAwardAchievement('big_spender', userId);
      if (totalSpent >= 1000) await checkAndAwardAchievement('whale_spender', userId);
      if (totalSpent >= 5000) await checkAndAwardAchievement('mega_spender', userId);
      if (totalSpent >= 10000) await checkAndAwardAchievement('ultra_spender', userId);

      // Check earnings achievements
      const { data: sellOrders } = await supabase
        .from('orders')
        .select('price, seller_fee')
        .eq('seller_id', userId);

      const totalEarned = sellOrders?.reduce((sum, order) => sum + (Number(order.price) - Number(order.seller_fee || 0)), 0) || 0;
      // Match database achievement keys (consistent with useAchievementTriggers)
      if (totalEarned >= 100) await checkAndAwardAchievement('small_earner', userId);
      if (totalEarned >= 500) await checkAndAwardAchievement('steady_earner', userId);
      if (totalEarned >= 1000) await checkAndAwardAchievement('big_earner', userId);
      if (totalEarned >= 5000) await checkAndAwardAchievement('major_earner', userId);

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

      // Achievement sync completed silently
    } catch (error) {
      console.error('Error syncing achievements:', error);
    }
  }, [checkAndAwardAchievement]);

  // Auto-sync on auth state change
  useEffect(() => {
    const checkAndSync = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        syncAllAchievements(user.id);
      }
    };

    checkAndSync();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        hasSynced.current = false; // Reset for new login
        syncAllAchievements(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [syncAllAchievements]);

  return { syncAllAchievements };
};
