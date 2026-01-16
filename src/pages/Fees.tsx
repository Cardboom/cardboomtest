import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Percent, 
  TrendingDown, 
  Crown, 
  Building2, 
  Sparkles,
  ArrowRight,
  Calculator,
  Check,
  Gem,
  Wallet,
  BadgeCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

const Fees = () => {
  const [cartItems] = useState<any[]>([]);
  const [saleAmount, setSaleAmount] = useState<number>(1000);

  // Fee calculation based on tier
  const calculateFee = (amount: number, tier: 'free' | 'lite' | 'pro' | 'enterprise') => {
    const feeRates: Record<string, { under7500: number; over7500: number }> = {
      free: { under7500: 0.1325, over7500: 0.0235 },
      lite: { under7500: 0.10, over7500: 0.02 },
      pro: { under7500: 0.08, over7500: 0.015 },
      enterprise: { under7500: 0.04, over7500: 0.01 },
    };

    const rate = feeRates[tier];
    if (amount <= 7500) {
      return amount * rate.under7500;
    } else {
      const under = 7500 * rate.under7500;
      const over = (amount - 7500) * rate.over7500;
      return under + over;
    }
  };

  const tiers = [
    {
      name: 'Free',
      icon: Sparkles,
      price: '$0',
      under7500: '13.25%',
      over7500: '2.35%',
      tier: 'free' as const,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
    {
      name: 'Lite',
      icon: TrendingDown,
      price: '$9.99/mo',
      under7500: '10%',
      over7500: '2%',
      tier: 'lite' as const,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      name: 'Pro',
      icon: Crown,
      price: '$25/mo',
      under7500: '8%',
      over7500: '1.5%',
      tier: 'pro' as const,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      name: 'Enterprise',
      icon: Building2,
      price: '$50/mo',
      under7500: '4%',
      over7500: '1%',
      tier: 'enterprise' as const,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Simple, Fair Fees | CardBoom</title>
        <meta name="description" content="Know exactly what you'll pay. CardBoom's all-inclusive trading fees with no hidden charges. Save more as you grow." />
      </Helmet>

      <Header cartCount={cartItems.length} onCartClick={() => {}} />

      <main className="container mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 text-primary border-primary/30">
            <Percent className="w-3 h-3 mr-1" />
            All-Inclusive
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Fair <span className="text-primary">Fees</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Know exactly what you'll pay. Save more as you grow.
          </p>
        </div>

        {/* Trading Cards Fee Structure */}
        <Card className="max-w-4xl mx-auto mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-primary" />
              Trading Card Sales
              <Badge variant="secondary" className="ml-2 text-xs">All-inclusive</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Fee Breakdown Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Tier</th>
                      <th className="text-left py-3 px-4 font-semibold">Monthly</th>
                      <th className="text-left py-3 px-4 font-semibold">Up to $7,500</th>
                      <th className="text-left py-3 px-4 font-semibold">Over $7,500</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((tier) => {
                      const Icon = tier.icon;
                      return (
                        <tr key={tier.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg ${tier.bgColor} flex items-center justify-center`}>
                                <Icon className={`w-4 h-4 ${tier.color}`} />
                              </div>
                              <span className="font-medium">{tier.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-muted-foreground">{tier.price}</td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className={tier.color}>
                              {tier.under7500}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="secondary">
                              {tier.over7500}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Helper Text */}
              <div className="bg-muted/30 rounded-lg p-4 flex items-start gap-3">
                <Check className="w-5 h-5 text-gain shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  All fees include payment processing, wallet usage, and currency conversion. No hidden charges.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fee Calculator - Simplified */}
        <Card className="max-w-4xl mx-auto mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Fee Calculator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <label className="text-sm text-muted-foreground mb-2 block">Sale Amount ($)</label>
              <input
                type="number"
                value={saleAmount}
                onChange={(e) => setSaleAmount(Number(e.target.value) || 0)}
                className="w-full max-w-xs px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                min={0}
                step={100}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {tiers.map((tier) => {
                const fee = calculateFee(saleAmount, tier.tier);
                const netAmount = saleAmount - fee;
                const Icon = tier.icon;
                return (
                  <div key={tier.name} className="bg-muted/50 rounded-lg p-4 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${tier.color}`} />
                      <p className="text-sm font-medium">{tier.name}</p>
                    </div>
                    <p className="text-2xl font-bold text-gain">${netAmount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You receive
                    </p>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              Payout shown is final.
            </p>
          </CardContent>
        </Card>

        {/* Wallet & Gems Section */}
        <Card className="max-w-4xl mx-auto mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gem className="w-5 h-5 text-sky-400" />
              Wallet & Gems
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Gems are CardBoom's internal balance, designed for fast and seamless transactions.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Top-Up Options */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Top-Up Options</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                    <span className="font-medium">Credit / Debit Card</span>
                    <Badge variant="outline">Instant</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gain/5 border border-gain/20">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Bank Transfer (IBAN)</span>
                      <Badge className="bg-gain/20 text-gain border-0 text-xs">Bonus Gems</Badge>
                    </div>
                    <Badge variant="outline">1-2 days</Badge>
                  </div>
                </div>
              </div>

              {/* Member Benefits */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Member Benefits</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-primary" />
                      <span className="font-medium">Pro Members</span>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-0">Better Gem Value</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-500" />
                      <span className="font-medium">Enterprise</span>
                    </div>
                    <Badge className="bg-amber-500/10 text-amber-500 border-0">Best Gem Value</Badge>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="flex items-center gap-3 p-4 rounded-lg bg-sky-500/5 border border-sky-500/20">
              <Wallet className="w-5 h-5 text-sky-400" />
              <p className="text-sm text-muted-foreground">
                Your Gem balance is ready to use instantly.
              </p>
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              Gem pricing may vary slightly based on market conditions.
            </p>
          </CardContent>
        </Card>

        {/* Other Fees - Simplified */}
        <Card className="max-w-4xl mx-auto mb-12">
          <CardHeader>
            <CardTitle className="text-lg">Other Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <span className="text-muted-foreground">Listing Fee</span>
                <Badge variant="secondary" className="bg-gain/10 text-gain border-0">Free</Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <span className="text-muted-foreground">Withdrawal</span>
                <Badge variant="secondary" className="bg-gain/10 text-gain border-0">Free</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="max-w-2xl mx-auto text-center">
          <Card className="bg-gradient-to-r from-primary/5 to-amber-500/5 border-primary/20">
            <CardContent className="py-8">
              <h2 className="text-2xl font-bold mb-2">Ready to save on fees?</h2>
              <p className="text-muted-foreground mb-6">
                Upgrade your subscription and keep more of your profits.
              </p>
              <Button asChild size="lg" className="gap-2">
                <Link to="/pricing">
                  View Subscription Plans
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Fees;
