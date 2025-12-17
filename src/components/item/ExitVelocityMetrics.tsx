import { motion } from 'framer-motion';
import { Clock, TrendingUp, TrendingDown, Minus, BarChart3, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface ExitVelocityMetricsProps {
  avgDaysToSell: number | null;
  saleProbability: number | null;
  volumeTrend: 'rising' | 'stable' | 'falling' | null;
  currentPrice: number;
  marketPrice?: number;
  className?: string;
}

export function ExitVelocityMetrics({
  avgDaysToSell,
  saleProbability,
  volumeTrend,
  currentPrice,
  marketPrice,
  className
}: ExitVelocityMetricsProps) {
  const getRecommendation = () => {
    if (!saleProbability) return { label: 'Insufficient Data', color: 'text-muted-foreground', icon: AlertCircle };
    
    if (saleProbability >= 80) {
      return { label: 'Likely to Sell', color: 'text-green-500', icon: CheckCircle };
    }
    if (saleProbability >= 50) {
      return { label: 'Moderate Demand', color: 'text-yellow-500', icon: Minus };
    }
    if (saleProbability >= 30) {
      return { label: 'Hold Recommended', color: 'text-orange-500', icon: AlertCircle };
    }
    return { label: 'Overpriced for Liquidity', color: 'text-red-500', icon: AlertCircle };
  };

  const recommendation = getRecommendation();
  const RecommendationIcon = recommendation.icon;

  const getTrendIcon = () => {
    if (volumeTrend === 'rising') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (volumeTrend === 'falling') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getProbabilityColor = (prob: number | null) => {
    if (!prob) return 'bg-muted';
    if (prob >= 80) return 'bg-green-500';
    if (prob >= 50) return 'bg-yellow-500';
    if (prob >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const priceVsMarket = marketPrice ? ((currentPrice - marketPrice) / marketPrice) * 100 : null;

  return (
    <TooltipProvider>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "rounded-lg border border-border bg-card p-4",
          className
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Exit Velocity
          </h4>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={cn("gap-1", recommendation.color)}
              >
                <RecommendationIcon className="h-3 w-3" />
                {recommendation.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Based on current price, market conditions, and recent sales</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Days to Sell */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center p-2 rounded bg-muted/50">
                <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-lg font-bold">
                  {avgDaysToSell ? `${Math.round(avgDaysToSell)}d` : '—'}
                </div>
                <div className="text-xs text-muted-foreground">Avg Days</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Average days to sell at current price point</p>
            </TooltipContent>
          </Tooltip>

          {/* Sale Probability */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center p-2 rounded bg-muted/50">
                <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all",
                      getProbabilityColor(saleProbability)
                    )}
                    style={{ width: `${saleProbability || 0}%` }}
                  />
                </div>
                <div className="text-lg font-bold">
                  {saleProbability ? `${Math.round(saleProbability)}%` : '—'}
                </div>
                <div className="text-xs text-muted-foreground">Sale Prob.</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Probability of sale within 30 days at current price</p>
              {saleProbability && saleProbability < 50 && (
                <p className="text-yellow-500">Consider reducing price for faster sale</p>
              )}
            </TooltipContent>
          </Tooltip>

          {/* Volume Trend */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center p-2 rounded bg-muted/50">
                <div className="h-4 w-4 mx-auto mb-1">
                  {getTrendIcon()}
                </div>
                <div className="text-lg font-bold capitalize">
                  {volumeTrend || '—'}
                </div>
                <div className="text-xs text-muted-foreground">Volume</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Market volume trend over last 30 days</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Price vs Market */}
        {priceVsMarket !== null && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">vs Market Price</span>
              <span className={cn(
                "font-medium",
                priceVsMarket > 5 ? "text-red-500" :
                priceVsMarket < -5 ? "text-green-500" :
                "text-muted-foreground"
              )}>
                {priceVsMarket > 0 ? '+' : ''}{priceVsMarket.toFixed(1)}%
              </span>
            </div>
            {priceVsMarket > 10 && (
              <p className="text-xs text-orange-500 mt-1">
                Price is significantly above market. Consider adjusting for faster sale.
              </p>
            )}
          </div>
        )}
      </motion.div>
    </TooltipProvider>
  );
}
