import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Building2, TrendingUp, PieChart, BarChart3, Shield, Headphones, Rocket, Percent, CreditCard, Banknote, Clock, Award, ShieldCheck, Sparkles, Timer, Package } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

const Pricing = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [processing, setProcessing] = useState<string | null>(null);

  const { subscription, isPro, subscribe, loading } = useSubscription(userId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id);
    });
  }, []);

  const currentTier = subscription?.tier || 'free';

  const handleSubscribe = async (tier: 'lite' | 'pro' | 'enterprise') => {
    if (!userId) {
      toast.error('Please sign in to subscribe');
      navigate('/auth');
      return;
    }

    setProcessing(tier);
    try {
      const prices = { lite: 9.99, pro: 25, enterprise: 50 };
      const price = prices[tier];
      
      // Get user's wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (walletError) throw walletError;

      if (Number(wallet.balance) < price) {
        toast.error(`Insufficient balance. You need $${price} for ${tier === 'pro' ? 'Pro' : 'Enterprise'} subscription.`);
        navigate('/wallet');
        return;
      }

      // Deduct from wallet
      const newBalance = Number(wallet.balance) - price;
      const { error: deductError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', wallet.id);

      if (deductError) throw deductError;

      // Create transaction record
      const tierLabels = { lite: 'Lite', pro: 'Pro', enterprise: 'Enterprise' };
      await supabase
        .from('transactions')
        .insert({
          wallet_id: wallet.id,
          type: 'withdrawal',
          amount: -price,
          description: `${tierLabels[tier]} Subscription - Monthly`,
        });

      // Calculate expiry (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Create or update subscription
      const { data: existingSub } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingSub) {
        await supabase
          .from('user_subscriptions')
          .update({
            tier,
            price_monthly: price,
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            auto_renew: true,
          })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            tier,
            price_monthly: price,
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            auto_renew: true,
          });
      }

      toast.success(`Welcome to ${tierLabels[tier]}! Enjoy your premium features.`);
      toast.success(`Welcome to ${tierLabels[tier]}! Enjoy your premium features.`);
      navigate('/profile');
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || 'Failed to subscribe');
    } finally {
      setProcessing(null);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started',
      icon: Zap,
      popular: false,
      tier: 'free' as const,
      fees: {
        seller: '13.25%',
        sellerOver: '2.35%',
        gemsMarkup: '12%',
      },
      features: [
        'Browse marketplace',
        'Buy & sell cards',
        'Basic portfolio tracking',
        'Community access',
        'Standard support',
      ],
      notIncluded: [
        'PnL Graph & Analytics',
        'Reduced fees',
        'API access',
        'Priority support',
      ],
    },
    {
      name: 'Lite',
      price: '$9.99',
      period: '/month',
      description: 'Lower fees, more value',
      icon: TrendingUp,
      popular: false,
      tier: 'lite' as const,
      fees: {
        seller: '10%',
        sellerOver: '2%',
        gemsMarkup: '10%',
      },
      features: [
        'Everything in Free',
        'Reduced transaction fees',
        'Lower Gems markup',
        'Lite badge on profile',
        'Standard support',
      ],
      savings: 'Save ~$30/month on fees',
    },
    {
      name: 'Pro',
      price: '$25',
      period: '/month',
      description: 'For serious collectors',
      icon: Crown,
      popular: true,
      tier: 'pro' as const,
      fees: {
        seller: '8%',
        sellerOver: '1.5%',
        gemsMarkup: '8%',
      },
      features: [
        'Everything in Lite',
        'PnL Graph & Analytics',
        'Portfolio performance tracking',
        'Price alerts (unlimited)',
        'Pro badge on profile',
        'Priority customer support',
        'Early access to features',
      ],
      savings: 'Save ~$75/month on fees',
    },
    {
      name: 'Enterprise',
      price: '$50',
      period: '/month',
      description: 'For power sellers',
      icon: Building2,
      popular: false,
      tier: 'enterprise' as const,
      fees: {
        seller: '4%',
        sellerOver: '1%',
        gemsMarkup: '5%',
      },
      features: [
        'Everything in Pro',
        'Lowest transaction fees (4%)',
        'Advanced analytics dashboard',
        'API access (coming soon)',
        'Bulk listing tools',
        'Dedicated account manager',
        'Custom reports',
        'Enterprise badge',
      ],
      savings: 'Save ~$200/month on fees',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={cartItems.length} onCartClick={() => setCartOpen(true)} />
      
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 text-primary border-primary/30">
            <Rocket className="w-3 h-3 mr-1" />
            Upgrade Your Trading
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your <span className="text-primary">Plan</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Unlock powerful features, reduce fees, and take your collecting to the next level
          </p>
        </div>

        {/* Current Plan Banner */}
        {userId && currentTier !== 'free' && (
          <div className="mb-8 p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <p className="text-sm">
              You're currently on the <span className="font-bold text-primary capitalize">{currentTier}</span> plan
              {subscription?.expires_at && (
                <span className="text-muted-foreground">
                  {' '}· Renews on {new Date(subscription.expires_at).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentTier === plan.tier;
            const isDowngrade = (currentTier === 'enterprise' && plan.tier !== 'enterprise') ||
                               (currentTier === 'pro' && plan.tier === 'free');

            return (
              <Card 
                key={plan.name} 
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                  plan.popular ? 'border-primary shadow-lg scale-[1.02]' : 'border-border/50'
                } ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute top-0 left-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-br-lg">
                    CURRENT PLAN
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                    plan.tier === 'enterprise' ? 'bg-amber-500/10' : 
                    plan.tier === 'pro' ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      plan.tier === 'enterprise' ? 'text-amber-500' : 
                      plan.tier === 'pro' ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>

                  {/* Fee Comparison */}
                  <div className="bg-muted/50 rounded-lg p-4 mb-6">
                    <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Seller Fees</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Up to $7,500</span>
                        <Badge variant="outline" className="font-semibold">{plan.fees.seller}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Over $7,500</span>
                        <Badge variant="secondary" className="font-semibold">{plan.fees.sellerOver}</Badge>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <span className="text-muted-foreground">Gems Markup</span>
                        <Badge variant="outline" className="font-semibold">{plan.fees.gemsMarkup}</Badge>
                      </div>
                    </div>
                  </div>

                  {'savings' in plan && plan.savings && (
                    <div className="mb-4 text-sm font-medium text-green-600 dark:text-green-400">
                      💰 {plan.savings}
                    </div>
                  )}

                  <ul className="space-y-2 text-left mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {'notIncluded' in plan && plan.notIncluded?.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="w-4 h-4 mt-0.5 flex-shrink-0 text-center">—</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  {plan.tier === 'free' ? (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      disabled={isCurrentPlan}
                    >
                      {isCurrentPlan ? 'Current Plan' : 'Get Started Free'}
                    </Button>
                  ) : (
                    <Button 
                      variant={plan.popular ? 'default' : 'outline'}
                      className={`w-full ${plan.tier === 'enterprise' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                      onClick={() => handleSubscribe(plan.tier)}
                      disabled={isCurrentPlan || isDowngrade || processing !== null}
                    >
                      {processing === plan.tier ? 'Processing...' : 
                       isCurrentPlan ? 'Current Plan' : 
                       isDowngrade ? 'Downgrade N/A' :
                       `Upgrade to ${plan.name}`}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Features Comparison */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Why Upgrade?</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">PnL Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Track your profit & loss with detailed graphs and performance metrics
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 mx-auto mb-4 flex items-center justify-center">
                <Percent className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="font-semibold mb-2">Lower Fees</h3>
              <p className="text-sm text-muted-foreground">
                Save money on every transaction with reduced platform fees
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 mx-auto mb-4 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="font-semibold mb-2">Advanced Insights</h3>
              <p className="text-sm text-muted-foreground">
                Get market insights and analytics to make better decisions
              </p>
            </Card>
          </div>
        </div>

        {/* CBGI Grading Section */}
        <div className="max-w-6xl mx-auto mt-20 pt-12 border-t border-border/50">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-primary border-primary/30">
              <Award className="w-3 h-3 mr-1" />
              CBGI Grading
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              CardBoom <span className="text-primary">Grading Index</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              Our proprietary grading system with AI-powered online pre-grading and full physical certification with CBGI slab protection & ultrasonic welding
            </p>
          </div>

          {/* Two Service Types */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* Online Pre-Grading */}
            <Card className="relative overflow-hidden border-2 border-blue-500/30 hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 mx-auto mb-4 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-blue-500" />
                </div>
                <Badge className="mb-2 bg-blue-500/10 text-blue-600 border-blue-500/30">AI-Powered</Badge>
                <CardTitle className="text-2xl">Online Pre-Grading</CardTitle>
                <CardDescription className="text-base">Instant AI analysis from your photos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <span className="text-5xl font-bold text-blue-500">FREE</span>
                  <p className="text-sm text-muted-foreground mt-1">with signup credits</p>
                </div>
                
                <div className="bg-blue-500/5 rounded-xl p-4 mb-6 border border-blue-500/20">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-blue-600">Results in 30 seconds</span>
                  </div>
                </div>

                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-blue-500" />
                    </div>
                    <span>Upload front & back photos</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-blue-500" />
                    </div>
                    <span>AI analyzes corners, edges, surface & centering</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-blue-500" />
                    </div>
                    <span>Get estimated CBGI score (1-10)</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-blue-500" />
                    </div>
                    <span>Decide if worth sending for full certification</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-blue-500" />
                    </div>
                    <span>Perfect for screening your collection</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full border-blue-500/50 text-blue-600 hover:bg-blue-500/10" onClick={() => navigate('/grading')}>
                  Try Pre-Grading Free
                </Button>
              </CardFooter>
            </Card>

            {/* Full CBGI Certification */}
            <Card className="relative overflow-hidden border-2 border-primary shadow-xl">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-amber-500" />
              <div className="absolute top-4 right-4">
                <Badge className="bg-primary text-primary-foreground">FULL SERVICE</Badge>
              </div>
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <Badge className="mb-2 bg-amber-500/10 text-amber-600 border-amber-500/30">After Vault Submission</Badge>
                <CardTitle className="text-2xl">Full CBGI Certification</CardTitle>
                <CardDescription className="text-base">Physical grading with slab protection & welding</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <span className="text-sm text-muted-foreground">Starting from</span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold">$18</span>
                    <span className="text-muted-foreground">/card</span>
                  </div>
                </div>

                {/* Speed Tiers */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Standard</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">20-25 days</span>
                      <Badge variant="outline" className="font-bold">$18</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/30">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="font-medium">Express</span>
                      <Badge variant="secondary" className="text-[10px] h-4">Popular</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">7-10 days</span>
                      <Badge className="font-bold bg-primary">$35</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/30">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-amber-500" />
                      <span className="font-medium">Priority</span>
                      <Badge className="text-[10px] h-4 bg-amber-500">Fastest</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">2-3 days</span>
                      <Badge className="font-bold bg-amber-500">$75</Badge>
                    </div>
                  </div>
                </div>

                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-500" />
                    </div>
                    <span>Submit card via Vault for physical inspection</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-500" />
                    </div>
                    <span>Expert graders verify condition & authenticity</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-500" />
                    </div>
                    <span><strong>CBGI Certification</strong> with official grade</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-500" />
                    </div>
                    <span><strong>Ultrasonic welded slab</strong> for tamper protection</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-500" />
                    </div>
                    <span>QR-verified label with blockchain registry</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => navigate('/vault')}>
                  Submit via Vault
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* How It Works */}
          <div className="mb-12">
            <h3 className="text-xl font-bold text-center mb-6">How CBGI Grading Works</h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="relative p-4 rounded-xl bg-muted/30 text-center">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</div>
                <Sparkles className="w-8 h-8 mx-auto mb-3 text-blue-500" />
                <p className="font-medium text-sm">Pre-Grade Online</p>
                <p className="text-xs text-muted-foreground mt-1">Upload photos for instant AI analysis</p>
              </div>
              <div className="relative p-4 rounded-xl bg-muted/30 text-center">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</div>
                <Package className="w-8 h-8 mx-auto mb-3 text-purple-500" />
                <p className="font-medium text-sm">Send to Vault</p>
                <p className="text-xs text-muted-foreground mt-1">Ship card to our secure facility</p>
              </div>
              <div className="relative p-4 rounded-xl bg-muted/30 text-center">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</div>
                <Award className="w-8 h-8 mx-auto mb-3 text-amber-500" />
                <p className="font-medium text-sm">Expert Grading</p>
                <p className="text-xs text-muted-foreground mt-1">Physical inspection & certification</p>
              </div>
              <div className="relative p-4 rounded-xl bg-muted/30 text-center">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">4</div>
                <ShieldCheck className="w-8 h-8 mx-auto mb-3 text-green-500" />
                <p className="font-medium text-sm">Slab & Ship</p>
                <p className="text-xs text-muted-foreground mt-1">Welded slab returned to you</p>
              </div>
            </div>
          </div>

          {/* CBGI Benefits */}
          <div className="grid md:grid-cols-4 gap-4 mb-12">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Ultrasonic Welding</p>
                <p className="text-xs text-muted-foreground">Tamper-proof slab protection</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-sm">AI Pre-Screen</p>
                <p className="text-xs text-muted-foreground">Know before you send</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="font-medium text-sm">CBGI Certified</p>
                <p className="text-xs text-muted-foreground">Trusted CardBoom grades</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Insured Shipping</p>
                <p className="text-xs text-muted-foreground">Protected both ways</p>
              </div>
            </div>
          </div>

          {/* Bulk Pricing Note */}
          <Card className="p-6 bg-muted/30 border-dashed text-center">
            <h3 className="font-semibold mb-2 flex items-center justify-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Bulk Grading Discounts
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Submitting 10+ cards? Contact us for special bulk pricing and dedicated support.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/grading')}>
              View Bulk Options
            </Button>
          </Card>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">How does billing work?</h3>
              <p className="text-sm text-muted-foreground">
                Subscriptions are billed monthly from your wallet balance. Make sure you have sufficient funds before your renewal date.
              </p>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-sm text-muted-foreground">
                Yes! You can cancel auto-renewal anytime from your profile settings. Your benefits will remain until the end of your billing period.
              </p>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2">How much can I save with Pro?</h3>
              <p className="text-sm text-muted-foreground">
                With Pro, you save 2.5% on buyer fees and 3.5% on seller fees. If you trade $2,000/month, that's ~$50 in savings!
              </p>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
