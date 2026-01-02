import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Swords, Trophy, Clock, Crown, Sparkles, Flame, 
  Gem, TrendingUp, History, Users, Gift, Zap, Star,
  ChevronRight, ArrowRight, Info, Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCardWars, CardWar } from "@/hooks/useCardWars";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface CompletedWar extends CardWar {
  total_votes?: number;
  total_pro_pool?: number;
}

const CardWars = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [completedWars, setCompletedWars] = useState<CompletedWar[]>([]);
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const { activeWars, userVotes, loading, vote, refetch } = useCardWars(userId || undefined);

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
    };
    getUser();
  }, []);

  useEffect(() => {
    fetchCompletedWars();
    if (userId) {
      fetchUserHistory();
    }
  }, [userId]);

  const fetchCompletedWars = async () => {
    const { data } = await supabase
      .from('card_wars')
      .select('*')
      .eq('status', 'completed')
      .order('ends_at', { ascending: false })
      .limit(20);
    
    if (data) {
      // Get vote counts for each war
      const warsWithVotes = await Promise.all(
        data.map(async (war) => {
          const { data: votes } = await supabase
            .from('card_war_votes')
            .select('vote_for, is_pro_vote, vote_value')
            .eq('card_war_id', war.id);
          
          return {
            ...war,
            total_votes: votes?.length || 0,
            total_pro_pool: votes?.filter(v => v.is_pro_vote).reduce((sum, v) => sum + Number(v.vote_value), 0) || 0,
            card_a_votes: votes?.filter(v => v.vote_for === 'card_a').length || 0,
            card_b_votes: votes?.filter(v => v.vote_for === 'card_b').length || 0,
          };
        })
      );
      setCompletedWars(warsWithVotes);
    }
    setLoadingHistory(false);
  };

  const fetchUserHistory = async () => {
    if (!userId) return;
    
    const { data } = await supabase
      .from('card_war_votes')
      .select(`
        *,
        card_wars (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    setUserHistory(data || []);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header cartCount={0} onCartClick={() => {}} />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 md:py-24">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-transparent" />
          <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-orange-500/20 blur-[100px] animate-pulse" />
          <div className="absolute bottom-20 left-20 w-64 h-64 rounded-full bg-red-500/20 blur-[80px] animate-pulse" />
          
          <div className="container mx-auto px-4 relative z-10">
            <motion.div 
              className="max-w-4xl mx-auto text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/20 border border-orange-500/30 mb-6"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
              >
                <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
                <span className="text-orange-400 font-semibold">Daily Card Battles</span>
              </motion.div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-400 via-red-400 to-orange-400 text-transparent bg-clip-text">
                Card Wars Arena
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Vote for your champion in epic card battles. Pro members compete for real prizes 
                and earn <span className="text-primary font-semibold">Cardboom Points</span> from prize pool shares.
              </p>

              {/* Pro Benefits Callout */}
              <motion.div 
                className="inline-block p-6 rounded-2xl bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 border border-yellow-500/30 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center justify-center gap-3 mb-3">
                  <Crown className="w-6 h-6 text-yellow-500" />
                  <h3 className="text-lg font-bold text-yellow-400">Pro Member Exclusive</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Pro subscribers receive <span className="text-primary font-bold">$2.50 worth of Cardboom Points</span> monthly 
                  to use in Card Wars — completely free with your subscription!
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Gem className="w-4 h-4 text-primary" />
                    <span>250 Points/Month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span>Share Prize Pools</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-emerald-500" />
                    <span>Use for Purchases</span>
                  </div>
                </div>
              </motion.div>

              <div className="flex flex-wrap items-center justify-center gap-4">
                {!userId ? (
                  <>
                    <Button 
                      size="lg"
                      onClick={() => navigate('/auth')}
                      className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      Join to Battle
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                    <Button 
                      size="lg"
                      variant="outline"
                      onClick={() => navigate('/pricing')}
                    >
                      See Pro Benefits
                    </Button>
                  </>
                ) : !isPro ? (
                  <Button 
                    size="lg"
                    onClick={() => navigate('/pricing')}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                  >
                    <Crown className="w-5 h-5 mr-2" />
                    Upgrade to Pro
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-lg px-6 py-2 border-yellow-500/50 text-yellow-500">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Pro Member Active
                  </Badge>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 border-t border-border/50">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-12">How Card Wars Works</h2>
            
            <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                { icon: Swords, title: "Daily Battles", desc: "New card matchups every day featuring iconic collectibles" },
                { icon: Users, title: "Community Votes", desc: "Everyone votes! Pick your champion in epic battles" },
                { icon: Gem, title: "Pro Stakes", desc: "Pro members stake $2.50 worth of points per vote" },
                { icon: Trophy, title: "Winners Share", desc: "Winning voters share the prize pool proportionally" }
              ].map((step, i) => (
                <motion.div 
                  key={i}
                  className="text-center p-6 rounded-xl bg-card border border-border/50"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center mx-auto mb-4">
                    <step.icon className="w-7 h-7 text-orange-500" />
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Main Content Tabs */}
        <section className="py-8 container mx-auto px-4">
          <Tabs defaultValue="active" className="max-w-5xl mx-auto">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Flame className="w-4 h-4" />
                Active Battles
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Past Winners
              </TabsTrigger>
              <TabsTrigger value="my-votes" className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                My Participation
              </TabsTrigger>
            </TabsList>

            {/* Active Battles */}
            <TabsContent value="active">
              {loading ? (
                <div className="grid gap-6">
                  {[1, 2].map(i => (
                    <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : activeWars.length === 0 ? (
                <Card className="text-center py-16">
                  <CardContent>
                    <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Active Battles</h3>
                    <p className="text-muted-foreground mb-6">Check back soon for the next epic card showdown!</p>
                    <Button variant="outline" onClick={refetch}>
                      Refresh
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {activeWars.map((war) => {
                    const userVote = userVotes[war.id];
                    const totalVotes = (war.card_a_votes || 0) + (war.card_b_votes || 0);
                    const cardAPercent = totalVotes > 0 ? ((war.card_a_votes || 0) / totalVotes) * 100 : 50;
                    const endsIn = formatDistanceToNow(new Date(war.ends_at), { addSuffix: true });

                    return (
                      <motion.div 
                        key={war.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Card className="overflow-hidden border-orange-500/30 bg-gradient-to-br from-background to-orange-950/10">
                          <CardContent className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                              <Badge variant="outline" className="border-orange-500/50 text-orange-500">
                                <Flame className="w-3 h-3 mr-1 animate-pulse" />
                                LIVE BATTLE
                              </Badge>
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">
                                  <Trophy className="w-3 h-3 mr-1" />
                                  ${war.prize_pool} Prize Pool
                                </Badge>
                                <Badge variant="secondary">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {endsIn}
                                </Badge>
                              </div>
                            </div>

                            {/* Battle Cards */}
                            <div className="grid grid-cols-[1fr,auto,1fr] gap-6 items-center">
                              {/* Card A */}
                              <div 
                                className={cn(
                                  "relative p-4 rounded-xl border-2 transition-all cursor-pointer",
                                  userVote?.vote_for === 'card_a' 
                                    ? "border-red-500 bg-red-500/20 ring-2 ring-red-500/50"
                                    : "border-red-500/30 hover:border-red-500/60 bg-red-500/5"
                                )}
                                onClick={() => !userVote && userId && vote(war.id, 'card_a', isPro)}
                              >
                                {war.card_a_image && (
                                  <img 
                                    src={war.card_a_image} 
                                    alt={war.card_a_name}
                                    className="w-full max-w-[200px] mx-auto aspect-[3/4] object-cover rounded-lg mb-4"
                                  />
                                )}
                                <h3 className="font-bold text-center mb-2">{war.card_a_name}</h3>
                                <div className="text-center space-y-1">
                                  <div className="text-2xl font-bold text-red-400">{war.card_a_votes || 0}</div>
                                  <div className="text-xs text-muted-foreground">votes</div>
                                  {isPro && (
                                    <div className="text-xs text-yellow-500">
                                      Pro Pool: ${(war.card_a_pro_votes || 0).toFixed(2)}
                                    </div>
                                  )}
                                </div>
                                {!userVote && userId && (
                                  <Button 
                                    className="w-full mt-4 bg-red-500 hover:bg-red-600"
                                    onClick={(e) => { e.stopPropagation(); vote(war.id, 'card_a', isPro); }}
                                  >
                                    Vote Red
                                  </Button>
                                )}
                                {userVote?.vote_for === 'card_a' && (
                                  <Badge className="absolute top-2 right-2 bg-red-500">
                                    <Crown className="w-3 h-3 mr-1" />
                                    Your Pick
                                  </Badge>
                                )}
                              </div>

                              {/* VS */}
                              <div className="text-center">
                                <motion.div
                                  className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-500"
                                  animate={{ scale: [1, 1.1, 1] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                >
                                  VS
                                </motion.div>
                                <Swords className="w-8 h-8 mx-auto mt-2 text-orange-500" />
                              </div>

                              {/* Card B */}
                              <div 
                                className={cn(
                                  "relative p-4 rounded-xl border-2 transition-all cursor-pointer",
                                  userVote?.vote_for === 'card_b' 
                                    ? "border-emerald-500 bg-emerald-500/20 ring-2 ring-emerald-500/50"
                                    : "border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/5"
                                )}
                                onClick={() => !userVote && userId && vote(war.id, 'card_b', isPro)}
                              >
                                {war.card_b_image && (
                                  <img 
                                    src={war.card_b_image} 
                                    alt={war.card_b_name}
                                    className="w-full max-w-[200px] mx-auto aspect-[3/4] object-cover rounded-lg mb-4"
                                  />
                                )}
                                <h3 className="font-bold text-center mb-2">{war.card_b_name}</h3>
                                <div className="text-center space-y-1">
                                  <div className="text-2xl font-bold text-emerald-400">{war.card_b_votes || 0}</div>
                                  <div className="text-xs text-muted-foreground">votes</div>
                                  {isPro && (
                                    <div className="text-xs text-yellow-500">
                                      Pro Pool: ${(war.card_b_pro_votes || 0).toFixed(2)}
                                    </div>
                                  )}
                                </div>
                                {!userVote && userId && (
                                  <Button 
                                    className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600"
                                    onClick={(e) => { e.stopPropagation(); vote(war.id, 'card_b', isPro); }}
                                  >
                                    Vote Green
                                  </Button>
                                )}
                                {userVote?.vote_for === 'card_b' && (
                                  <Badge className="absolute top-2 right-2 bg-emerald-500">
                                    <Crown className="w-3 h-3 mr-1" />
                                    Your Pick
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Vote Bar */}
                            <div className="mt-6">
                              <div className="relative h-4 rounded-full overflow-hidden bg-muted/30">
                                <motion.div
                                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 to-red-400"
                                  initial={{ width: '50%' }}
                                  animate={{ width: `${cardAPercent}%` }}
                                  transition={{ type: 'spring', stiffness: 100 }}
                                />
                              </div>
                              <div className="flex justify-between mt-2 text-sm">
                                <span className="text-red-400">{cardAPercent.toFixed(1)}%</span>
                                <span className="text-emerald-400">{(100 - cardAPercent).toFixed(1)}%</span>
                              </div>
                            </div>

                            {/* Pro Message */}
                            {userId && !isPro && (
                              <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                                <p className="text-sm text-yellow-400">
                                  <Crown className="w-4 h-4 inline mr-1" />
                                  Pro members get $2.50 in free Cardboom Points monthly to compete for prizes!
                                  <Button variant="link" className="text-yellow-400 px-2" onClick={() => navigate('/pricing')}>
                                    Upgrade Now →
                                  </Button>
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Past Winners */}
            <TabsContent value="history">
              {loadingHistory ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : completedWars.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No completed battles yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {completedWars.map((war, index) => (
                    <motion.div
                      key={war.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {/* Winner Card */}
                            <div className="relative">
                              <img 
                                src={war.winner === 'card_a' ? war.card_a_image : war.card_b_image}
                                alt="Winner"
                                className="w-20 h-28 object-cover rounded-lg border-2 border-yellow-500"
                              />
                              <div className="absolute -top-2 -right-2 p-1 rounded-full bg-yellow-500">
                                <Trophy className="w-4 h-4 text-yellow-900" />
                              </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-500">
                                  <Trophy className="w-3 h-3 mr-1" />
                                  Winner
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(war.ends_at), 'MMM d, yyyy')}
                                </span>
                              </div>
                              <h3 className="font-semibold truncate">
                                {war.winner === 'card_a' ? war.card_a_name : war.card_b_name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                vs {war.winner === 'card_a' ? war.card_b_name : war.card_a_name}
                              </p>
                            </div>

                            {/* Stats */}
                            <div className="text-right space-y-1">
                              <div className="text-lg font-bold text-yellow-500">${war.prize_pool}</div>
                              <div className="text-xs text-muted-foreground">
                                {war.total_votes} votes • ${war.total_pro_pool?.toFixed(2)} pro pool
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* My Participation */}
            <TabsContent value="my-votes">
              {!userId ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">Sign in to see your Card Wars history</p>
                    <Button onClick={() => navigate('/auth')}>Sign In</Button>
                  </CardContent>
                </Card>
              ) : userHistory.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">You haven't participated in any Card Wars yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {userHistory.map((vote, index) => {
                    const war = vote.card_wars;
                    if (!war) return null;
                    
                    const didWin = war.status === 'completed' && war.winner === vote.vote_for;
                    const isPending = war.status === 'active';

                    return (
                      <motion.div
                        key={vote.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className={cn(
                          "overflow-hidden",
                          didWin && "border-yellow-500/50",
                          isPending && "border-orange-500/30"
                        )}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              {/* Your Pick */}
                              <div className="relative">
                                <img 
                                  src={vote.vote_for === 'card_a' ? war.card_a_image : war.card_b_image}
                                  alt="Your pick"
                                  className={cn(
                                    "w-16 h-22 object-cover rounded-lg border-2",
                                    didWin ? "border-yellow-500" : isPending ? "border-orange-500" : "border-muted"
                                  )}
                                />
                                {didWin && (
                                  <div className="absolute -top-2 -right-2 p-1 rounded-full bg-yellow-500">
                                    <Trophy className="w-3 h-3 text-yellow-900" />
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {isPending ? (
                                    <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-500">
                                      <Flame className="w-3 h-3 mr-1 animate-pulse" />
                                      Active
                                    </Badge>
                                  ) : didWin ? (
                                    <Badge className="text-xs bg-yellow-500 text-yellow-900">
                                      <Trophy className="w-3 h-3 mr-1" />
                                      Winner!
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">
                                      Lost
                                    </Badge>
                                  )}
                                  {vote.is_pro_vote && (
                                    <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      Pro Vote
                                    </Badge>
                                  )}
                                </div>
                                <p className="font-medium">
                                  {vote.vote_for === 'card_a' ? war.card_a_name : war.card_b_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(vote.created_at), 'MMM d, yyyy')}
                                </p>
                              </div>

                              {/* Payout */}
                              {vote.is_pro_vote && (
                                <div className="text-right">
                                  <div className="text-sm font-medium">
                                    {vote.payout_amount ? (
                                      <span className="text-yellow-500">
                                        +${vote.payout_amount.toFixed(2)}
                                      </span>
                                    ) : isPending ? (
                                      <span className="text-muted-foreground">Pending</span>
                                    ) : (
                                      <span className="text-muted-foreground">$0.00</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Staked: ${vote.vote_value?.toFixed(2)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>

        {/* Pro Benefits CTA */}
        {!isPro && (
          <section className="py-16 border-t border-border/50">
            <div className="container mx-auto px-4">
              <Card className="max-w-3xl mx-auto overflow-hidden bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 border-yellow-500/30">
                <CardContent className="p-8 text-center">
                  <Crown className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
                  <h2 className="text-2xl font-bold mb-3">Unlock Pro Card Wars Benefits</h2>
                  <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                    Pro members receive <span className="text-primary font-bold">$2.50 equivalent in Cardboom Points</span> every month 
                    to participate in Card Wars. Winners share the prize pool and points can be used for marketplace purchases!
                  </p>
                  <div className="flex flex-wrap justify-center gap-6 mb-6">
                    <div className="flex items-center gap-2">
                      <Gem className="w-5 h-5 text-primary" />
                      <span>250 Points Monthly</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      <span>Share $100 Prize Pools</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-emerald-500" />
                      <span>Use Points for Purchases</span>
                    </div>
                  </div>
                  <Button 
                    size="lg"
                    onClick={() => navigate('/pricing')}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                  >
                    <Crown className="w-5 h-5 mr-2" />
                    Upgrade to Pro — $9.99/mo
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CardWars;
