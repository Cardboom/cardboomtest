import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Building2, TrendingUp, PieChart, BarChart3, Shield, Headphones, Rocket, Percent, CreditCard, Banknote } from 'lucide-react';
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

  const handleSubscribe = async (tier: 'pro' | 'enterprise') => {
    if (!userId) {
      toast.error('Please sign in to subscribe');
      navigate('/auth');
      return;
    }

    setProcessing(tier);
    try {
      const price = tier === 'pro' ? 9.99 : 20;
      
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
      await supabase
        .from('transactions')
        .insert({
          wallet_id: wallet.id,
          type: 'withdrawal',
          amount: -price,
          description: `${tier === 'pro' ? 'Pro' : 'Enterprise'} Subscription - Monthly`,
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

      toast.success(`Welcome to ${tier === 'pro' ? 'Pro' : 'Enterprise'}! Enjoy your premium features.`);
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
        buyer: '6%',
        seller: '8.5%',
        card: '7%',
        wire: '3%',
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
      name: 'Pro',
      price: '$9.99',
      period: '/month',
      description: 'For serious collectors',
      icon: Crown,
      popular: true,
      tier: 'pro' as const,
      fees: {
        buyer: '4.5%',
        seller: '6%',
        card: '4.5%',
        wire: '1.5%',
      },
      features: [
        'Everything in Free',
        'PnL Graph & Analytics',
        'Portfolio performance tracking',
        'Price alerts (unlimited)',
        'Pro badge on profile',
        'Reduced transaction fees',
        'Priority customer support',
        'Early access to features',
      ],
      savings: 'Save ~$50/month on fees',
    },
    {
      name: 'Enterprise',
      price: '$20',
      period: '/month',
      description: 'For power sellers',
      icon: Building2,
      popular: false,
      tier: 'enterprise' as const,
      fees: {
        buyer: '3%',
        seller: '4.5%',
        card: '5%',
        wire: '1.5%',
      },
      features: [
        'Everything in Pro',
        'Lowest transaction fees',
        'Advanced analytics dashboard',
        'API access (coming soon)',
        'Bulk listing tools',
        'Dedicated account manager',
        'Custom reports',
        'Enterprise badge',
      ],
      savings: 'Save ~$150/month on fees',
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
                    <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Transaction Fees</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3 h-3 text-muted-foreground" />
                        <span>Buyer: <span className="font-semibold text-foreground">{plan.fees.buyer}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Percent className="w-3 h-3 text-muted-foreground" />
                        <span>Seller: <span className="font-semibold text-foreground">{plan.fees.seller}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3 h-3 text-muted-foreground" />
                        <span>Card: <span className="font-semibold text-foreground">{plan.fees.card}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Banknote className="w-3 h-3 text-muted-foreground" />
                        <span>Wire: <span className="font-semibold text-foreground">{plan.fees.wire}</span></span>
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
