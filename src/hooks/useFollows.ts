import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useFollows = (targetUserId?: string) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const checkFollowStatus = async () => {
    if (!targetUserId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if current user follows target
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle();

      setIsFollowing(!!followData);

      // Get followers count
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId);

      setFollowersCount(followers || 0);

      // Get following count
      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId);

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
