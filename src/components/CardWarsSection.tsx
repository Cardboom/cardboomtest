import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Trophy, Clock, Users, Flame, Crown, Sparkles, Lock, ArrowRight, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCardWars } from '@/hooks/useCardWars';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// Mock data for showcase when no active wars
const mockWar = {
  id: 'mock',
  card_a_name: 'Charizard 1st Edition',
  card_b_name: 'Blastoise 1st Edition',
  card_a_image: '/placeholder.svg',
  card_b_image: '/placeholder.svg',
  card_a_votes: 1247,
  card_b_votes: 892,
  card_a_pro_votes: 45.50,
  card_b_pro_votes: 32.25,
  prize_pool: 100,
  ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

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
    <div className="py-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-500">
          <Swords className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Card Wars</h2>
          <p className="text-sm text-muted-foreground">Vote for your champion • Pro votes share $100 prize</p>
        </div>
        {useMockData && (
          <Badge variant="secondary" className="ml-auto">
            <Sparkles className="w-3 h-3 mr-1" />
            {userId ? 'Demo Battle' : 'Feature Preview'}
          </Badge>
        )}
      </div>

      <div className="grid gap-6">
        {wars.map((war) => {
          const userVote = userVotes[war.id];
          const totalVotes = (war.card_a_votes || 0) + (war.card_b_votes || 0);
          const cardAPercent = totalVotes > 0 ? ((war.card_a_votes || 0) / totalVotes) * 100 : 50;
          const cardBPercent = totalVotes > 0 ? ((war.card_b_votes || 0) / totalVotes) * 100 : 50;
          const endsIn = formatDistanceToNow(new Date(war.ends_at), { addSuffix: true });

          return (
            <Card key={war.id} className="overflow-hidden border-2 border-orange-500/30 bg-gradient-to-br from-background to-orange-950/10 relative">
              {/* Showcase overlay - only for non-logged-in users */}
              {isShowcase && (
                <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                  <div className="text-center space-y-2">
                    <div className="p-3 rounded-full bg-orange-500/20 w-fit mx-auto">
                      <Swords className="w-8 h-8 text-orange-500" />
                    </div>
                    <h3 className="text-xl font-bold">Card Wars</h3>
                    <p className="text-muted-foreground max-w-md mx-auto text-sm px-4">
                      Vote on epic card battles! Pro members compete for real cash prizes. 
                      Each Pro vote adds $2.50 to the winning pot.
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
                  <div className="flex items-center gap-6 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      $100 Prize Pools
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-blue-500" />
                      Community Voting
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
                <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-red-500/10 via-transparent to-emerald-500/10">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
                    <span className="font-bold text-lg">BATTLE ROYALE</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">
                      <Trophy className="w-3 h-3 mr-1" />
                      ${war.prize_pool} Prize Pool
                    </Badge>
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      Ends {endsIn}
                    </Badge>
                  </div>
                </div>

                {/* Live Vote Bar */}
                <div className="px-6 pt-6">
                  <LiveVoteBar 
                    cardAPercent={cardAPercent}
                    cardBPercent={cardBPercent}
                    cardAVotes={war.card_a_votes || 0}
                    cardBVotes={war.card_b_votes || 0}
                    animate={true}
                  />
                </div>

                {/* Battle Arena */}
                <div className="grid grid-cols-[1fr,auto,1fr] gap-4 p-6">
                  {/* Card A - Red */}
                  <motion.div 
                    className={`relative rounded-xl p-4 border-2 transition-all ${
                      userVote?.vote_for === 'card_a' 
                        ? 'border-red-500 bg-red-500/20 ring-2 ring-red-500/50' 
                        : 'border-red-500/50 bg-red-500/5 hover:bg-red-500/10'
                    }`}
                    whileHover={{ scale: userVote || isShowcase ? 1 : 1.02 }}
                  >
                    {war.card_a_image && (
                      <img 
                        src={war.card_a_image} 
                        alt={war.card_a_name}
                        className="w-full aspect-[3/4] object-cover rounded-lg mb-3"
                      />
                    )}
                    <h3 className="font-bold text-lg text-center mb-2">{war.card_a_name}</h3>
                    
                    {(isPro || useMockData) && (
                      <div className="text-xs text-center text-muted-foreground mb-3">
                        Pro pot: ${(war.card_a_pro_votes || 0).toFixed(2)}
                      </div>
                    )}

                    {!userVote && userId && !useMockData && (
                      <Button 
                        className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                        onClick={() => vote(war.id, 'card_a', isPro)}
                      >
                        {isPro && <Sparkles className="w-4 h-4 mr-2" />}
                        Vote Red
                      </Button>
                    )}

                    {useMockData && userId && (
                      <Button 
                        className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 opacity-50"
                        disabled
                      >
                        Demo Only
                      </Button>
                    )}

                    {userVote?.vote_for === 'card_a' && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-red-500">
                          <Crown className="w-3 h-3 mr-1" />
                          Your Pick
                        </Badge>
                      </div>
                    )}
                  </motion.div>

                  {/* VS */}
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <motion.div
                        className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-500 to-red-500"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        VS
                      </motion.div>
                      <Swords className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-8 text-orange-500" />
                    </div>
                  </div>

                  {/* Card B - Green */}
                  <motion.div 
                    className={`relative rounded-xl p-4 border-2 transition-all ${
                      userVote?.vote_for === 'card_b' 
                        ? 'border-emerald-500 bg-emerald-500/20 ring-2 ring-emerald-500/50' 
                        : 'border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10'
                    }`}
                    whileHover={{ scale: userVote || isShowcase ? 1 : 1.02 }}
                  >
                    {war.card_b_image && (
                      <img 
                        src={war.card_b_image} 
                        alt={war.card_b_name}
                        className="w-full aspect-[3/4] object-cover rounded-lg mb-3"
                      />
                    )}
                    <h3 className="font-bold text-lg text-center mb-2">{war.card_b_name}</h3>
                    
                    {(isPro || useMockData) && (
                      <div className="text-xs text-center text-muted-foreground mb-3">
                        Pro pot: ${(war.card_b_pro_votes || 0).toFixed(2)}
                      </div>
                    )}

                    {!userVote && userId && !useMockData && (
                      <Button 
                        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                        onClick={() => vote(war.id, 'card_b', isPro)}
                      >
                        {isPro && <Sparkles className="w-4 h-4 mr-2" />}
                        Vote Green
                      </Button>
                    )}

                    {useMockData && userId && (
                      <Button 
                        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 opacity-50"
                        disabled
                      >
                        Demo Only
                      </Button>
                    )}

                    {userVote?.vote_for === 'card_b' && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-emerald-500">
                          <Crown className="w-3 h-3 mr-1" />
                          Your Pick
                        </Badge>
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-4">
                  <div className="p-3 rounded-lg bg-muted/50 text-center text-sm">
                    {!userId ? (
                      <span className="flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        Join CardBoom to participate in Card Wars and win real prizes!
                      </span>
                    ) : useMockData ? (
                      <span className="flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        No active battles right now. Check back soon!
                      </span>
                    ) : isPro ? (
                      <span className="flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        Your Pro vote adds $2.50 to the winning pot!
                      </span>
                    ) : (
                      <span>
                        <a href="/pricing" className="text-primary hover:underline">Upgrade to Pro</a> to compete for the ${war.prize_pool} prize pool!
                      </span>
                    )}
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
