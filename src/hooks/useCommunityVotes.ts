import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CommunityPoll {
  id: string;
  card_a_id: string | null;
  card_b_id: string | null;
  card_a_name: string;
  card_b_name: string;
  card_a_image: string | null;
  card_b_image: string | null;
  card_a_votes: number;
  card_b_votes: number;
  card_a_weighted_votes: number;
  card_b_weighted_votes: number;
  xp_reward: number;
  status: string;
  winner: string | null;
  vote_date: string;
  ends_at: string;
}

export interface UserVoteEntry {
  id: string;
  poll_id: string;
  user_id: string;
  vote_for: 'card_a' | 'card_b';
  vote_weight: number;
  is_pro_vote: boolean;
  xp_claimed: boolean;
}

export const useCommunityVotes = (userId?: string) => {
  const [todaysPoll, setTodaysPoll] = useState<CommunityPoll | null>(null);
  const [userVote, setUserVote] = useState<UserVoteEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasVotedToday, setHasVotedToday] = useState(false);

  const fetchTodaysPoll = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: poll, error } = await supabase
        .from('community_card_votes')
        .select('*')
        .eq('vote_date', today)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setTodaysPoll(poll as CommunityPoll | null);
    } catch (error) {
      console.error('Error fetching today\'s poll:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserVote = useCallback(async () => {
    if (!userId || !todaysPoll) return;
    
    const { data } = await supabase
      .from('community_vote_entries')
      .select('*')
      .eq('poll_id', todaysPoll.id)
      .eq('user_id', userId)
      .single();

    if (data) {
      setUserVote(data as UserVoteEntry);
      setHasVotedToday(true);
    }
  }, [userId, todaysPoll]);

  useEffect(() => {
    fetchTodaysPoll();
  }, [fetchTodaysPoll]);

  useEffect(() => {
    if (todaysPoll) {
      fetchUserVote();
    }
  }, [todaysPoll, fetchUserVote]);

  const vote = async (voteFor: 'card_a' | 'card_b', isPro: boolean = false) => {
    if (!userId) {
      toast.error('Please sign in to vote');
      return false;
    }
    if (!todaysPoll) {
      toast.error('No poll available today');
      return false;
    }
    if (hasVotedToday) {
      toast.error('You already voted today!');
      return false;
    }

    const voteWeight = isPro ? 2 : 1; // Pro votes count double

    const { error } = await supabase.from('community_vote_entries').insert({
      poll_id: todaysPoll.id,
      user_id: userId,
      vote_for: voteFor,
      vote_weight: voteWeight,
      is_pro_vote: isPro,
    });

    if (error) {
      console.error('Vote error:', error);
      toast.error('Failed to vote');
      return false;
    }

    // Award XP immediately - use daily_login action type as it's the closest match
    await supabase.from('xp_history').insert({
      user_id: userId,
      action: 'daily_login',
      xp_earned: todaysPoll.xp_reward,
      description: `Voted in daily card battle: ${todaysPoll.card_a_name} vs ${todaysPoll.card_b_name}`,
    });

    // Update profile XP
    await supabase.rpc('update_reputation', {
      p_user_id: userId,
      p_event_type: 'community_vote',
      p_points: 5,
    });

    toast.success(`Vote cast! +${todaysPoll.xp_reward} XP earned!`);
    setHasVotedToday(true);
    fetchTodaysPoll();
    fetchUserVote();
    return true;
  };

  return {
    todaysPoll,
    userVote,
    loading,
    hasVotedToday,
    vote,
    refetch: () => {
      fetchTodaysPoll();
      fetchUserVote();
    },
  };
};

// Admin hook for managing community polls
export const useCommunityVotesAdmin = () => {
  const [allPolls, setAllPolls] = useState<CommunityPoll[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllPolls = useCallback(async () => {
    const { data } = await supabase
      .from('community_card_votes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    
    setAllPolls((data || []) as CommunityPoll[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAllPolls();
  }, [fetchAllPolls]);

  const createPoll = async (
    cardAName: string,
    cardBName: string,
    cardAImage?: string,
    cardBImage?: string,
    cardAId?: string,
    cardBId?: string,
    xpReward: number = 20
  ) => {
    const { data: user } = await supabase.auth.getUser();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const { error } = await supabase.from('community_card_votes').insert({
      card_a_name: cardAName,
      card_b_name: cardBName,
      card_a_image: cardAImage || null,
      card_b_image: cardBImage || null,
      card_a_id: cardAId || null,
      card_b_id: cardBId || null,
      xp_reward: xpReward,
      ends_at: tomorrow.toISOString(),
      created_by: user?.user?.id,
    });

    if (error) {
      toast.error('Failed to create poll');
      return false;
    }
    
    toast.success('Daily poll created!');
    fetchAllPolls();
    return true;
  };

  const finalizePoll = async (pollId: string) => {
    await supabase.rpc('finalize_community_poll', { poll_uuid: pollId });
    toast.success('Poll finalized!');
    fetchAllPolls();
  };

  return { allPolls, loading, createPoll, finalizePoll, refetch: fetchAllPolls };
};
