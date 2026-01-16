import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useGradingCredits } from '@/hooks/useGradingCredits';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import {
  Package,
  Sparkles,
  Check,
  Crown,
  Zap,
  Clock,
  ShoppingCart,
  Gift,
  Percent,
  ArrowRight,
  Loader2,
} from 'lucide-react';

// Credit pack options - valid for 1 year
const CREDIT_PACKS = [
  { id: 'pack-5', credits: 5, price: 40, perCredit: 8, savings: 0, popular: false },
  { id: 'pack-10', credits: 10, price: 70, perCredit: 7, savings: 30, popular: true },
  { id: 'pack-25', credits: 25, price: 150, perCredit: 6, savings: 100, popular: false },
  { id: 'pack-50', credits: 50, price: 250, perCredit: 5, savings: 250, popular: false },
];

export default function GradingCreditsPage() {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  
  const { creditsRemaining, refetch } = useGradingCredits(userId);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/auth?returnTo=/grading/credits');
        return;
      }
      setUserId(session.user.id);

      // Fetch wallet balance from wallets table
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      if (wallet) {
        setWalletBalance(wallet.balance || 0);
      }
    };
    fetchUserData();
  }, [navigate]);

  const handlePurchase = async (pack: typeof CREDIT_PACKS[0]) => {
    if (!userId) return;
    
    if (walletBalance < pack.price) {
      toast.error(`Insufficient balance. Need $${(pack.price - walletBalance).toFixed(2)} more.`);
      navigate('/wallet');
      return;
    }

    setIsPurchasing(true);
    try {
      // Deduct from wallet using wallets table
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: walletBalance - pack.price })
        .eq('user_id', userId);

      if (walletError) throw walletError;

      // Add credits
      const { data: existingCredits } = await supabase
        .from('grading_credits')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingCredits) {
        await supabase
          .from('grading_credits')
          .update({ credits_remaining: existingCredits.credits_remaining + pack.credits })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('grading_credits')
          .insert({
            user_id: userId,
            credits_remaining: pack.credits,
          });
      }

      // Log the transaction
      await supabase.from('grading_credit_history').insert({
        user_id: userId,
        credits_change: pack.credits,
        reason: `Purchased ${pack.credits} credit pack for $${pack.price}`,
      });

      // Log wallet transaction in wallet_audit_log
      await supabase.from('wallet_audit_log').insert({
        wallet_id: userId, // Using user_id as wallet_id
        user_id: userId,
        action: 'grading_credits_purchase',
        old_balance: walletBalance,
        new_balance: walletBalance - pack.price,
        change_amount: -pack.price,
        reference_id: `credits_${pack.credits}_${Date.now()}`,
      });

      toast.success(`🎉 Successfully purchased ${pack.credits} grading credits!`);
      setWalletBalance(walletBalance - pack.price);
      refetch();
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to purchase credits. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Buy Grading Credits | CardBoom</title>
        <meta name="description" content="Purchase grading credit packs at discounted rates. Valid for 1 year - use anytime for CBGI certification." />
      </Helmet>
      
      <Header cartCount={0} onCartClick={() => {}} />
      
      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 mb-4"
          >
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Save up to 50% on gradings</span>
          </motion.div>
          
          <h1 className="text-3xl font-bold mb-2">Buy Grading Credits</h1>
          <p className="text-muted-foreground">
            Purchase credit packs and save. Valid for 1 year.
          </p>
        </div>

        {/* Current Balance */}
        <Card className="mb-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Credits</p>
                  <p className="text-3xl font-bold">{creditsRemaining}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
                <p className="text-xl font-semibold">{formatPrice(walletBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Packs */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {CREDIT_PACKS.map((pack, index) => (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className={`relative cursor-pointer transition-all hover:shadow-lg ${
                  selectedPack === pack.id 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : pack.popular 
                      ? 'border-yellow-500/50' 
                      : 'border-border'
                }`}
                onClick={() => setSelectedPack(pack.id)}
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                      <Crown className="w-3 h-3 mr-1" /> Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-5 h-5 text-primary" />
                        <span className="text-2xl font-bold">{pack.credits}</span>
                        <span className="text-muted-foreground">credits</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ${pack.perCredit}/credit
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">${pack.price}</p>
                      {pack.savings > 0 && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                          <Percent className="w-3 h-3 mr-1" />
                          Save ${pack.savings}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Valid for 1 year</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Use anytime for CBGI grading</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>No expiry stress</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full mt-4 gap-2"
                    variant={selectedPack === pack.id ? "default" : "outline"}
                    disabled={isPurchasing}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePurchase(pack);
                    }}
                  >
                    {isPurchasing && selectedPack === pack.id ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        Buy {pack.credits} Credits
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Info Section */}
        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              How Credits Work
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium">Buy Credits</p>
                  <p className="text-muted-foreground">Purchase packs at discounted rates</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium">Use Anytime</p>
                  <p className="text-muted-foreground">Credits are valid for 1 year</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium">Auto-Applied</p>
                  <p className="text-muted-foreground">Credits cover base certification cost</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                <strong>Note:</strong> Credits cover the base CBGI certification fee only. Speed upgrades, protection bundles, and physical shipping services are charged separately.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center mt-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/grading/new')}
            className="gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Go to Grading
          </Button>
        </div>
      </main>
    </div>
  );
}
