import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Eye, ShoppingCart, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SentimentIndicatorProps {
  priceChange24h: number;
  priceChange7d: number;
  views24h: number;
  salesCount30d: number;
  watchlistCount: number;
}

export const SentimentIndicator = ({ 
  priceChange24h, 
  priceChange7d, 
  views24h, 
  salesCount30d,
  watchlistCount 
}: SentimentIndicatorProps) => {
  
  const sentiment = useMemo(() => {
    // Calculate sentiment score based on multiple factors
    let score = 0;
    
    // Price momentum (weight: 40%)
    if (priceChange24h > 5) score += 2;
    else if (priceChange24h > 0) score += 1;
    else if (priceChange24h < -5) score -= 2;
    else if (priceChange24h < 0) score -= 1;
    
    if (priceChange7d > 10) score += 2;
    else if (priceChange7d > 0) score += 1;
    else if (priceChange7d < -10) score -= 2;
    else if (priceChange7d < 0) score -= 1;
    
    // Volume/activity (weight: 30%)
    if (views24h > 500) score += 1;
    if (salesCount30d > 20) score += 1;
    if (watchlistCount > 100) score += 1;
    
    // Determine sentiment
    if (score >= 3) return { label: 'Bullish', color: 'text-gain', bg: 'bg-gain/20', icon: TrendingUp };
    if (score <= -2) return { label: 'Bearish', color: 'text-loss', bg: 'bg-loss/20', icon: TrendingDown };
    return { label: 'Neutral', color: 'text-muted-foreground', bg: 'bg-muted', icon: Minus };
  }, [priceChange24h, priceChange7d, views24h, salesCount30d, watchlistCount]);

  const factors = [
    { 
      label: 'Price Momentum', 
      value: priceChange24h, 
      isPositive: priceChange24h >= 0,
      format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
      icon: BarChart2
    },
    { 
      label: 'Weekly Trend', 
      value: priceChange7d, 
      isPositive: priceChange7d >= 0,
      format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
      icon: TrendingUp
    },
    { 
      label: 'Views (24h)', 
      value: views24h, 
      isPositive: views24h > 200,
      format: (v: number) => v.toLocaleString(),
      icon: Eye
    },
    { 
      label: 'Sales (30d)', 
      value: salesCount30d, 
      isPositive: salesCount30d > 10,
      format: (v: number) => v.toString(),
      icon: ShoppingCart
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", sentiment.bg)}>
            <sentiment.icon className={cn("w-4 h-4", sentiment.color)} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Market Sentiment</h3>
            <p className="text-xs text-muted-foreground">Multi-factor analysis</p>
          </div>
        </div>
        <div className={cn(
          "px-4 py-2 rounded-full font-bold text-lg",
          sentiment.bg, sentiment.color
        )}>
          {sentiment.label}
        </div>
      </div>

      {/* Sentiment Meter */}
      <div className="relative h-3 bg-gradient-to-r from-loss via-muted to-gain rounded-full mb-6 overflow-hidden">
        <motion.div 
          initial={{ left: '50%' }}
          animate={{ 
            left: sentiment.label === 'Bullish' ? '80%' : 
                  sentiment.label === 'Bearish' ? '20%' : '50%' 
          }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-foreground rounded-full shadow-lg border-2 border-background"
        />
      </div>

      {/* Factor Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {factors.map((factor, index) => (
          <motion.div
            key={factor.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-secondary/30 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <factor.icon className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{factor.label}</span>
            </div>
            <p className={cn(
              "font-semibold",
              factor.isPositive ? "text-gain" : "text-foreground"
            )}>
              {factor.format(factor.value)}
            </p>
          </motion.div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Sentiment based on price action, volume, and market activity
      </p>
    </motion.div>
  );
};
