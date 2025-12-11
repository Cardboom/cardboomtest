import { TrendingUp, TrendingDown } from 'lucide-react';
import { mockCollectibles } from '@/data/mockData';

export const MarketTicker = () => {
  const trendingItems = mockCollectibles.filter(item => item.trending);

  return (
    <div className="bg-muted/50 border-b border-border/50 overflow-hidden">
      <div className="flex animate-ticker">
        {[...trendingItems, ...trendingItems].map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="flex items-center gap-2 px-6 py-2 whitespace-nowrap border-r border-border/30"
          >
            <span className="text-sm text-muted-foreground">{item.name.slice(0, 20)}...</span>
            <span className="text-sm font-semibold text-foreground">
              ${item.price.toLocaleString()}
            </span>
            <span className={`flex items-center gap-1 text-xs font-medium ${item.priceChange >= 0 ? 'text-gain' : 'text-loss'}`}>
              {item.priceChange >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {item.priceChange >= 0 ? '+' : ''}{item.priceChange.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
