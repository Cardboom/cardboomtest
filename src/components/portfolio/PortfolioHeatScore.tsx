import { motion } from 'framer-motion';
import { Flame, TrendingUp, Eye, Droplets, AlertCircle } from 'lucide-react';
import { usePortfolioHeat } from '@/hooks/usePortfolioHeat';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function PortfolioHeatScore() {
  const { heatData, isLoading, portfolioAlerts } = usePortfolioHeat();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!heatData) {
    return null;
  }

  const getHeatColor = (score: number) => {
    if (score >= 80) return 'text-red-500';
    if (score >= 60) return 'text-orange-500';
    if (score >= 40) return 'text-yellow-500';
    if (score >= 20) return 'text-blue-400';
    return 'text-muted-foreground';
  };

  const getHeatLabel = (score: number) => {
    if (score >= 80) return 'On Fire 🔥';
    if (score >= 60) return 'Hot';
    if (score >= 40) return 'Warming Up';
    if (score >= 20) return 'Cool';
    return 'Cold';
  };

  const getHeatGradient = (score: number) => {
    if (score >= 80) return 'from-red-500/20 to-orange-500/20';
    if (score >= 60) return 'from-orange-500/20 to-yellow-500/20';
    if (score >= 40) return 'from-yellow-500/20 to-green-500/20';
    return 'from-blue-500/20 to-cyan-500/20';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border border-border bg-gradient-to-br p-6",
        getHeatGradient(heatData.score)
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className={cn("h-6 w-6", getHeatColor(heatData.score))} />
          <h3 className="font-bold text-lg">Portfolio Heat Score</h3>
        </div>
        <div className={cn("text-3xl font-bold", getHeatColor(heatData.score))}>
          {heatData.score}
          <span className="text-sm text-muted-foreground">/100</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${heatData.score}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              heatData.score >= 80 ? "bg-gradient-to-r from-orange-500 to-red-500" :
              heatData.score >= 60 ? "bg-gradient-to-r from-yellow-500 to-orange-500" :
              heatData.score >= 40 ? "bg-gradient-to-r from-green-500 to-yellow-500" :
              "bg-gradient-to-r from-blue-500 to-cyan-500"
            )}
          />
        </div>
        <p className={cn("text-sm mt-1 font-medium", getHeatColor(heatData.score))}>
          {getHeatLabel(heatData.score)}
        </p>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 rounded-lg bg-background/50">
          <TrendingUp className="h-4 w-4 mx-auto mb-1 text-primary" />
          <div className="text-lg font-bold">{heatData.priceMovementScore}</div>
          <div className="text-xs text-muted-foreground">Price</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-background/50">
          <Eye className="h-4 w-4 mx-auto mb-1 text-primary" />
          <div className="text-lg font-bold">{heatData.viewsScore}</div>
          <div className="text-xs text-muted-foreground">Views</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-background/50">
          <Droplets className="h-4 w-4 mx-auto mb-1 text-primary" />
          <div className="text-lg font-bold">{heatData.liquidityScore}</div>
          <div className="text-xs text-muted-foreground">Liquidity</div>
        </div>
      </div>

      {/* Activity Alerts */}
      {portfolioAlerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Today's Activity
          </h4>
          {portfolioAlerts.map((alert, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="text-sm text-muted-foreground bg-background/50 rounded-lg px-3 py-2"
            >
              {alert}
            </motion.div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="flex justify-between mt-4 pt-4 border-t border-border/50 text-sm">
        <div>
          <span className="text-muted-foreground">Cards Moved: </span>
          <span className="font-medium">{heatData.movedCards}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Total Views: </span>
          <span className="font-medium">{heatData.totalViews}</span>
        </div>
      </div>
    </motion.div>
  );
}
