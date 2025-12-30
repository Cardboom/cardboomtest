import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TradeMatch {
  userId: string;
  username: string;
  avatarUrl: string | null;
  matchScore: number;
  theyHave: {
    id: string;
    name: string;
    imageUrl: string | null;
    currentPrice: number;
  }[];
  theyWant: {
    id: string;
    name: string;
    imageUrl: string | null;
    currentPrice: number;
  }[];
  totalValueTheyOffer: number;
  totalValueYouOffer: number;
  valueDifference: number;
}

export const useTradeMatching = () => {
  const [matches, setMatches] = useState<TradeMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findMatches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please sign in to find trade matches');
        return;
      }

      // Get what the current user wants (from watchlist and trade_preferences)
      const { data: myWants } = await supabase
        .from('watchlist')
        .select('market_item_id')
        .eq('user_id', user.id);

      // Get what the current user has for trade (from portfolio)
      const { data: myHaves } = await supabase
        .from('portfolio_items')
        .select('market_item_id')
        .eq('user_id', user.id);

      if (!myWants?.length && !myHaves?.length) {
        setMatches([]);
        return;
      }

      const myWantIds = myWants?.map(w => w.market_item_id).filter(Boolean) || [];
      const myHaveIds = myHaves?.map(h => h.market_item_id).filter(Boolean) || [];

      // Find users who HAVE what I WANT
      const { data: usersWithMyWants } = await supabase
        .from('portfolio_items')
        .select(`
          user_id,
          market_item_id,
          market_items:market_item_id (
            id,
            name,
            image_url,
            current_price
          )
        `)
        .in('market_item_id', myWantIds)
        .neq('user_id', user.id);

      // Find users who WANT what I HAVE  
      const { data: usersWantingMyHaves } = await supabase
        .from('watchlist')
        .select(`
          user_id,
          market_item_id,
          market_items:market_item_id (
            id,
            name,
            image_url,
            current_price
          )
        `)
        .in('market_item_id', myHaveIds)
        .neq('user_id', user.id);

      // Build match map
      const matchMap = new Map<string, {
        theyHave: any[];
        theyWant: any[];
      }>();

      // Process users who have what I want
      usersWithMyWants?.forEach(item => {
        if (!item.user_id || !item.market_items) return;
        const existing = matchMap.get(item.user_id) || { theyHave: [], theyWant: [] };
        const marketItem = item.market_items as any;
        existing.theyHave.push({
          id: marketItem.id,
          name: marketItem.name,
          imageUrl: marketItem.image_url,
          currentPrice: marketItem.current_price || 0,
        });
        matchMap.set(item.user_id, existing);
      });

      // Process users who want what I have
      usersWantingMyHaves?.forEach(item => {
        if (!item.user_id || !item.market_items) return;
        const existing = matchMap.get(item.user_id) || { theyHave: [], theyWant: [] };
        const marketItem = item.market_items as any;
        existing.theyWant.push({
          id: marketItem.id,
          name: marketItem.name,
          imageUrl: marketItem.image_url,
          currentPrice: marketItem.current_price || 0,
        });
        matchMap.set(item.user_id, existing);
      });

      // Get user profiles for matches
      const matchUserIds = Array.from(matchMap.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', matchUserIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Build final matches with scores
      const finalMatches: TradeMatch[] = [];

      matchMap.forEach((data, oderId) => {
        const profile = profileMap.get(oderId);
        if (!profile) return;

        // Calculate match score (higher is better)
        // Perfect match = they have what you want AND want what you have
        const hasWhatYouWant = data.theyHave.length > 0;
        const wantsWhatYouHave = data.theyWant.length > 0;
        const isPerfectMatch = hasWhatYouWant && wantsWhatYouHave;

        const totalValueTheyOffer = data.theyHave.reduce((sum, item) => sum + item.currentPrice, 0);
        const totalValueYouOffer = data.theyWant.reduce((sum, item) => sum + item.currentPrice, 0);
        const valueDifference = Math.abs(totalValueTheyOffer - totalValueYouOffer);

        // Score: perfect matches first, then by item count, then by value balance
        let matchScore = 0;
        if (isPerfectMatch) matchScore += 100;
        matchScore += data.theyHave.length * 10;
        matchScore += data.theyWant.length * 10;
        // Bonus for balanced trades (smaller value difference)
        if (valueDifference < 100) matchScore += 20;
        else if (valueDifference < 500) matchScore += 10;

        finalMatches.push({
          userId: oderId,
          username: profile.display_name || 'Unknown User',
          avatarUrl: profile.avatar_url,
          matchScore,
          theyHave: data.theyHave,
          theyWant: data.theyWant,
          totalValueTheyOffer,
          totalValueYouOffer,
          valueDifference,
        });
      });

      // Sort by match score (descending)
      finalMatches.sort((a, b) => b.matchScore - a.matchScore);

      setMatches(finalMatches);
    } catch (err) {
      console.error('Trade matching error:', err);
      setError('Failed to find trade matches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    findMatches();
  }, [findMatches]);

  return {
    matches,
    loading,
    error,
    refetch: findMatches,
  };
};
