import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FollowCreatorButtonProps {
  creatorId: string;
  className?: string;
}

export const FollowCreatorButton = ({ creatorId, className }: FollowCreatorButtonProps) => {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const { data: isFollowing, isLoading } = useQuery({
    queryKey: ['creator-following', creatorId, userId],
    queryFn: async () => {
      if (!userId) return false;
      
      const { data, error } = await supabase
        .from('creator_followers')
        .select('id')
        .eq('creator_id', creatorId)
        .eq('follower_user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    },
    enabled: !!userId && !!creatorId
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Must be logged in');

      if (isFollowing) {
        const { error } = await supabase
          .from('creator_followers')
          .delete()
          .eq('creator_id', creatorId)
          .eq('follower_user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('creator_followers')
          .insert({
            creator_id: creatorId,
            follower_user_id: userId,
            referral_source: window.location.href
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-following', creatorId] });
      queryClient.invalidateQueries({ queryKey: ['creator-followers-count', creatorId] });
      toast.success(isFollowing ? 'Unfollowed creator' : 'Now following creator');
    },
    onError: () => {
      toast.error('Failed to update follow status');
    }
  });

  if (!userId) {
    return (
      <Button variant="outline" size="sm" className={className} asChild>
        <a href="/auth">
          <UserPlus className="h-4 w-4 mr-1" />
          Follow
        </a>
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? "secondary" : "default"}
      size="sm"
      className={className}
      onClick={() => followMutation.mutate()}
      disabled={followMutation.isPending || isLoading}
    >
      {followMutation.isPending || isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="h-4 w-4 mr-1" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-1" />
          Follow
        </>
      )}
    </Button>
  );
};
