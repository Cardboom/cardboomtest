import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CardWar {
  id: string;
  card_a_id: string | null;
  card_b_id: string | null;
  card_a_name: string;
  card_b_name: string;
  card_a_image: string | null;
  card_b_image: string | null;
  prize_pool: number;
  status: string;
  winner: string | null;
  starts_at: string;
  ends_at: string;
  created_at: string;
  created_by?: string | null;
  card_a_votes?: number;
  card_b_votes?: number;
  card_a_pro_votes?: number;
  card_b_pro_votes?: number;
}

export interface CardWarVote {
  id: string;
  card_war_id: string;
  user_id: string;
  vote_for: 'card_a' | 'card_b';
  is_pro_vote: boolean;
  vote_value: number;
  payout_amount: number | null;
  payout_claimed: boolean;
}

export const useCardWars = (userId?: string) => {
  const [activeWars, setActiveWars] = useState<CardWar[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, CardWarVote>>({});
  const [loading, setLoading] = useState(true);

  const fetchActiveWars = useCallback(async () => {
    try {
      const { data: wars, error } = await supabase
        .from('card_wars')
        .select('*')
        .eq('status', 'active')
        .gte('ends_at', new Date().toISOString())
        .order('ends_at', { ascending: true });

      if (error) throw error;

      const warsWithVotes = await Promise.all(
        (wars || []).map(async (war) => {
          const { data: votes } = await supabase
            .from('card_war_votes')
            .select('vote_for, is_pro_vote, vote_value')
            .eq('card_war_id', war.id);

          return {
            ...war,
            card_a_votes: votes?.filter(v => v.vote_for === 'card_a').length || 0,
            card_b_votes: votes?.filter(v => v.vote_for === 'card_b').length || 0,
            card_a_pro_votes: votes?.filter(v => v.vote_for === 'card_a' && v.is_pro_vote)
              .reduce((sum, v) => sum + Number(v.vote_value), 0) || 0,
            card_b_pro_votes: votes?.filter(v => v.vote_for === 'card_b' && v.is_pro_vote)
              .reduce((sum, v) => sum + Number(v.vote_value), 0) || 0,
          };
        })
      );

      setActiveWars(warsWithVotes);
    } catch (error) {
      console.error('Error fetching card wars:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserVotes = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from('card_war_votes').select('*').eq('user_id', userId);
    const votesMap: Record<string, CardWarVote> = {};
    data?.forEach(vote => { votesMap[vote.card_war_id] = vote as CardWarVote; });
    setUserVotes(votesMap);
  }, [userId]);

  useEffect(() => {
    fetchActiveWars();
    fetchUserVotes();
  }, [fetchActiveWars, fetchUserVotes]);

  const vote = async (warId: string, voteFor: 'card_a' | 'card_b', isPro: boolean = false) => {
    if (!userId) { toast.error('Please sign in to vote'); return false; }
    if (userVotes[warId]) { toast.error('You already voted!'); return false; }

    try {
      // Non-pro users can always vote with is_pro_vote = false and vote_value = 0
      const { error } = await supabase.from('card_war_votes').insert({
        card_war_id: warId, 
        user_id: userId, 
        vote_for: voteFor, 
        is_pro_vote: isPro, 
        vote_value: isPro ? 2.5 : 0,
      });

      if (error) { 
        console.error('Vote error:', error);
        toast.error('Failed to vote'); 
        return false; 
      }
      
      toast.success('Vote cast!' + (isPro ? ' Your $2.50 is in the pot!' : ''));
      fetchActiveWars(); 
      fetchUserVotes();
      return true;
    } catch (error) {
      console.error('Vote exception:', error);
      toast.error('Failed to vote');
      return false;
    }
  };

  return { activeWars, userVotes, loading, vote, refetch: () => { fetchActiveWars(); fetchUserVotes(); } };
};

export const useCardWarsAdmin = () => {
  const [allWars, setAllWars] = useState<CardWar[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllWars = useCallback(async () => {
    const { data } = await supabase.from('card_wars').select('*').order('created_at', { ascending: false });
    setAllWars((data || []) as CardWar[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAllWars(); }, [fetchAllWars]);

  const createWar = async (cardAName: string, cardBName: string, cardAImage?: string, cardBImage?: string, cardAId?: string, cardBId?: string, prizePool = 100, durationHours = 24) => {
    const { data: user } = await supabase.auth.getUser();
    const endsAt = new Date(); endsAt.setHours(endsAt.getHours() + durationHours);
    const { error } = await supabase.from('card_wars').insert({
      card_a_name: cardAName, card_b_name: cardBName, card_a_image: cardAImage, card_b_image: cardBImage,
      card_a_id: cardAId, card_b_id: cardBId, prize_pool: prizePool, ends_at: endsAt.toISOString(), created_by: user?.user?.id,
    });
    if (error) { toast.error('Failed to create'); return false; }
    toast.success('Card War created!'); fetchAllWars(); return true;
  };

  const endWar = async (warId: string, winner: 'card_a' | 'card_b') => {
    await supabase.from('card_wars').update({ status: 'completed', winner }).eq('id', warId);
    await supabase.rpc('calculate_card_war_payouts', { war_id: warId });
    toast.success('Card War ended!'); fetchAllWars(); return true;
  };

  return { allWars, loading, createWar, endWar, refetch: fetchAllWars };
};
