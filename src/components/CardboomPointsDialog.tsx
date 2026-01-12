import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Gem, TrendingUp, ShoppingBag, Zap, Gift, HelpCircle } from 'lucide-react';
import { useCardboomPoints } from '@/hooks/useCardboomPoints';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { GiftCardPurchase } from '@/components/gems/GiftCardPurchase';
import { ClaimGiftCard } from '@/components/gems/ClaimGiftCard';

interface CardboomPointsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CardboomPointsDialog = ({ open, onOpenChange }: CardboomPointsDialogProps) => {
  const [userId, setUserId] = useState<string | undefined>();
  const { t } = useLanguage();
  const { currency, formatPrice } = useCurrency();
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id);
    });
  }, []);

  const { balance, totalEarned, totalSpent, history, loading } = useCardboomPoints(userId);

  // Convert gems to currency value (1 gem = $0.01 USD base)
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
            <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center">
              <Gem className="w-5 h-5 text-sky-400" />
            </div>
            Cardboom Gems
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Balance Card */}
          <div className="bg-gradient-to-br from-sky-500/20 via-sky-600/10 to-blue-500/20 rounded-xl p-6 border border-sky-500/20">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Your Balance</p>
              <div className="flex items-center justify-center gap-2">
                <Gem className="w-8 h-8 text-sky-400" />
                <span className="text-4xl font-bold text-sky-400">
                  {loading ? '...' : balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-sm text-sky-400/80 font-medium mt-1">
                ≈ {loading ? '...' : getGemValue(balance)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Earned: {totalEarned.toLocaleString()} • Spent: {totalSpent.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                1 gem = {getGemValue(1)}
              </p>
            </div>

            {/* Gift Card Actions */}
            <div className="flex gap-2 justify-center">
              <GiftCardPurchase userBalance={0} onPurchaseComplete={() => {}} />
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
                      Top-ups, Card Wars bets, purchases — all earn you Cardboom Gems automatically.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Use Gems for Discounts</h4>
                    <p className="text-xs text-muted-foreground">
                      Redeem your gems when making purchases to get instant discounts on cards and collectibles.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Gems Cannot Be Withdrawn</h4>
                    <p className="text-xs text-muted-foreground">
                      Cardboom Gems are loyalty rewards for use on the platform only — they cannot be converted to cash.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Gem className="w-4 h-4 text-sky-400" />
                  Example Earnings
                </h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• {formatPrice(100)} top-up → <span className="text-sky-400 font-medium">0.20 gems</span></p>
                  <p>• {formatPrice(500)} card purchase → <span className="text-sky-400 font-medium">1.00 gems</span></p>
                  <p>• {formatPrice(2.50)} Card War bet → <span className="text-sky-400 font-medium">0.005 gems</span></p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Gem className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No gems activity yet</p>
                  <p className="text-xs">Start transacting to earn gems!</p>
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
