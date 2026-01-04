import { Trophy, TrendingUp, TrendingDown, Package, Wallet, Eye, EyeOff, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProfileCollectionStatsProps {
  totalItems: number;
  totalValue: number;
  pnl: number;
  pnlPercent: number;
  showCollectionCount: boolean;
  showPortfolioValue: boolean;
  isOwnProfile: boolean;
}

export const ProfileCollectionStats = ({
  totalItems,
  totalValue,
  pnl,
  pnlPercent,
  showCollectionCount,
  showPortfolioValue,
  isOwnProfile,
}: ProfileCollectionStatsProps) => {
  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
  };

  // If not own profile and both are hidden, show nothing
  if (!isOwnProfile && !showCollectionCount && !showPortfolioValue) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Total Items */}
      <Card className="glass border-border/50">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Package className="w-4 h-4 text-primary" />
            {!showCollectionCount && !isOwnProfile && (
              <Lock className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
          {showCollectionCount || isOwnProfile ? (
            <>
              <p className="text-2xl font-bold font-display">{totalItems}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-muted-foreground">—</p>
              <p className="text-xs text-muted-foreground">Private</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Value */}
      <Card className="glass border-border/50">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-gold" />
            {!showPortfolioValue && !isOwnProfile && (
              <Lock className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
          {showPortfolioValue || isOwnProfile ? (
            <>
              <p className="text-2xl font-bold font-display">{formatValue(totalValue)}</p>
              <p className="text-xs text-muted-foreground">Portfolio Value</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-muted-foreground">—</p>
              <p className="text-xs text-muted-foreground">Private</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* P&L */}
      <Card className="glass border-border/50">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            {pnl >= 0 ? (
              <TrendingUp className="w-4 h-4 text-gain" />
            ) : (
              <TrendingDown className="w-4 h-4 text-loss" />
            )}
          </div>
          {showPortfolioValue || isOwnProfile ? (
            <>
              <p className={cn(
                "text-2xl font-bold font-display",
                pnl >= 0 ? "text-gain" : "text-loss"
              )}>
                {pnl >= 0 ? '+' : ''}{formatValue(pnl)}
              </p>
              <p className="text-xs text-muted-foreground">Total P&L</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-muted-foreground">—</p>
              <p className="text-xs text-muted-foreground">Private</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Growth % */}
      <Card className="glass border-border/50">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-accent" />
          </div>
          {showPortfolioValue || isOwnProfile ? (
            <>
              <p className={cn(
                "text-2xl font-bold font-display",
                pnlPercent >= 0 ? "text-gain" : "text-loss"
              )}>
                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Growth</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-muted-foreground">—</p>
              <p className="text-xs text-muted-foreground">Private</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
