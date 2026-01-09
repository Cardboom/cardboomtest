import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAchievementNotifications } from '@/contexts/AchievementContext';

export const useFollows = (targetUserId?: string) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { checkAndAwardAchievement } = useAchievementNotifications();

  const checkFollowerAchievements = async (userId: string) => {
    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    const followerCount = count || 0;
    if (followerCount >= 1) await checkAndAwardAchievement('followers_1', userId);
    if (followerCount >= 10) await checkAndAwardAchievement('followers_10', userId);
    if (followerCount >= 50) await checkAndAwardAchievement('followers_50', userId);
    if (followerCount >= 100) await checkAndAwardAchievement('followers_100', userId);
    if (followerCount >= 500) await checkAndAwardAchievement('followers_500', userId);
    if (followerCount >= 1000) await checkAndAwardAchievement('followers_1000', userId);
  };

  const checkFollowStatus = async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if current user follows target
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle();

      if (followError) {
        console.error('Error checking follow data:', followError);
      }

      setIsFollowing(!!followData);

      // Get followers count
      const { count: followers, error: followersError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId);

      if (followersError) {
        console.error('Error getting followers count:', followersError);
      }

      setFollowersCount(followers || 0);

      // Get following count
      const { count: following, error: followingError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId);

      if (followingError) {
        console.error('Error getting following count:', followingError);
      }

      setFollowingCount(following || 0);
    } catch (error) {
      console.error('Error checking follow status:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Login Required',
          description: 'Please log in to follow sellers',
          variant: 'destructive',
        });
        return;
      }

      if (!targetUserId) return;

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) throw error;

        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
        toast({
          title: 'Unfollowed',
          description: 'You will no longer see updates from this seller',
        });
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
          });

        if (error) throw error;

        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);

        // Check follower achievements for the target user
        try {
          await checkFollowerAchievements(targetUserId);
        } catch (achievementError) {
          console.error('Error checking follower achievements:', achievementError);
        }

        toast({
          title: 'Following!',
          description: 'You will now see updates from this seller',
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: 'Error',
        description: 'Failed to update follow status',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    checkFollowStatus();
  }, [targetUserId]);

  return {
    isFollowing,
    followersCount,
    followingCount,
    loading,
    toggleFollow,
    refetch: checkFollowStatus,
  };
};
