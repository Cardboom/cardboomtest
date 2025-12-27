import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Swords, Trophy, Clock, Users, Flame, Crown, Sparkles, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h from now
};

export const CardWarsSection = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>();
  const [isPro, setIsPro] = useState(false);
  const { activeWars, userVotes, loading, vote } = useCardWars(userId);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
        
        // Check if pro
        const { data: sub } = await supabase
          .from('user_subscriptions')
          .select('tier')
          .eq('user_id', data.user.id)
          .gte('expires_at', new Date().toISOString())
          .single();
        
        setIsPro(sub?.tier === 'pro' || sub?.tier === 'verified_seller');
      }
    };
    getUser();
  }, []);

  const isShowcase = activeWars.length === 0;
  const wars = isShowcase ? [mockWar] : activeWars;

  if (loading) {
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
    <section className="py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-500">
          <Swords className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Card Wars</h2>
          <p className="text-sm text-muted-foreground">Vote for your champion • Pro votes share $100 prize</p>
        </div>
        {isShowcase && (
          <Badge variant="secondary" className="ml-auto">
            <Sparkles className="w-3 h-3 mr-1" />
            Feature Preview
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
              {/* Showcase overlay */}
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
                <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10">
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

                {/* Battle Arena */}
                <div className="grid grid-cols-[1fr,auto,1fr] gap-4 p-6">
                  {/* Card A */}
                  <motion.div 
                    className={`relative rounded-xl p-4 border-2 transition-all ${
                      userVote?.vote_for === 'card_a' 
                        ? 'border-green-500 bg-green-500/10' 
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
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {war.card_a_votes || 0} votes
                        </span>
                        <span className="text-red-400 font-medium">{cardAPercent.toFixed(0)}%</span>
                      </div>
                      <Progress value={cardAPercent} className="h-2 bg-muted" />
                      
                      {(isPro || isShowcase) && (
                        <div className="text-xs text-center text-muted-foreground">
                          Pro pot: ${(war.card_a_pro_votes || 0).toFixed(2)}
                        </div>
                      )}
                    </div>

                    {!userVote && !isShowcase && (
                      <Button 
                        className="w-full mt-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                        onClick={() => vote(war.id, 'card_a', isPro)}
                      >
                        {isPro && <Sparkles className="w-4 h-4 mr-2" />}
                        Vote {war.card_a_name.split(' ')[0]}
                      </Button>
                    )}

                    {userVote?.vote_for === 'card_a' && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-green-500">
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

                  {/* Card B */}
                  <motion.div 
                    className={`relative rounded-xl p-4 border-2 transition-all ${
                      userVote?.vote_for === 'card_b' 
                        ? 'border-green-500 bg-green-500/10' 
                        : 'border-blue-500/50 bg-blue-500/5 hover:bg-blue-500/10'
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
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {war.card_b_votes || 0} votes
                        </span>
                        <span className="text-blue-400 font-medium">{cardBPercent.toFixed(0)}%</span>
                      </div>
                      <Progress value={cardBPercent} className="h-2 bg-muted" />
                      
                      {(isPro || isShowcase) && (
                        <div className="text-xs text-center text-muted-foreground">
                          Pro pot: ${(war.card_b_pro_votes || 0).toFixed(2)}
                        </div>
                      )}
                    </div>

                    {!userVote && !isShowcase && (
                      <Button 
                        className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                        onClick={() => vote(war.id, 'card_b', isPro)}
                      >
                        {isPro && <Sparkles className="w-4 h-4 mr-2" />}
                        Vote {war.card_b_name.split(' ')[0]}
                      </Button>
                    )}

                    {userVote?.vote_for === 'card_b' && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-green-500">
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
                    {isShowcase ? (
                      <span className="flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        Join CardBoom to participate in Card Wars and win real prizes!
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
    </section>
  );
};