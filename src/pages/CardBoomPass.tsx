import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, Gem, Clock, Star, Zap, Shield, ChevronRight, 
  Lock, Check, Gift, Sparkles, TrendingUp, Award
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useCardboomPass, PassTier } from '@/hooks/useCardboomPass';
import { useCardboomPoints } from '@/hooks/useCardboomPoints';
import { cn } from '@/lib/utils';

const SeasonCountdown = ({ timeRemaining }: { timeRemaining: { days: number; hours: number; minutes: number; seconds: number } }) => {
  const [time, setTime] = useState(timeRemaining);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(prev => {
        let { days, hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; days--; }
        if (days < 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        return { days, hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex gap-2">
      {[
        { label: 'Days', value: time.days },
        { label: 'Hours', value: time.hours },
        { label: 'Min', value: time.minutes },
        { label: 'Sec', value: time.seconds }
      ].map((unit) => (
        <div key={unit.label} className="text-center">
          <div className="bg-background/50 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 min-w-[50px]">
            <span className="text-xl font-bold text-foreground">{String(unit.value).padStart(2, '0')}</span>
          </div>
          <span className="text-xs text-muted-foreground mt-1">{unit.label}</span>
        </div>
      ))}
    </div>
  );
};

const TierRewardIcon = ({ type }: { type: string | null }) => {
  switch (type) {
    case 'gems': return <Gem className="w-4 h-4 text-sky-400" />;
    case 'discount_cap': return <TrendingUp className="w-4 h-4 text-green-400" />;
    case 'cosmetic': return <Sparkles className="w-4 h-4 text-purple-400" />;
    case 'badge': return <Award className="w-4 h-4 text-amber-400" />;
    case 'priority': return <Zap className="w-4 h-4 text-orange-400" />;
    default: return <Gift className="w-4 h-4 text-muted-foreground" />;
  }
};

const TierCard = ({ 
  tier, 
  currentTier, 
  isPro, 
  claimedTiers,
  cumulativeXp
}: { 
  tier: PassTier; 
  currentTier: number; 
  isPro: boolean; 
  claimedTiers: number[];
  cumulativeXp: number;
}) => {
  const isUnlocked = tier.tier_number <= currentTier;
  const isClaimed = claimedTiers.includes(tier.tier_number);
  const isMilestone = tier.tier_number % 5 === 0;
  const isFinalTier = tier.tier_number === 30;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: tier.tier_number * 0.02 }}
      className={cn(
        "relative rounded-xl border p-4 transition-all",
        isUnlocked 
          ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30" 
          : "bg-card/50 border-border/50",
        isMilestone && "ring-2 ring-amber-500/30",
        isFinalTier && "ring-2 ring-purple-500/50"
      )}
    >
      {/* Tier Number Badge */}
      <div className={cn(
        "absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
        isUnlocked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        isFinalTier && !isUnlocked && "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
      )}>
        {tier.tier_number}
      </div>

      {/* XP Required */}
      <div className="text-right mb-3">
        <div className="text-xs font-medium text-foreground">+{tier.xp_required.toLocaleString()} XP</div>
        <div className="text-[10px] text-muted-foreground">{cumulativeXp.toLocaleString()} total</div>
      </div>

      {/* Free Track */}
      <div className={cn(
        "p-3 rounded-lg mb-2",
        tier.free_reward_type 
          ? isUnlocked ? "bg-background/80" : "bg-background/40"
          : "bg-background/20 opacity-50"
      )}>
        <div className="flex items-center gap-2">
          {tier.free_reward_type ? (
            <>
              <TierRewardIcon type={tier.free_reward_type} />
              <span className="text-sm">
                {tier.free_reward_type === 'gems' && `${tier.free_reward_value?.amount} Gems`}
                {tier.free_reward_type === 'badge' && tier.free_reward_value?.name}
                {tier.free_reward_type === 'cosmetic' && 'Cosmetic'}
                {tier.free_reward_type === 'discount_cap' && `${tier.free_reward_value?.percent}% Discount`}
                {tier.free_reward_type === 'priority' && 'Priority Perk'}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
          {isUnlocked && tier.free_reward_type && (
            <Check className="w-4 h-4 text-green-500 ml-auto" />
          )}
        </div>
      </div>

      {/* Pro Track */}
      <div className={cn(
        "p-3 rounded-lg border",
        isPro 
          ? isUnlocked 
            ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30" 
            : "bg-amber-500/10 border-amber-500/20"
          : "bg-muted/30 border-border/30"
      )}>
        <div className="flex items-center gap-2">
          {!isPro && <Lock className="w-3 h-3 text-muted-foreground" />}
          {tier.pro_reward_type ? (
            <>
              <TierRewardIcon type={tier.pro_reward_type} />
              <span className={cn("text-sm", !isPro && "text-muted-foreground")}>
                {tier.pro_reward_type === 'gems' && `${tier.pro_reward_value?.amount} Gems`}
                {tier.pro_reward_type === 'badge' && tier.pro_reward_value?.name}
                {tier.pro_reward_type === 'cosmetic' && tier.pro_reward_value?.type}
                {tier.pro_reward_type === 'discount_cap' && `${tier.pro_reward_value?.percent}% Discount`}
                {tier.pro_reward_type === 'priority' && 'Priority Perk'}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
          {isUnlocked && isPro && tier.pro_reward_type && (
            <Check className="w-4 h-4 text-green-500 ml-auto" />
          )}
        </div>
        {!isPro && (
          <Badge variant="outline" className="mt-2 text-[10px] border-amber-500/30 text-amber-400">
            PRO
          </Badge>
        )}
      </div>
    </motion.div>
  );
};

const CardBoomPass = () => {
  const [userId, setUserId] = useState<string | undefined>();
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id);
    });
  }, []);

  const { 
    season, 
    tiers, 
    progress, 
    loading, 
    purchaseProPass, 
    getProgressToNextTier,
    getSeasonTimeRemaining,
    getTotalXpRequired
  } = useCardboomPass(userId);
  
  const { balance } = useCardboomPoints(userId);
  const progressToNext = getProgressToNextTier();
  const timeRemaining = getSeasonTimeRemaining();
  const totalXpRequired = getTotalXpRequired();

  const handlePurchasePro = async () => {
    setPurchasing(true);
    await purchaseProPass();
    setPurchasing(false);
  };

  const freeVsProComparison = [
    { feature: 'Gem Earning Rate', free: '0.2% (base)', pro: '0.25% (1.25×)' },
    { feature: 'Tier Rewards', free: 'Free track only', pro: 'Free + Pro track' },
    { feature: 'Exclusive Cosmetics', free: '—', pro: '✓ All seasons' },
    { feature: 'Priority Support', free: '—', pro: '✓ Faster response' },
    { feature: 'Checkout Discounts', free: 'Up to 3%', pro: 'Up to 7%' },
    { feature: 'Profile Badges', free: 'Basic', pro: 'Exclusive Pro badges' },
    { feature: 'Listing Boost', free: '—', pro: '✓ Priority placement' },
  ];

  return (
    <>
      <Helmet>
        <title>CardBoom Pass | Season Rewards</title>
        <meta name="description" content="Earn exclusive rewards, gem multipliers, and cosmetics with CardBoom Pass." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />

        <main className="container mx-auto px-4 pt-24 pb-16">
          {/* Hero Section */}
          <section className="relative mb-12">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-amber-500/20 rounded-3xl blur-3xl opacity-50" />
            <div className="relative bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl md:text-4xl font-bold">CardBoom Pass</h1>
                      <p className="text-muted-foreground">{season?.name || 'Loading...'}</p>
                    </div>
                  </div>
                  <p className="text-lg text-muted-foreground max-w-xl">
                    Earn rewards through real transactions. Progress through 30 tiers and unlock exclusive perks.
                  </p>
                </div>

                <div className="flex flex-col items-end gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Season ends in</span>
                  </div>
                  <SeasonCountdown timeRemaining={timeRemaining} />
                </div>
              </div>

              {/* Current Progress */}
              {userId && (
                <div className="mt-8 p-6 bg-background/50 rounded-2xl border border-border/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-primary">{progress?.current_tier || 0}</div>
                        <div className="text-xs text-muted-foreground">Current Tier</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      <div className="text-center">
                        <div className="text-2xl font-medium text-muted-foreground">{(progress?.current_tier || 0) + 1}</div>
                        <div className="text-xs text-muted-foreground">Next Tier</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-sky-500/10 border border-sky-500/20">
                        <Gem className="w-4 h-4 text-sky-400" />
                        <span className="font-medium text-sky-400">{balance.toLocaleString()}</span>
                      </div>
                      {progress?.is_pro && (
                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                          <Crown className="w-3 h-3 mr-1" /> PRO
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress to Tier {(progress?.current_tier || 0) + 1}</span>
                      <span className="font-medium">{progressToNext.current.toLocaleString()} / {progressToNext.required.toLocaleString()} XP</span>
                    </div>
                    <Progress value={progressToNext.percent} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Total XP: {progressToNext.totalXp?.toLocaleString() || 0} / {totalXpRequired.toLocaleString()}</span>
                      <span>$1 = 1 XP • Grading = 500 XP</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Pro Upgrade CTA */}
          {userId && !progress?.is_pro && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
                        <Crown className="w-10 h-10 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold flex items-center gap-2">
                          Upgrade to Pro
                          <Badge variant="outline" className="border-amber-500/50 text-amber-400">$10/season</Badge>
                        </h3>
                        <p className="text-muted-foreground">
                          Earn 25% more gems, unlock exclusive rewards, and get priority perks
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="lg" 
                      onClick={handlePurchasePro}
                      disabled={purchasing}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20"
                    >
                      {purchasing ? 'Processing...' : 'Get Pro Pass'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          )}

          {/* Tabs */}
          <Tabs defaultValue="tiers" className="space-y-8">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="tiers">Tier Rewards</TabsTrigger>
              <TabsTrigger value="compare">Free vs Pro</TabsTrigger>
            </TabsList>

            <TabsContent value="tiers">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {tiers.map((tier, index) => {
                  // Calculate cumulative XP for this tier
                  const cumulativeXp = tiers
                    .slice(0, index + 1)
                    .reduce((sum, t) => sum + t.xp_required, 0);
                  
                  return (
                    <TierCard
                      key={tier.id}
                      tier={tier}
                      currentTier={progress?.current_tier || 0}
                      isPro={progress?.is_pro || false}
                      claimedTiers={progress?.claimed_tiers || []}
                      cumulativeXp={cumulativeXp}
                    />
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="compare">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400" />
                    Free vs Pro Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-4 px-4 font-medium">Feature</th>
                          <th className="text-center py-4 px-4 font-medium">Free</th>
                          <th className="text-center py-4 px-4 font-medium">
                            <span className="flex items-center justify-center gap-1">
                              <Crown className="w-4 h-4 text-amber-400" />
                              Pro
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {freeVsProComparison.map((row, i) => (
                          <tr key={row.feature} className={cn(i % 2 === 0 && "bg-muted/30")}>
                            <td className="py-4 px-4 font-medium">{row.feature}</td>
                            <td className="py-4 px-4 text-center text-muted-foreground">{row.free}</td>
                            <td className="py-4 px-4 text-center text-amber-400">{row.pro}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* How It Works */}
          <section className="mt-16">
            <h2 className="text-2xl font-bold mb-8 text-center">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { 
                  icon: TrendingUp, 
                  title: 'Earn XP Through Activity', 
                  description: 'Top-ups, purchases, and sales: $1 = 1 XP. Grading requests: 500 XP flat. Real activity drives progress.' 
                },
                { 
                  icon: Gem, 
                  title: 'Collect Gems & Rewards', 
                  description: 'Unlock gem bonuses, cosmetics, and perks at each tier. Pro users get exclusive rewards on a parallel track.' 
                },
                { 
                  icon: Shield, 
                  title: 'Use Gems for Discounts', 
                  description: 'Redeem gems for checkout discounts and platform benefits. Gems are non-withdrawable but valuable for savings.' 
                }
              ].map((item) => (
                <Card key={item.title} className="text-center">
                  <CardContent className="pt-8 pb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <item.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CardBoomPass;
