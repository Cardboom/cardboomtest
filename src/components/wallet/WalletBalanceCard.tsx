import { Wallet, TrendingUp, TrendingDown, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WalletBalanceCardProps {
  availableBalance: number;
  pendingBalance: number;
  todaysPNL: number;
  formatPrice: (amount: number) => string;
  isTurkishResident: boolean;
  onTopUp: () => void;
}

export const WalletBalanceCard = ({
  availableBalance,
  pendingBalance,
  todaysPNL,
  formatPrice,
  isTurkishResident,
  onTopUp,
}: WalletBalanceCardProps) => {
  const totalBalance = availableBalance + pendingBalance;
  const hasPendingFunds = pendingBalance > 0;

  return (
    <Card className="overflow-hidden border-primary/20 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-gold/5" />
      <CardContent className="p-8 relative">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-4">
            {/* Total Balance (if pending exists) */}
            {hasPendingFunds && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Total Balance</p>
                <p className="text-2xl font-display font-semibold text-muted-foreground">
                  {formatPrice(totalBalance)}
                </p>
              </div>
            )}

            {/* Available Balance */}
            <div>
              <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wider font-medium flex items-center gap-2">
                Available Balance
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/60" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Funds ready for withdrawal or purchases. Pending funds are released after verification.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight">
                {formatPrice(availableBalance)}
              </h2>
            </div>

            {/* Pending Balance - Only show if exists */}
            {hasPendingFunds && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Lock className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    {formatPrice(pendingBalance)} Pending
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Funds held until verification complete
                  </p>
                </div>
              </div>
            )}

            {/* Today's PNL */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                todaysPNL >= 0 ? 'bg-gain/10 text-gain' : 'bg-loss/10 text-loss'
              }`}>
                {todaysPNL >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="font-semibold text-sm">
                  {todaysPNL >= 0 ? '+' : ''}{formatPrice(todaysPNL)}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">Today's P&L</span>
            </div>
          </div>

          <Button onClick={onTopUp} size="lg" className="gap-2 shadow-glow h-14 px-8">
            <Sparkles className="h-5 w-5" />
            {isTurkishResident ? 'Top Up Boom Coins' : 'Add Funds'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
