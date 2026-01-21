import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Crown, Sparkles, ArrowRight, TrendingDown, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const tier = searchParams.get('tier') || 'pro';
  const billingCycle = searchParams.get('cycle') || 'monthly';
  const price = searchParams.get('price') || '25';

  const tierLabel = tier === 'enterprise' ? 'Enterprise' : tier === 'lite' ? 'Lite' : 'Pro';
  const cycleLabel = billingCycle === 'yearly' ? 'Annual' : 'Monthly';

  useEffect(() => {
    // Fire Google Ads conversion event on page load
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'conversion', {
        'send_to': 'AW-17885952633/subscription_monthly',
        'value': parseFloat(price),
        'currency': 'USD',
        'transaction_id': `sub_${Date.now()}`
      });
      console.log('[Conversion] Subscription conversion fired:', { tier, billingCycle, price });
    }

    // Also fire to dataLayer for GTM
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: 'subscription_complete',
        conversion_type: 'subscription',
        subscription_tier: tier,
        billing_cycle: billingCycle,
        value: parseFloat(price)
      });
    }
  }, [tier, billingCycle, price]);

  // Check if user is actually logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[SubscriptionSuccess] No active session');
      }
    };
    checkSession();
  }, []);

  const getFeatures = () => {
    if (tier === 'enterprise') {
      return [
        { icon: TrendingDown, text: '4% seller fee (lowest tier)' },
        { icon: Zap, text: '3 free AI gradings per month' },
        { icon: Crown, text: 'Custom storefront & branding' },
        { icon: Shield, text: 'Priority support & early access' },
      ];
    }
    if (tier === 'lite') {
      return [
        { icon: TrendingDown, text: '10% seller fee (vs 13.25%)' },
        { icon: Zap, text: '1 free AI grading per month' },
        { icon: Crown, text: 'Lite badge on profile' },
        { icon: Shield, text: 'Better gem conversion rates' },
      ];
    }
    return [
      { icon: TrendingDown, text: '8% seller fee (vs 13.25%)' },
      { icon: Zap, text: '2 free AI gradings per month' },
      { icon: Crown, text: 'Pro badge on profile' },
      { icon: Shield, text: 'Priority support & early access' },
    ];
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Helmet>
        <title>Welcome to {tierLabel}! | CardBoom</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Card className="glass border-amber-500/30 overflow-hidden">
          {/* Success animation header */}
          <div className="bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent p-8 text-center relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/20 flex items-center justify-center mx-auto mb-4"
            >
              <Crown className="w-12 h-12 text-amber-500" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Welcome to {tierLabel}! 🎉
              </h1>
              <p className="text-muted-foreground">
                Your {cycleLabel.toLowerCase()} subscription is now active
              </p>
            </motion.div>
            
            {/* Decorative sparkles */}
            <Sparkles className="absolute top-4 right-4 w-6 h-6 text-amber-500/50 animate-pulse" />
            <Sparkles className="absolute bottom-4 left-4 w-4 h-4 text-orange-500/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Subscription details */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg p-4 border border-amber-500/30"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{tierLabel} {cycleLabel}</p>
                  <p className="text-sm text-muted-foreground">
                    {billingCycle === 'yearly' ? 'Billed annually' : 'Billed monthly'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-500">${price}</p>
                  <p className="text-xs text-muted-foreground">
                    /{billingCycle === 'yearly' ? 'year' : 'month'}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Your benefits section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="space-y-3"
            >
              <h3 className="font-medium text-foreground">Your Benefits</h3>
              <ul className="space-y-3">
                {getFeatures().map((feature, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <feature.icon className="w-4 h-4 text-amber-500" />
                    </div>
                    <span className="text-muted-foreground">{feature.text}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Savings callout for yearly */}
            {billingCycle === 'yearly' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
                className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-3 border border-green-500/30"
              >
                <p className="text-sm text-green-600 dark:text-green-400 font-medium text-center">
                  🎁 You saved 1 month with annual billing!
                </p>
              </motion.div>
            )}

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="space-y-3 pt-2"
            >
              <Button asChild className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" size="lg">
                <Link to="/sell">
                  Start Selling with Lower Fees
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/grading">
                  Use Your Free Grading Credits
                </Link>
              </Button>
            </motion.div>
          </CardContent>
        </Card>

        {/* Footer link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center text-sm text-muted-foreground mt-6"
        >
          Manage your subscription in{' '}
          <Link to="/settings" className="text-primary hover:underline">
            Account Settings
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default SubscriptionSuccess;
