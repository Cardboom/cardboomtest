import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeftRight, TrendingUp, TrendingDown, ExternalLink,
  Check, X, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ArbitrageItem {
  id: string;
  name: string;
  category: string;
  image: string;
  price: number;
  externalPrice: number;
  condition: string;
}

interface ArbitrageViewProps {
  deals: ArbitrageItem[];
}

export const ArbitrageView = ({ deals }: ArbitrageViewProps) => {
  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  const arbitrageOpportunities = useMemo(() => {
    return deals
      .map(deal => {
        const priceDiff = deal.externalPrice - deal.price;
        const percentDiff = (priceDiff / deal.price) * 100;
        const cardBoomCheaper = priceDiff > 0;
        
        return {
          ...deal,
          priceDiff,
          percentDiff,
          cardBoomCheaper,
          opportunity: Math.abs(percentDiff) > 3 ? 'strong' : Math.abs(percentDiff) > 1 ? 'moderate' : 'none'
        };
      })
      .filter(d => Math.abs(d.percentDiff) > 1)
      .sort((a, b) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff));
  }, [deals]);

  const cardBoomDeals = arbitrageOpportunities.filter(d => d.cardBoomCheaper).length;
  const externalDeals = arbitrageOpportunities.filter(d => !d.cardBoomCheaper).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{arbitrageOpportunities.length}</p>
              <p className="text-sm text-muted-foreground">Arbitrage Opportunities</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gain/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-gain" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gain">{cardBoomDeals}</p>
              <p className="text-sm text-muted-foreground">CardBoom Cheaper</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{externalDeals}</p>
              <p className="text-sm text-muted-foreground">External Cheaper</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Info Banner */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-foreground font-medium">Cross-Market Price Intelligence</p>
          <p className="text-muted-foreground text-sm">
            Compare CardBoom prices against aggregated market data. Green highlights where CardBoom offers better value.
          </p>
        </div>
      </div>

      {/* Arbitrage Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left p-4 text-muted-foreground font-medium text-sm">Card</th>
                <th className="text-right p-4 text-muted-foreground font-medium text-sm">CardBoom</th>
                <th className="text-right p-4 text-muted-foreground font-medium text-sm">External Avg</th>
                <th className="text-right p-4 text-muted-foreground font-medium text-sm">Difference</th>
                <th className="text-center p-4 text-muted-foreground font-medium text-sm">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {arbitrageOpportunities.slice(0, 20).map((item, index) => (
                <motion.tr 
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-t border-border/30 hover:bg-secondary/30 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-12 h-12 rounded-lg object-cover bg-secondary"
                      />
                      <div>
                        <p className="font-medium text-foreground line-clamp-1">{item.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{item.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className={cn(
                      "font-semibold",
                      item.cardBoomCheaper ? "text-gain" : "text-foreground"
                    )}>
                      {formatPrice(item.price)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className={cn(
                      "font-semibold",
                      !item.cardBoomCheaper ? "text-gain" : "text-foreground"
                    )}>
                      {formatPrice(item.externalPrice)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium",
                      item.cardBoomCheaper ? "bg-gain/20 text-gain" : "bg-loss/20 text-loss"
                    )}>
                      {item.cardBoomCheaper ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : (
                        <TrendingUp className="w-3 h-3" />
                      )}
                      {item.cardBoomCheaper ? '-' : '+'}{Math.abs(item.percentDiff).toFixed(1)}%
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <Badge 
                      variant={item.cardBoomCheaper ? "default" : "secondary"}
                      className={cn(
                        item.cardBoomCheaper ? "bg-gain text-gain-foreground" : ""
                      )}
                    >
                      {item.cardBoomCheaper ? 'Buy on CardBoom' : 'External Better'}
                    </Badge>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
