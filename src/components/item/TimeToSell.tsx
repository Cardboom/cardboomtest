import { Clock, Zap, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TimeToSellProps {
  category: string;
  rarity?: string;
}

// Mock data - would come from actual sales data in production
const LIQUIDITY_DATA: Record<string, { avgDays: number; medianFirstOffer: number; liquidity: 'high' | 'medium' | 'low' }> = {
  'psa10': { avgDays: 2.1, medianFirstOffer: 0.8, liquidity: 'high' },
  'psa9': { avgDays: 3.5, medianFirstOffer: 1.2, liquidity: 'high' },
  'bgs9.5': { avgDays: 4.2, medianFirstOffer: 1.5, liquidity: 'medium' },
  'raw': { avgDays: 7.8, medianFirstOffer: 3.2, liquidity: 'medium' },
  'default': { avgDays: 5.5, medianFirstOffer: 2.1, liquidity: 'medium' },
};

export const TimeToSell = ({ category, rarity }: TimeToSellProps) => {
  // Generate realistic metrics based on category
  const gradeMetrics = [
    { grade: 'PSA 10', ...LIQUIDITY_DATA.psa10 },
    { grade: 'PSA 9', ...LIQUIDITY_DATA.psa9 },
    { grade: 'BGS 9.5', ...LIQUIDITY_DATA['bgs9.5'] },
    { grade: 'Raw', ...LIQUIDITY_DATA.raw },
  ];

  const getLiquidityColor = (liquidity: string) => {
    switch (liquidity) {
      case 'high': return 'text-gain bg-gain/20';
      case 'medium': return 'text-accent bg-accent/20';
      case 'low': return 'text-loss bg-loss/20';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getLiquidityProgress = (avgDays: number) => {
    // Scale: 1 day = 100%, 10+ days = 10%
    return Math.max(10, Math.min(100, (10 - avgDays) * 11));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Clock className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Time-to-Sell Metrics</h3>
          <p className="text-xs text-muted-foreground">Market liquidity by grade</p>
        </div>
      </div>

      <div className="space-y-4">
        {gradeMetrics.map((metric, index) => (
          <motion.div
            key={metric.grade}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{metric.grade}</span>
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs capitalize", getLiquidityColor(metric.liquidity))}
                >
                  {metric.liquidity} liquidity
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">
                  <Zap className="w-3 h-3 inline mr-1" />
                  {metric.medianFirstOffer}d to offer
                </span>
                <span className="font-semibold text-foreground">
                  {metric.avgDays}d avg
                </span>
              </div>
            </div>
            <Progress 
              value={getLiquidityProgress(metric.avgDays)} 
              className="h-2"
            />
          </motion.div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border/30">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Market Velocity</span>
          <div className="flex items-center gap-1 text-gain">
            <TrendingUp className="w-4 h-4" />
            <span className="font-semibold">Active</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Based on last 30 days of {category} sales on CardBoom
        </p>
      </div>
    </motion.div>
  );
};
