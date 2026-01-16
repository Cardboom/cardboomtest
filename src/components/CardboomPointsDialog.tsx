import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, ShoppingBag, Zap, Gift, HelpCircle } from 'lucide-react';
import { useCardboomPoints } from '@/hooks/useCardboomPoints';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { GiftCardPurchase } from '@/components/gems/GiftCardPurchase';
import { ClaimGiftCard } from '@/components/gems/ClaimGiftCard';
import { BoomCoinIcon } from '@/components/icons/BoomCoinIcon';

interface CardboomPointsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CardboomPointsDialog = ({ open, onOpenChange }: CardboomPointsDialogProps) => {
  const [userId, setUserId] = useState<string | undefined>();
  const [walletBalanceCents, setWalletBalanceCents] = useState(0);
  const { t } = useLanguage();
  const { currency, formatPrice } = useCurrency();
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id);
    });
  }, []);

  // Fetch wallet balance for gift card purchases
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!userId) return;
      const { data } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();
      if (data) {
        // Balance is stored in dollars, convert to cents for GiftCardPurchase
        setWalletBalanceCents(Number(data.balance) * 100);
      }
    };
    fetchWalletBalance();
  }, [userId]);

  const { balance, totalEarned, totalSpent, history, loading } = useCardboomPoints(userId);

  // Convert coins to currency value (1 coin = $0.01 USD base)
  const getGemValue = (gemAmount: number) => {
    const usdValue = gemAmount * 0.01;
    return formatPrice(usdValue);
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'top_up':
        return <TrendingUp className="w-4 h-4" />;
      case 'card_war':
        return <Zap className="w-4 h-4" />;
      case 'purchase':
        return <ShoppingBag className="w-4 h-4" />;
      case 'grading':
      case 'grading_payment':
        return <Gift className="w-4 h-4" />;
      case 'bounty':
      case 'bounty_reward':
        return <Zap className="w-4 h-4" />;
      case 'gift_card':
        return <Gift className="w-4 h-4" />;
      case 'referral':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Gift className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (source: string) => {
    // Format source labels - Title Case, professional UI text
    switch (source) {
      case 'top_up':
        return 'Wallet Top-Up';
      case 'card_war':
        return 'Card Wars';
      case 'purchase':
        return 'Card Purchase';
      case 'order':
        return 'Marketplace Order';
      case 'grading':
      case 'grading_payment':
        return 'Grading Payment';
      case 'bounty':
      case 'bounty_reward':
        return 'Bounty Reward';
      case 'gift_card':
        return 'Gift Card';
      case 'referral':
        return 'Referral Bonus';
      case 'auction':
        return 'Auction';
      case 'listing':
        return 'Listing Fee';
      case 'sale':
        return 'Sale Earnings';
      case 'refund':
        return 'Refund';
      case 'promo':
        return 'Promotional Bonus';
      case 'daily_login':
        return 'Daily Login Bonus';
      default:
        // Capitalize first letter of each word for any unknown source
        return source
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <BoomCoinIcon className="w-5 h-5 text-amber-400" />
            </div>
            Boom Coins
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Balance Card */}
          <div className="bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-yellow-500/20 rounded-xl p-6 border border-amber-500/20">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Your Balance</p>
              <div className="flex items-center justify-center gap-2">
                <BoomCoinIcon className="w-8 h-8 text-amber-400" />
                <span className="text-4xl font-bold text-amber-400">
                  {loading ? '...' : balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-sm text-amber-400/80 font-medium mt-1">
                ≈ {loading ? '...' : getGemValue(balance)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Earned: {totalEarned.toLocaleString()} • Spent: {totalSpent.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                1 coin = {getGemValue(1)}
              </p>
            </div>

            {/* Gift Card Actions */}
            <div className="flex gap-2 justify-center mt-4">
              <GiftCardPurchase userBalance={walletBalanceCents} onPurchaseComplete={() => {
                // Refetch wallet balance after purchase
                supabase.from('wallets').select('balance').eq('user_id', userId).single().then(({ data }) => {
                  if (data) setWalletBalanceCents(Number(data.balance) * 100);
                });
              }} />
              <ClaimGiftCard onClaimComplete={() => {}} />
            </div>
          </div>

          <Tabs defaultValue="how" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="how">How it Works</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="how" className="space-y-4 mt-4">
              <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Earn 0.2% on Every Transaction</h4>
                    <p className="text-xs text-muted-foreground">
                      Top-ups, Card Wars bets, purchases — all earn you Boom Coins automatically.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Use Coins for Discounts</h4>
                    <p className="text-xs text-muted-foreground">
                      Redeem your coins when making purchases to get instant discounts on cards and collectibles.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Coins Cannot Be Withdrawn</h4>
                    <p className="text-xs text-muted-foreground">
                      Boom Coins are loyalty rewards for use on the platform only — they cannot be converted to cash.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <BoomCoinIcon className="w-4 h-4 text-amber-400" />
                  Example Earnings
                </h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• {formatPrice(100)} top-up → <span className="text-amber-400 font-medium">0.20 coins</span></p>
                  <p>• {formatPrice(500)} card purchase → <span className="text-amber-400 font-medium">1.00 coins</span></p>
                  <p>• {formatPrice(2.50)} Card War bet → <span className="text-amber-400 font-medium">0.005 coins</span></p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BoomCoinIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No coins activity yet</p>
                  <p className="text-xs">Start transacting to earn coins!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          item.transaction_type === 'earn' 
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {getSourceIcon(item.source)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{getSourceLabel(item.source)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={item.transaction_type === 'earn' ? 'default' : 'destructive'} className="font-mono">
                          {item.transaction_type === 'earn' ? '+' : ''}{item.amount.toFixed(2)}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          ≈ {getGemValue(Math.abs(item.amount))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
