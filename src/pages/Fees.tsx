import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Percent, 
  TrendingDown, 
  Info, 
  Crown, 
  Building2, 
  Sparkles,
  ArrowRight,
  Calculator,
  HelpCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
        <title>Fees & Pricing | CardBoom</title>
        <meta name="description" content="Transparent fee structure for trading cards on CardBoom. Lower fees with Lite, Pro, and Enterprise subscriptions." />
      </Helmet>

      <Header cartCount={cartItems.length} onCartClick={() => {}} />

      <main className="container mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 text-primary border-primary/30">
            <Percent className="w-3 h-3 mr-1" />
            Transparent Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Fair <span className="text-primary">Fees</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Know exactly what you'll pay. Lower your fees by upgrading your subscription.
          </p>
        </div>

        {/* Trading Cards Fee Structure */}
        <Card className="max-w-4xl mx-auto mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Trading Card Sales
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
                      <th className="text-left py-3 px-4 font-semibold">
                        <div className="flex items-center gap-1">
                          Up to $7,500
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Fee applied to the first $7,500 of each sale</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        <div className="flex items-center gap-1">
                          Over $7,500
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reduced fee on the portion exceeding $7,500</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </th>
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

              {/* Example Calculation */}
              <Separator />
              
              <div className="bg-muted/50 rounded-lg p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Fee Calculator
                </h3>
                
                <div className="mb-4">
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
                    return (
                      <div key={tier.name} className="bg-background rounded-lg p-4 border border-border/50">
                        <p className="text-sm text-muted-foreground mb-1">{tier.name}</p>
                        <p className="text-lg font-bold text-loss">-${fee.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          You receive: <span className="text-gain font-medium">${netAmount.toFixed(2)}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>

                {saleAmount > 7500 && (
                  <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm text-muted-foreground">
                      <Info className="w-4 h-4 inline mr-1" />
                      For sales over $7,500, the lower rate applies only to the amount exceeding $7,500.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Fees */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Processing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Credit/Debit Card</span>
                <Badge variant="outline">2.9% + $0.30</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Wire Transfer</span>
                <Badge variant="outline">Free</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Gems Top-up</span>
                <Badge variant="outline">Varies by tier</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Other Fees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Listing Fee</span>
                <Badge variant="secondary">Free</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Auction Listing</span>
                <Badge variant="outline">$0.50</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Withdrawal</span>
                <Badge variant="secondary">Free</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

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
