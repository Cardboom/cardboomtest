import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Gift, Copy, Share2, Users, Coins, TrendingUp, 
  ArrowUpRight, Crown, Star, Zap, Trophy, Target,
  Megaphone, DollarSign, Repeat, ShoppingCart, Percent,
  CheckCircle, Rocket, Globe
} from 'lucide-react';
import { useReferralSystem } from '@/hooks/useReferralSystem';
import { useXP } from '@/hooks/useXP';
import { XPProgressBar } from '@/components/XPProgressBar';
import { formatDistanceToNow } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';

const TIER_COLORS: Record<string, string> = {
  bronze: 'from-amber-600 to-amber-800',
  silver: 'from-slate-400 to-slate-600',
  gold: 'from-yellow-400 to-yellow-600',
  platinum: 'from-cyan-400 to-cyan-600',
  diamond: 'from-purple-400 via-pink-500 to-purple-600'
};

const TIER_ICONS: Record<string, React.ReactNode> = {
  bronze: <Star className="w-5 h-5" />,
  silver: <Star className="w-5 h-5" />,
  gold: <Crown className="w-5 h-5" />,
  platinum: <Crown className="w-5 h-5" />,
  diamond: <Trophy className="w-5 h-5" />
};

const ReferralsPage = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [user, setUser] = useState<any>(null);
  const [inputCode, setInputCode] = useState('');
  const [activeTab, setActiveTab] = useState('ambassador');
  
  const {
    referralCode,
    referrals,
    totalReferrals,
    activeReferrals,
    pendingReferrals,
    totalCommissionEarned,
    totalDepositVolume,
    totalTradeVolume,
    tier,
    commissionRate,
    recentCommissions,
    loading,
    copyReferralCode,
    shareReferralLink,
    applyReferralCode,
    getTierInfo
  } = useReferralSystem();

  const { totalXP, level, xpToNextLevel, progressPercent, recentHistory } = useXP();

  const tierInfo = getTierInfo();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
    };
    checkAuth();
  }, [navigate]);

  const handleApplyCode = async () => {
    if (!inputCode.trim()) return;
    const success = await applyReferralCode(inputCode.trim());
    if (success) {
      setInputCode('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-mesh">
      <Header cartCount={0} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Hero Header */}
          <div className="text-center space-y-4">
            <Badge variant="outline" className="text-primary border-primary/30">
              <Megaphone className="w-3 h-3 mr-1" />
              Brand Ambassador Program
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              Earn While You <span className="text-primary">Share</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Become a CardBoom Ambassador. Earn up to 15% commission on every trade your referrals make.
            </p>
          </div>

          {/* How It Works - Ambassador Focus */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto mb-3 flex items-center justify-center">
                <Share2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">1. Share Your Link</h3>
              <p className="text-sm text-muted-foreground">Share your unique referral code with friends, followers, or community</p>
            </Card>
            <Card className="p-6 text-center bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 mx-auto mb-3 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-semibold mb-1">2. Friends Join</h3>
              <p className="text-sm text-muted-foreground">They sign up using your code and start trading collectibles</p>
            </Card>
            <Card className="p-6 text-center bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
              <div className="w-12 h-12 rounded-full bg-green-500/10 mx-auto mb-3 flex items-center justify-center">
                <Repeat className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="font-semibold mb-1">3. They Trade</h3>
              <p className="text-sm text-muted-foreground">Every buy & sell they make earns you commission automatically</p>
            </Card>
            <Card className="p-6 text-center bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 mx-auto mb-3 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="font-semibold mb-1">4. You Earn</h3>
              <p className="text-sm text-muted-foreground">Get paid 5-15% of their trading fees, forever!</p>
            </Card>
          </div>

          {/* XP & Level Card */}
          <XPProgressBar xp={totalXP} />

          {/* Referral Code & Tier Card */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Your Referral Code */}
            <Card className="overflow-hidden">
              <CardHeader className={`bg-gradient-to-r ${TIER_COLORS[tier]} text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {TIER_ICONS[tier]}
                    <CardTitle className="capitalize">{tier} Tier</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                    {(commissionRate * 100).toFixed(1)}% Commission
                  </Badge>
                </div>
                <CardDescription className="text-white/80">
                  Share your code and earn on every deposit & trade
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Referral Code</label>
                  <div className="flex gap-2">
                    <Input
                      value={referralCode || 'Loading...'}
                      readOnly
                      className="font-mono text-center text-lg font-bold"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 gap-2" onClick={copyReferralCode}>
                      <Copy className="h-4 w-4" />
                      Copy Code
                    </Button>
                    <Button variant="outline" className="flex-1 gap-2" onClick={shareReferralLink}>
                      <Share2 className="h-4 w-4" />
                      Copy URL
                    </Button>
                  </div>
                </div>

                {/* Tier Progress */}
                {tierInfo.nextTier && (
                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress to {tierInfo.nextTier}</span>
                      <span className="font-medium">{formatPrice(tierInfo.volumeToNextTier)} to go</span>
                    </div>
                    <Progress 
                      value={100 - (tierInfo.volumeToNextTier / (tierInfo.thresholds[tierInfo.nextTier as keyof typeof tierInfo.thresholds]?.minVolume || 1) * 100)}
                      className="h-2"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Apply Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  Have a Referral Code?
                </CardTitle>
                <CardDescription>
                  Apply a friend's code to get bonus rewards on your first deposit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter referral code..."
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                  <Button onClick={handleApplyCode}>Apply</Button>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-2">Benefits:</p>
                  <ul className="space-y-1">
                    <li>• 50 bonus XP on signup</li>
                    <li>• ₺50 bonus on first deposit over ₺500</li>
                    <li>• Help your referrer earn commissions!</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-3 text-primary" />
              <p className="text-3xl font-bold text-foreground">{totalReferrals}</p>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
            </Card>
            <Card className="p-6 text-center">
              <Zap className="h-8 w-8 mx-auto mb-3 text-primary" />
              <p className="text-3xl font-bold text-foreground">{activeReferrals}</p>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </Card>
            <Card className="p-6 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-3 text-blue-500" />
              <p className="text-3xl font-bold text-foreground">{formatPrice(totalDepositVolume + totalTradeVolume)}</p>
              <p className="text-sm text-muted-foreground">Total Volume</p>
            </Card>
            <Card className="p-6 text-center">
              <Coins className="h-8 w-8 mx-auto mb-3 text-gold" />
              <p className="text-3xl font-bold text-foreground">{formatPrice(totalCommissionEarned)}</p>
              <p className="text-sm text-muted-foreground">Earned</p>
            </Card>
          </div>

          {/* Tier Benefits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-gold" />
                Commission Tiers
              </CardTitle>
              <CardDescription>
                Earn higher commissions as your referral volume grows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(tierInfo.thresholds).map(([tierName, { minVolume, rate }]) => (
                  <div 
                    key={tierName}
                    className={`p-4 rounded-xl text-center transition-all ${
                      tier === tierName 
                        ? `bg-gradient-to-br ${TIER_COLORS[tierName]} text-white scale-105 shadow-lg` 
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className="mb-2">{TIER_ICONS[tierName]}</div>
                    <p className="font-bold capitalize">{tierName}</p>
                    <p className={`text-2xl font-bold ${tier === tierName ? 'text-white' : 'text-primary'}`}>
                      {(rate * 100).toFixed(1)}%
                    </p>
                    <p className={`text-xs ${tier === tierName ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {minVolume > 0 ? `${formatPrice(minVolume)}+ volume` : 'Starting tier'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ambassador Benefits Section */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                Ambassador Benefits
              </CardTitle>
              <CardDescription>
                Why become a CardBoom Ambassador?
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Passive Income</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Earn commission on every trade your referrals make. The more they trade, the more you earn - forever.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-500">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Growing Rates</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Start at 5% and grow to 15% commission as your network expands. Diamond ambassadors earn the most.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-500">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Instant Payouts</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Commissions are credited to your wallet instantly. No waiting periods, no minimum thresholds.
                  </p>
                </div>
              </div>

              {/* Example Earnings */}
              <div className="mt-8 p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  Example Earnings
                </h4>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 rounded-md bg-background">
                    <p className="text-muted-foreground mb-1">10 active referrals trading $500/month each</p>
                    <p className="text-xl font-bold text-green-500">$25 - $75/month</p>
                    <p className="text-xs text-muted-foreground">depending on your tier</p>
                  </div>
                  <div className="p-3 rounded-md bg-background">
                    <p className="text-muted-foreground mb-1">50 active referrals trading $1,000/month each</p>
                    <p className="text-xl font-bold text-green-500">$250 - $750/month</p>
                    <p className="text-xs text-muted-foreground">depending on your tier</p>
                  </div>
                  <div className="p-3 rounded-md bg-background">
                    <p className="text-muted-foreground mb-1">100 active referrals trading $2,000/month each</p>
                    <p className="text-xl font-bold text-green-500">$1,000 - $3,000/month</p>
                    <p className="text-xs text-muted-foreground">depending on your tier</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for History */}
          <Tabs defaultValue="referrals" className="space-y-4">
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="referrals">My Referrals</TabsTrigger>
              <TabsTrigger value="commissions">Commission History</TabsTrigger>
              <TabsTrigger value="xp">XP History</TabsTrigger>
            </TabsList>

            <TabsContent value="referrals">
              <Card>
                <CardContent className="p-0">
                  {referrals.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No referrals yet</p>
                      <p className="text-sm mt-1">Share your code to start earning!</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {referrals.map((referral) => (
                        <div key={referral.id} className="flex items-center justify-between p-4 hover:bg-muted/30">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">Referral #{referral.id.slice(0, 8)}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(referral.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={
                              referral.status === 'rewarded' ? 'default' :
                              referral.status === 'completed' ? 'secondary' : 'outline'
                            }>
                              {referral.status}
                            </Badge>
                            {(referral.referred_deposit_total > 0 || referral.referred_trade_volume > 0) && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Vol: {formatPrice(Number(referral.referred_deposit_total) + Number(referral.referred_trade_volume))}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commissions">
              <Card>
                <CardContent className="p-0">
                  {recentCommissions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No commissions yet</p>
                      <p className="text-sm mt-1">Your referrals' activity will show here</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {recentCommissions.map((commission) => (
                        <div key={commission.id} className="flex items-center justify-between p-4 hover:bg-muted/30">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                              <ArrowUpRight className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                              <p className="font-medium capitalize">{commission.event_type}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(commission.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-500">
                              +{formatPrice(commission.commission_amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(commission.commission_rate * 100).toFixed(1)}% of {formatPrice(commission.source_amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="xp">
              <Card>
                <CardContent className="p-0">
                  {recentHistory.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No XP history yet</p>
                      <p className="text-sm mt-1">Trade and engage to earn XP!</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {recentHistory.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 hover:bg-muted/30">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Zap className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium capitalize">{item.action.replace('_', ' ')}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.description || formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <p className="font-bold text-primary">+{item.xp_earned} XP</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ReferralsPage;
