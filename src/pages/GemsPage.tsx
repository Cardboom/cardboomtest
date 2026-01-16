import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gem, Package, CreditCard, Sparkles, Shield, Clock, TrendingUp, Check, Info, Gift, Ticket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useGems } from '@/contexts/GemsContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useCardboomPoints } from '@/hooks/useCardboomPoints';
import { useTurkeyCompliance } from '@/hooks/useTurkeyCompliance';
import { WalletTopUpDialog } from '@/components/WalletTopUpDialog';
import { GiftCardPurchase } from '@/components/gems/GiftCardPurchase';
import { ClaimGiftCard } from '@/components/gems/ClaimGiftCard';
import { toast } from 'sonner';

// Gem pack options with prices in USD
const GEM_PACKS = [
  { gems: 500, usd: 5, popular: false, bonus: 0 },
  { gems: 1000, usd: 10, popular: false, bonus: 0 },
  { gems: 2500, usd: 25, popular: true, bonus: 100 },
  { gems: 5000, usd: 50, popular: false, bonus: 250 },
  { gems: 10000, usd: 100, popular: false, bonus: 600 },
  { gems: 25000, usd: 250, popular: false, bonus: 2000 },
];

const GemsPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [selectedPack, setSelectedPack] = useState<typeof GEM_PACKS[0] | null>(null);
  const [walletBalanceCents, setWalletBalanceCents] = useState(0);
  
  const { pricing, subscriptionTier, getGemsTopUpCost } = useGems();
  const { exchangeRates, currency } = useCurrency();
  const { isTurkishResident, loading: complianceLoading } = useTurkeyCompliance();
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        // Fetch wallet balance for gifting
        supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single()
          .then(({ data }) => {
            if (data) setWalletBalanceCents(Number(data.balance) * 100);
          });
      }
    });
  }, []);

  const { balance } = useCardboomPoints(user?.id);

  // Calculate price with markup based on subscription tier
  const calculatePrice = (baseUSD: number) => {
    const withMarkup = baseUSD * pricing.markupMultiplier;
    return withMarkup;
  };

  // Format price for display - TRY for Turkish users, USD otherwise
  const formatDisplayPrice = (usdPrice: number) => {
    if (isTurkishResident) {
      const tryPrice = usdPrice * (exchangeRates.USD_TRY || 42);
      return `₺${Math.round(tryPrice).toLocaleString('tr-TR')}`;
    }
    return `$${usdPrice.toFixed(2)}`;
  };

  const handlePurchase = (pack: typeof GEM_PACKS[0]) => {
    if (!user) {
      toast.error('Please sign in to purchase Gems');
      navigate('/auth');
      return;
    }
    setSelectedPack(pack);
    setShowTopUp(true);
  };

  return (
    <>
      <Helmet>
        <title>CardBoom Gems - Top Up Your Balance | CardBoom</title>
        <meta 
          name="description" 
          content="Purchase CardBoom Gems to buy packs, cards, and collectibles. Best rates for Pro and Enterprise members." 
        />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header cartCount={0} onCartClick={() => {}} />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative py-16 md:py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-background to-primary/5" />
            <div className="absolute inset-0">
              <div className="absolute top-20 left-1/4 w-64 h-64 bg-sky-500/20 rounded-full blur-3xl" />
              <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            </div>
            
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-3xl mx-auto text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/10 border border-sky-500/20 rounded-full mb-6"
                >
                  <Gem className="w-5 h-5 text-sky-400" />
                  <span className="text-sm font-medium text-sky-400">CardBoom Gems</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-6xl font-bold mb-6"
                >
                  Power Your
                  <span className="bg-gradient-to-r from-sky-400 to-primary bg-clip-text text-transparent"> Collection</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto"
                >
                  CardBoom Gems are your currency for Boom Packs, marketplace purchases, 
                  and premium features. Better rates for subscribers.
                </motion.p>

                {/* Current Balance & Gifting */}
                {user && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center gap-4"
                  >
                    <div className="inline-flex items-center gap-4 px-8 py-4 bg-card border border-border rounded-2xl shadow-xl">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 to-primary flex items-center justify-center">
                        <Gem className="w-7 h-7 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm text-muted-foreground">Your Balance</p>
                        <p className="text-3xl font-bold">{balance.toLocaleString()} <span className="text-lg text-muted-foreground">Gems</span></p>
                      </div>
                    </div>
                    
                    {/* Gem Gifting Actions */}
                    <div className="flex gap-2">
                      <GiftCardPurchase 
                        userBalance={walletBalanceCents} 
                        onPurchaseComplete={() => {
                          supabase.from('wallets').select('balance').eq('user_id', user.id).single().then(({ data }) => {
                            if (data) setWalletBalanceCents(Number(data.balance) * 100);
                          });
                        }} 
                      />
                      <ClaimGiftCard onClaimComplete={() => {}} />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </section>

          {/* Pricing Tier Info */}
          <section className="container mx-auto px-4 pb-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Badge variant={subscriptionTier === 'free' ? 'default' : 'outline'} className="px-4 py-2">
                  Standard: 12% markup
                </Badge>
                <Badge variant={subscriptionTier === 'pro' ? 'default' : 'outline'} className="px-4 py-2 bg-amber-500/10 text-amber-500 border-amber-500/30">
                  Pro: 8% markup
                </Badge>
                <Badge variant={subscriptionTier === 'enterprise' ? 'default' : 'outline'} className="px-4 py-2 bg-purple-500/10 text-purple-500 border-purple-500/30">
                  Enterprise: 5% markup
                </Badge>
              </div>
              {subscriptionTier === 'free' && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  <Button variant="link" className="text-primary p-0 h-auto" onClick={() => navigate('/pricing')}>
                    Upgrade to Pro or Enterprise
                  </Button>
                  {' '}for better Gem rates
                </p>
              )}
            </div>
          </section>

          {/* Gem Packs Grid */}
          <section className="container mx-auto px-4 pb-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {GEM_PACKS.map((pack, index) => {
                const finalPrice = calculatePrice(pack.usd);
                const totalGems = pack.gems + pack.bonus;
                
                return (
                  <motion.div
                    key={pack.gems}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Card className={`relative overflow-hidden transition-all hover:shadow-xl hover:border-primary/50 ${
                      pack.popular ? 'border-primary shadow-lg shadow-primary/20' : ''
                    }`}>
                      {pack.popular && (
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold rounded-bl-lg">
                          Most Popular
                        </div>
                      )}
                      
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400/20 to-primary/20 flex items-center justify-center">
                            <Gem className="w-6 h-6 text-sky-400" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl">{pack.gems.toLocaleString()}</CardTitle>
                            <p className="text-sm text-muted-foreground">Gems</p>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {pack.bonus > 0 && (
                          <div className="flex items-center gap-2 text-green-500">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-sm font-medium">+{pack.bonus.toLocaleString()} Bonus Gems</span>
                          </div>
                        )}
                        
                        <Separator />
                        
                        <div className="space-y-1">
                          <p className="text-3xl font-bold">
                            {formatDisplayPrice(finalPrice)}
                          </p>
                          {isTurkishResident && (
                            <p className="text-xs text-muted-foreground">
                              ≈ ${finalPrice.toFixed(2)} USD
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {pricing.tierLabel} pricing ({pricing.markupPercent}% markup)
                          </p>
                        </div>
                        
                        <Button 
                          className="w-full" 
                          size="lg"
                          onClick={() => handlePurchase(pack)}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Purchase
                        </Button>
                        
                        <p className="text-xs text-center text-muted-foreground">
                          Receive {totalGems.toLocaleString()} Gems total
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Features Section */}
          <section className="container mx-auto px-4 pb-16">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-center mb-8">Why CardBoom Gems?</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 rounded-xl bg-card border border-border">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="font-semibold mb-2">Secure & Protected</h3>
                  <p className="text-sm text-muted-foreground">
                    All Gem purchases are protected and backed by CardBoom's escrow system.
                  </p>
                </div>
                
                <div className="text-center p-6 rounded-xl bg-card border border-border">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-sky-500/10 flex items-center justify-center">
                    <Package className="w-6 h-6 text-sky-500" />
                  </div>
                  <h3 className="font-semibold mb-2">Instant Delivery</h3>
                  <p className="text-sm text-muted-foreground">
                    Gems are credited instantly to your account after successful payment.
                  </p>
                </div>
                
                <div className="text-center p-6 rounded-xl bg-card border border-border">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-amber-500" />
                  </div>
                  <h3 className="font-semibold mb-2">Member Discounts</h3>
                  <p className="text-sm text-muted-foreground">
                    Pro and Enterprise members enjoy reduced markup rates on all purchases.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* What You Can Buy */}
          <section className="container mx-auto px-4 pb-16">
            <div className="max-w-4xl mx-auto bg-gradient-to-br from-card to-card/50 border border-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-center mb-8">What Can You Buy With Gems?</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: Package, label: 'Boom Packs', desc: 'Sealed collectible packs with real cards' },
                  { icon: Sparkles, label: 'Marketplace Items', desc: 'Cards and collectibles from other users' },
                  { icon: Shield, label: 'Grading Services', desc: 'CBGI and CBG certification' },
                  { icon: Clock, label: 'Premium Features', desc: 'Boosts, analytics, and more' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-background/50">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{item.label}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="container mx-auto px-4 pb-16">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-card border border-border">
                  <h4 className="font-semibold mb-2">Can I withdraw Gems?</h4>
                  <p className="text-sm text-muted-foreground">
                    No, CardBoom Gems are platform credits for use within CardBoom only. They cannot be converted to cash.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border">
                  <h4 className="font-semibold mb-2">Do Gems expire?</h4>
                  <p className="text-sm text-muted-foreground">
                    No, your Gems never expire and remain in your account indefinitely.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border">
                  <h4 className="font-semibold mb-2">What payment methods are accepted?</h4>
                  <p className="text-sm text-muted-foreground">
                    We accept all major credit and debit cards. Turkish users can pay in TRY with local cards.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>

      {/* Top Up Dialog */}
      <WalletTopUpDialog
        open={showTopUp}
        onOpenChange={setShowTopUp}
        onSuccess={() => {
          setShowTopUp(false);
          toast.success('Gems added successfully!');
        }}
      />
    </>
  );
};

export default GemsPage;
