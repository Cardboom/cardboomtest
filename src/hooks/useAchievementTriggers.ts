import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAchievementNotifications } from '@/contexts/AchievementContext';

export const useAchievementTriggers = () => {
  const { checkAndAwardAchievement } = useAchievementNotifications();

  // Check purchase-related achievements
  const checkPurchaseAchievements = useCallback(async (userId: string) => {
    // Get total purchases count
    const { count: purchaseCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('buyer_id', userId);

    const count = purchaseCount || 0;

    // First purchase
    if (count === 1) {
      await checkAndAwardAchievement('first_purchase', userId);
    }
    // Purchase milestones
    if (count >= 5) await checkAndAwardAchievement('purchase_5', userId);
    if (count >= 10) await checkAndAwardAchievement('purchase_10', userId);
    if (count >= 25) await checkAndAwardAchievement('purchase_25', userId);
    if (count >= 50) await checkAndAwardAchievement('purchase_50', userId);
    if (count >= 100) await checkAndAwardAchievement('purchase_100', userId);
    if (count >= 250) await checkAndAwardAchievement('purchase_250', userId);
    if (count >= 500) await checkAndAwardAchievement('purchase_500', userId);
    if (count >= 1000) await checkAndAwardAchievement('purchase_1000', userId);
  }, [checkAndAwardAchievement]);

  // Check sale-related achievements (for seller when item is sold)
  const checkSaleAchievements = useCallback(async (userId: string) => {
    const { count: saleCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', userId);

    const count = saleCount || 0;

    if (count === 1) await checkAndAwardAchievement('first_sale', userId);
    if (count >= 5) await checkAndAwardAchievement('sales_5', userId);
    if (count >= 10) await checkAndAwardAchievement('sales_10', userId);
    if (count >= 25) await checkAndAwardAchievement('sales_25', userId);
    if (count >= 50) await checkAndAwardAchievement('sales_50', userId);
    if (count >= 100) await checkAndAwardAchievement('sales_100', userId);
    if (count >= 500) await checkAndAwardAchievement('sales_500', userId);
    if (count >= 1000) await checkAndAwardAchievement('sales_1000', userId);
  }, [checkAndAwardAchievement]);

  // Check listing-related achievements
  const checkListingAchievements = useCallback(async (userId: string) => {
    const { count: listingCount } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', userId);

    const count = listingCount || 0;

    if (count === 1) await checkAndAwardAchievement('first_listing', userId);
    if (count >= 5) await checkAndAwardAchievement('listings_5', userId);
    if (count >= 10) await checkAndAwardAchievement('listings_10', userId);
    if (count >= 25) await checkAndAwardAchievement('listings_25', userId);
    if (count >= 50) await checkAndAwardAchievement('listings_50', userId);
    if (count >= 100) await checkAndAwardAchievement('listings_100', userId);
  }, [checkAndAwardAchievement]);

  // Check collection/portfolio achievements
  const checkCollectionAchievements = useCallback(async (userId: string) => {
    const { count: portfolioCount } = await supabase
      .from('portfolio_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const count = portfolioCount || 0;

    if (count >= 1) await checkAndAwardAchievement('collection_1', userId);
    if (count >= 5) await checkAndAwardAchievement('collection_5', userId);
    if (count >= 10) await checkAndAwardAchievement('collection_10', userId);
    if (count >= 20) await checkAndAwardAchievement('collection_20', userId);
    if (count >= 50) await checkAndAwardAchievement('collection_50', userId);
    if (count >= 100) await checkAndAwardAchievement('collection_100', userId);
    if (count >= 250) await checkAndAwardAchievement('collection_250', userId);
    if (count >= 500) await checkAndAwardAchievement('collection_500', userId);
    if (count >= 1000) await checkAndAwardAchievement('collection_1000', userId);
  }, [checkAndAwardAchievement]);

  // Check login streak achievements
  const checkStreakAchievements = useCallback(async (userId: string, streakCount: number) => {
    if (streakCount >= 3) await checkAndAwardAchievement('streak_3', userId);
    if (streakCount >= 7) await checkAndAwardAchievement('streak_7', userId);
    if (streakCount >= 14) await checkAndAwardAchievement('streak_14', userId);
    if (streakCount >= 30) await checkAndAwardAchievement('streak_30', userId);
    if (streakCount >= 60) await checkAndAwardAchievement('streak_60', userId);
    if (streakCount >= 90) await checkAndAwardAchievement('streak_90', userId);
    if (streakCount >= 180) await checkAndAwardAchievement('streak_180', userId);
    if (streakCount >= 365) await checkAndAwardAchievement('streak_365', userId);
  }, [checkAndAwardAchievement]);

  // Check social achievements (followers)
  const checkFollowerAchievements = useCallback(async (userId: string) => {
    const { count: followerCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    const count = followerCount || 0;

    if (count >= 1) await checkAndAwardAchievement('followers_1', userId);
    if (count >= 10) await checkAndAwardAchievement('followers_10', userId);
    if (count >= 50) await checkAndAwardAchievement('followers_50', userId);
    if (count >= 100) await checkAndAwardAchievement('followers_100', userId);
    if (count >= 500) await checkAndAwardAchievement('followers_500', userId);
    if (count >= 1000) await checkAndAwardAchievement('followers_1000', userId);
  }, [checkAndAwardAchievement]);

  // Check review achievements
  const checkReviewAchievements = useCallback(async (userId: string) => {
    const { count: reviewCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('reviewer_id', userId);

    const count = reviewCount || 0;

    if (count === 1) await checkAndAwardAchievement('first_review', userId);
    if (count >= 10) await checkAndAwardAchievement('reviews_10', userId);
    if (count >= 50) await checkAndAwardAchievement('reviews_50', userId);
    if (count >= 100) await checkAndAwardAchievement('reviews_100', userId);
  }, [checkAndAwardAchievement]);

  // Check vault achievements
  const checkVaultAchievements = useCallback(async (userId: string) => {
    const { count: vaultCount } = await supabase
      .from('vault_items')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId);

    const count = vaultCount || 0;

    if (count >= 1) await checkAndAwardAchievement('vault_1', userId);
    if (count >= 5) await checkAndAwardAchievement('vault_5', userId);
    if (count >= 10) await checkAndAwardAchievement('vault_10', userId);
    if (count >= 25) await checkAndAwardAchievement('vault_25', userId);
    if (count >= 50) await checkAndAwardAchievement('vault_50', userId);
    if (count >= 100) await checkAndAwardAchievement('vault_100', userId);
  }, [checkAndAwardAchievement]);

  // Check spending achievements
  const checkSpendingAchievements = useCallback(async (userId: string) => {
    const { data: orders } = await supabase
      .from('orders')
      .select('price')
      .eq('buyer_id', userId);

    const totalSpent = orders?.reduce((sum, order) => sum + Number(order.price), 0) || 0;

    if (totalSpent >= 100) await checkAndAwardAchievement('spent_100', userId);
    if (totalSpent >= 500) await checkAndAwardAchievement('spent_500', userId);
    if (totalSpent >= 1000) await checkAndAwardAchievement('spent_1000', userId);
    if (totalSpent >= 5000) await checkAndAwardAchievement('spent_5000', userId);
    if (totalSpent >= 10000) await checkAndAwardAchievement('spent_10000', userId);
    if (totalSpent >= 50000) await checkAndAwardAchievement('spent_50000', userId);
    if (totalSpent >= 100000) await checkAndAwardAchievement('spent_100000', userId);
  }, [checkAndAwardAchievement]);

  // Check earnings achievements
  const checkEarningsAchievements = useCallback(async (userId: string) => {
    const { data: orders } = await supabase
      .from('orders')
      .select('price, seller_fee')
      .eq('seller_id', userId);

    const totalEarned = orders?.reduce((sum, order) => sum + (Number(order.price) - Number(order.seller_fee)), 0) || 0;

    if (totalEarned >= 100) await checkAndAwardAchievement('earned_100', userId);
    if (totalEarned >= 500) await checkAndAwardAchievement('earned_500', userId);
    if (totalEarned >= 1000) await checkAndAwardAchievement('earned_1000', userId);
    if (totalEarned >= 5000) await checkAndAwardAchievement('earned_5000', userId);
    if (totalEarned >= 10000) await checkAndAwardAchievement('earned_10000', userId);
    if (totalEarned >= 50000) await checkAndAwardAchievement('earned_50000', userId);
  }, [checkAndAwardAchievement]);

  return {
    checkPurchaseAchievements,
    checkSaleAchievements,
    checkListingAchievements,
    checkCollectionAchievements,
    checkStreakAchievements,
    checkFollowerAchievements,
    checkReviewAchievements,
    checkVaultAchievements,
    checkSpendingAchievements,
    checkEarningsAchievements,
  };
};
