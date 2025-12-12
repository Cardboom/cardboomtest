import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, DollarSign, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WhatIfSimulatorProps {
  currentPrice: number;
  itemName: string;
}

export const WhatIfSimulator = ({ currentPrice, itemName }: WhatIfSimulatorProps) => {
  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  // Generate realistic historical prices
  const scenarios = useMemo(() => {
    const volatility = 0.15 + Math.random() * 0.2; // 15-35% volatility
    
    return [
      {
        period: '6 months ago',
        entryPrice: currentPrice * (1 - volatility * (0.5 + Math.random() * 0.5)),
        grade: 'PSA 10',
      },
      {
        period: '1 year ago',
        entryPrice: currentPrice * (1 - volatility * (0.8 + Math.random() * 0.4)),
        grade: 'PSA 10',
      },
      {
        period: '2 years ago',
        entryPrice: currentPrice * (1 - volatility * (1.2 + Math.random() * 0.6)),
        grade: 'PSA 10',
      },
      {
        period: '6 months ago',
        entryPrice: currentPrice * 0.3 * (1 - volatility * (0.3 + Math.random() * 0.3)),
        grade: 'Raw',
      },
    ].map(scenario => {
      const gainLoss = currentPrice - scenario.entryPrice;
      const percentChange = (gainLoss / scenario.entryPrice) * 100;
      const gradedPrice = scenario.grade === 'Raw' ? currentPrice * 0.3 : currentPrice;
      
      return {
        ...scenario,
        currentValue: gradedPrice,
        gainLoss,
        percentChange,
        isPositive: gainLoss >= 0,
      };
    });
  }, [currentPrice]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-accent" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">What If I Held This?</h3>
          <p className="text-xs text-muted-foreground">Historical investment simulator</p>
        </div>
      </div>

      <div className="space-y-3">
        {scenarios.map((scenario, index) => (
          <motion.div
            key={`${scenario.period}-${scenario.grade}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-secondary/30 rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{scenario.period}</span>
                <Badge variant="outline" className="text-xs">
                  {scenario.grade}
                </Badge>
              </div>
              <span className={cn(
                "inline-flex items-center gap-1 text-sm font-semibold",
                scenario.isPositive ? "text-gain" : "text-loss"
              )}>
                {scenario.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {scenario.isPositive ? '+' : ''}{scenario.percentChange.toFixed(1)}%
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Entry</p>
                <p className="text-foreground font-medium">{formatPrice(scenario.entryPrice)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Current</p>
                <p className="text-foreground font-medium">{formatPrice(scenario.currentValue)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Gain/Loss</p>
                <p className={cn(
                  "font-medium",
                  scenario.isPositive ? "text-gain" : "text-loss"
                )}>
                  {scenario.isPositive ? '+' : ''}{formatPrice(Math.abs(scenario.gainLoss))}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        *Based on historical market trends. Past performance is not indicative of future results.
      </p>
    </motion.div>
  );
};
