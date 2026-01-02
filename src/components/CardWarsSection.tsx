import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Trophy, Clock, Users, Flame, Crown, Sparkles, Lock, ArrowRight, TrendingUp, Gem, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCardWars } from '@/hooks/useCardWars';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// Epic matchups using real top-tier cards from database
const epicMatchups = [
  {
    id: 'charizard-vs-exodia',
    card_a_name: 'Charizard 1st Edition #4',
    card_b_name: 'Exodia the Forbidden One',
    card_a_image: 'https://images.tcggo.com/tcggo/storage/24107/mega-charizard-x-ex-pfl-13-phantasmal-flames.png',
    card_b_image: 'https://images.ygoprodeck.com/images/cards/33396948.jpg',
    card_a_votes: 2847,
    card_b_votes: 2654,
    card_a_pro_votes: 156.50,
    card_b_pro_votes: 142.25,
    prize_pool: 100,
    ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'black-lotus-vs-pikachu',
    card_a_name: 'Black Lotus',
    card_b_name: 'Pikachu Illustrator',
    card_a_image: 'https://cards.scryfall.io/large/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7c14.jpg',
    card_b_image: 'https://images.tcggo.com/tcggo/storage/21443/pikachu-ex-pre-28-prismatic-evolutions.png',
    card_a_votes: 3421,
    card_b_votes: 3187,
    card_a_pro_votes: 245.00,
    card_b_pro_votes: 232.50,
    prize_pool: 100,
    ends_at: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dragonite-vs-blue-eyes',
    card_a_name: 'Dragonite Tekno #149',
    card_b_name: 'Blue-Eyes White Dragon',
    card_a_image: 'https://images.tcggo.com/tcggo/storage/2643/dragonite-mew-149-151-pokemon.png',
    card_b_image: 'https://images.ygoprodeck.com/images/cards/89631139.jpg',
    card_a_votes: 1892,
    card_b_votes: 2156,
    card_a_pro_votes: 89.50,
    card_b_pro_votes: 112.00,
    prize_pool: 100,
    ends_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
  }
];

// Use first epic matchup as default showcase
const mockWar = epicMatchups[0];

// Live animated vote bar component
const LiveVoteBar = ({ 
  cardAPercent, 
  cardBPercent, 
  cardAVotes, 
  cardBVotes,
  animate = true 
}: { 
  cardAPercent: number; 
  cardBPercent: number; 
  cardAVotes: number;
  cardBVotes: number;
  animate?: boolean;
}) => {
  const [displayPercent, setDisplayPercent] = useState(cardAPercent);
  
  // Simulate live ticking animation
  useEffect(() => {
    if (!animate) return;
    
    const interval = setInterval(() => {
      // Random small fluctuation to simulate live voting
      const fluctuation = (Math.random() - 0.5) * 2;
      setDisplayPercent(prev => {
        const newVal = prev + fluctuation;
        return Math.max(5, Math.min(95, newVal));
      });
    }, 1500);
    
    return () => clearInterval(interval);
  }, [animate]);

  // Sync with actual data
  useEffect(() => {
    setDisplayPercent(cardAPercent);
  }, [cardAPercent]);

  const isCardAWinning = displayPercent > 50;

  return (
    <div className="relative">
      {/* Vote count labels */}
      <div className="flex justify-between mb-2 text-sm font-medium">
        <div className="flex items-center gap-2">
          <motion.div 
            className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-red-600"
            animate={{ scale: isCardAWinning ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.5, repeat: isCardAWinning ? Infinity : 0, repeatDelay: 1 }}
          />
          <span className="text-red-400">{cardAVotes.toLocaleString()}</span>
        </div>
        <motion.div 
          className="flex items-center gap-1 text-xs"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <TrendingUp className="w-3 h-3" />
          LIVE
        </motion.div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">{cardBVotes.toLocaleString()}</span>
          <motion.div 
            className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"
            animate={{ scale: !isCardAWinning ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.5, repeat: !isCardAWinning ? Infinity : 0, repeatDelay: 1 }}
          />
        </div>
      </div>

      {/* Animated bar */}
      <div className="relative h-8 rounded-full overflow-hidden bg-muted/30 border border-border/50">
        {/* Red side (Card A) */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 via-red-500 to-red-400"
          initial={{ width: '50%' }}
          animate={{ width: `${displayPercent}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          {/* Glow effect */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-transparent to-red-300/30"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          {/* Percentage */}
          <div className="absolute inset-0 flex items-center justify-start pl-4">
            <motion.span 
              className="font-bold text-white text-sm drop-shadow-lg"
              key={Math.round(displayPercent)}
            >
              {Math.round(displayPercent)}%
            </motion.span>
          </div>
        </motion.div>

        {/* Green side (Card B) */}
        <motion.div
          className="absolute inset-y-0 right-0 bg-gradient-to-l from-emerald-600 via-emerald-500 to-emerald-400"
          initial={{ width: '50%' }}
          animate={{ width: `${100 - displayPercent}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          {/* Glow effect */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-l from-transparent to-emerald-300/30"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.75 }}
          />
          {/* Percentage */}
          <div className="absolute inset-0 flex items-center justify-end pr-4">
            <motion.span 
              className="font-bold text-white text-sm drop-shadow-lg"
              key={Math.round(100 - displayPercent)}
            >
              {Math.round(100 - displayPercent)}%
            </motion.span>
          </div>
        </motion.div>

        {/* Center divider with pulse */}
        <motion.div 
          className="absolute top-0 bottom-0 w-1 bg-white/80 shadow-lg"
          style={{ left: `${displayPercent}%`, transform: 'translateX(-50%)' }}
          animate={{ 
            boxShadow: ['0 0 10px rgba(255,255,255,0.5)', '0 0 20px rgba(255,255,255,0.8)', '0 0 10px rgba(255,255,255,0.5)']
          }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </div>

      {/* Winner indicator */}
      <AnimatePresence>
        <motion.div 
          className="flex justify-center mt-2"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Badge 
            variant="outline" 
            className={`text-xs ${isCardAWinning ? 'border-red-500/50 text-red-400' : 'border-emerald-500/50 text-emerald-400'}`}
          >
            <Crown className="w-3 h-3 mr-1" />
            {isCardAWinning ? 'Red Leading' : 'Green Leading'}
          </Badge>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export const CardWarsSection = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { activeWars, userVotes, loading, vote } = useCardWars(userId || undefined);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
        
        const { data: sub } = await supabase
          .from('user_subscriptions')
          .select('tier')
          .eq('user_id', data.user.id)
          .gte('expires_at', new Date().toISOString())
          .single();
        
        setIsPro(sub?.tier === 'pro' || sub?.tier === 'verified_seller');
      }
      setIsLoading(false);
    };
    getUser();
  }, []);

  // Show showcase only for non-logged-in users
  const isShowcase = !userId && activeWars.length === 0;
  const wars = activeWars.length === 0 ? [mockWar] : activeWars;
  const useMockData = activeWars.length === 0;

  if (loading || isLoading) {
    return (
      <div className="py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-500 to-orange-500">
            <Swords className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Card Wars</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Pro members get <Gem className="w-3 h-3 text-primary" /> $2.50 free points/month to compete!
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {useMockData && (
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              {userId ? 'Demo Battle' : 'Preview'}
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/card-wars')}
            className="text-xs h-7"
          >
            View All
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {wars.map((war) => {
          const userVote = userVotes[war.id];
          const totalVotes = (war.card_a_votes || 0) + (war.card_b_votes || 0);
          const cardAPercent = totalVotes > 0 ? ((war.card_a_votes || 0) / totalVotes) * 100 : 50;
          const cardBPercent = totalVotes > 0 ? ((war.card_b_votes || 0) / totalVotes) * 100 : 50;
          const endsIn = formatDistanceToNow(new Date(war.ends_at), { addSuffix: true });

          return (
            <Card key={war.id} className="overflow-hidden border border-orange-500/30 bg-gradient-to-br from-background to-orange-950/10 relative">
              {/* Showcase overlay - only for non-logged-in users */}
              {isShowcase && (
                <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                  <div className="text-center space-y-2">
                    <div className="p-3 rounded-full bg-orange-500/20 w-fit mx-auto">
                      <Swords className="w-8 h-8 text-orange-500" />
                    </div>
                    <h3 className="text-xl font-bold">Card Wars</h3>
                    <p className="text-muted-foreground max-w-md mx-auto text-sm px-4">
                      Vote on epic card battles! Pro members compete for real cash prizes 
                      and earn <span className="text-primary font-medium">Cardboom Points</span> from prize pool shares.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={() => navigate('/auth')}
                      className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Sign Up to Vote
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => navigate('/pricing')}
                    >
                      See Pro Benefits
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      $100 Prize Pools
                    </span>
                    <span className="flex items-center gap-1">
                      <Gem className="w-4 h-4 text-primary" />
                      Earn Points
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="w-4 h-4 text-orange-500" />
                      Daily Battles
                    </span>
                  </div>
                </div>
              )}

              <CardContent className="p-0">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-gradient-to-r from-red-500/10 via-transparent to-emerald-500/10">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                    <span className="font-bold text-sm">BATTLE ROYALE</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 text-xs py-0">
                      <Trophy className="w-3 h-3 mr-1" />
                      ${war.prize_pool}
                    </Badge>
                    <Badge variant="secondary" className="text-xs py-0">
                      <Clock className="w-3 h-3 mr-1" />
                      {endsIn}
                    </Badge>
                  </div>
                </div>

                {/* Live Vote Bar */}
                <div className="px-4 pt-3">
                  <LiveVoteBar 
                    cardAPercent={cardAPercent}
                    cardBPercent={cardBPercent}
                    cardAVotes={war.card_a_votes || 0}
                    cardBVotes={war.card_b_votes || 0}
                    animate={true}
                  />
                </div>

                {/* Battle Arena */}
                <div className="grid grid-cols-[1fr,auto,1fr] gap-3 p-4">
                  {/* Card A - Red */}
                  <motion.div 
                    className={`relative rounded-lg p-2.5 border transition-all ${
                      userVote?.vote_for === 'card_a' 
                        ? 'border-red-500 bg-red-500/20 ring-1 ring-red-500/50' 
                        : 'border-red-500/50 bg-red-500/5 hover:bg-red-500/10'
                    }`}
                    whileHover={{ scale: userVote || isShowcase ? 1 : 1.02 }}
                  >
                    {war.card_a_image && (
                      <img 
                        src={war.card_a_image} 
                        alt={war.card_a_name}
                        className="w-full max-w-[140px] mx-auto aspect-[3/4] object-cover rounded-md mb-2"
                      />
                    )}
                    <h3 className="font-semibold text-sm text-center mb-1 line-clamp-2">{war.card_a_name}</h3>
                    
                    {(isPro || useMockData) && (
                      <div className="text-[10px] text-center text-muted-foreground mb-2">
                        Pro pot: ${(war.card_a_pro_votes || 0).toFixed(2)}
                      </div>
                    )}

                    {!userVote && userId && !useMockData && (
                      <Button 
                        size="sm"
                        className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-xs h-8"
                        onClick={() => vote(war.id, 'card_a', isPro)}
                      >
                        {isPro && <Sparkles className="w-3 h-3 mr-1" />}
                        Vote Red
                      </Button>
                    )}

                    {useMockData && userId && (
                      <Button 
                        size="sm"
                        className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 opacity-50 text-xs h-8"
                        disabled
                      >
                        Demo Only
                      </Button>
                    )}

                    {userVote?.vote_for === 'card_a' && (
                      <div className="absolute top-1.5 right-1.5">
                        <Badge className="bg-red-500 text-[10px] py-0 px-1.5">
                          <Crown className="w-2.5 h-2.5 mr-0.5" />
                          Your Pick
                        </Badge>
                      </div>
                    )}
                  </motion.div>

                  {/* VS */}
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <motion.div
                        className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-500 to-red-500"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        VS
                      </motion.div>
                      <Swords className="absolute -top-4 left-1/2 -translate-x-1/2 w-5 h-5 text-orange-500" />
                    </div>
                  </div>

                  {/* Card B - Green */}
                  <motion.div 
                    className={`relative rounded-lg p-2.5 border transition-all ${
                      userVote?.vote_for === 'card_b' 
                        ? 'border-emerald-500 bg-emerald-500/20 ring-1 ring-emerald-500/50' 
                        : 'border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10'
                    }`}
                    whileHover={{ scale: userVote || isShowcase ? 1 : 1.02 }}
                  >
                    {war.card_b_image && (
                      <img 
                        src={war.card_b_image} 
                        alt={war.card_b_name}
                        className="w-full max-w-[140px] mx-auto aspect-[3/4] object-cover rounded-md mb-2"
                      />
                    )}
                    <h3 className="font-semibold text-sm text-center mb-1 line-clamp-2">{war.card_b_name}</h3>
                    
                    {(isPro || useMockData) && (
                      <div className="text-[10px] text-center text-muted-foreground mb-2">
                        Pro pot: ${(war.card_b_pro_votes || 0).toFixed(2)}
                      </div>
                    )}

                    {!userVote && userId && !useMockData && (
                      <Button 
                        size="sm"
                        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-xs h-8"
                        onClick={() => vote(war.id, 'card_b', isPro)}
                      >
                        {isPro && <Sparkles className="w-3 h-3 mr-1" />}
                        Vote Green
                      </Button>
                    )}

                    {useMockData && userId && (
                      <Button 
                        size="sm"
                        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 opacity-50 text-xs h-8"
                        disabled
                      >
                        Demo Only
                      </Button>
                    )}

                    {userVote?.vote_for === 'card_b' && (
                      <div className="absolute top-1.5 right-1.5">
                        <Badge className="bg-emerald-500 text-[10px] py-0 px-1.5">
                          <Crown className="w-2.5 h-2.5 mr-0.5" />
                          Your Pick
                        </Badge>
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Footer */}
                <div className="px-4 pb-3 space-y-2">
                  <div className="p-2 rounded-md bg-muted/50 text-center text-xs">
                    {!userId ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-yellow-500" />
                        Join CardBoom to participate in Card Wars and win real prizes!
                      </span>
                    ) : useMockData ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        No active battles right now. Check back soon!
                      </span>
                    ) : isPro ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-yellow-500" />
                        Your Pro vote adds $2.50 to the pot! Winners share the ${war.prize_pool} prize.
                      </span>
                    ) : (
                      <span>
                        <a href="/pricing" className="text-primary hover:underline">Upgrade to Pro</a> to compete for the ${war.prize_pool} prize pool!
                      </span>
                    )}
                  </div>
                  {/* Pro Benefits Banner */}
                  <div className="p-2 rounded-md bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 text-center text-xs">
                    <span className="flex items-center justify-center gap-2 text-yellow-600 dark:text-yellow-400">
                      <Gift className="w-3 h-3" />
                      Pro subscribers get <strong>$2.50 in free Cardboom Points</strong> monthly — use them in Card Wars or for purchases!
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
