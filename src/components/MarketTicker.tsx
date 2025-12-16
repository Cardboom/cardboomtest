import { TrendingUp, TrendingDown } from 'lucide-react';
import { mockCollectibles } from '@/data/mockData';
import { useMemo } from 'react';
import { usePrices } from '@/contexts/PriceContext';
import { cn } from '@/lib/utils';
import { LiveTickerPrice } from './LiveTickerPrice';
import { formatGrade } from '@/hooks/useGradePrices';

export const MarketTicker = () => {
  const trendingMock = useMemo(() => mockCollectibles.filter(item => item.trending), []);
  const { prices } = usePrices();
  
  const trendingItems = useMemo(() => 
    trendingMock.map(item => {
      const livePrice = prices[item.priceId];
      return {
        id: item.id,
        name: item.name,
        grade: item.grade,
        price: livePrice?.price ?? item.price,
        change: livePrice?.change ?? item.priceChange,
        updated: livePrice?.updated ?? false,
      };
    }), 
  [trendingMock, prices]);

  const duplicatedItems = useMemo(() => 
    [...trendingItems, ...trendingItems], 
  [trendingItems]);

  return (
    <div className="bg-muted/30 border-b border-border/40 overflow-hidden">
      <div className="flex animate-ticker">
        {duplicatedItems.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 whitespace-nowrap border-r border-border/20 transition-all duration-300",
              item.updated && "bg-primary/5"
            )}
          >
            <span className="text-sm text-muted-foreground font-medium">
              {item.name.slice(0, 20)}{item.name.length > 20 ? '...' : ''}
            </span>
            {item.grade && (
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded font-semibold",
                item.grade === 'psa10' && "bg-gold/20 text-gold",
                item.grade === 'psa9' && "bg-purple-500/20 text-purple-400",
                item.grade === 'psa8' && "bg-blue-500/20 text-blue-400",
                !['psa10', 'psa9', 'psa8'].includes(item.grade) && "bg-secondary/50 text-muted-foreground"
              )}>
                {formatGrade(item.grade)}
              </span>
            )}
            <span className="text-sm font-semibold">
              <LiveTickerPrice value={item.price} tickInterval={2000} volatility={0.0015} />
            </span>
            <span className={cn(
              'flex items-center gap-1 text-xs font-medium transition-all duration-300',
              item.change >= 0 ? 'text-gain' : 'text-loss',
              item.updated && "scale-105"
            )}>
              {item.change >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
