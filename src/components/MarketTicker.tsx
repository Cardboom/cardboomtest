import { TrendingUp, TrendingDown } from 'lucide-react';
import { mockCollectibles } from '@/data/mockData';
import { useLivePrices } from '@/hooks/useLivePrices';

export const MarketTicker = () => {
  const trendingItems = mockCollectibles.filter(item => item.trending);
  const productIds = trendingItems.map(item => item.priceId);
  
  const { prices, getPrice } = useLivePrices({ 
    productIds, 
    refreshInterval: 30000,
    enabled: true 
  });

  const getDisplayPrice = (item: typeof trendingItems[0]) => {
    const livePrice = getPrice(item.priceId);
    if (livePrice) {
      return {
        price: livePrice.price,
        change: livePrice.change,
      };
    }
    return {
      price: item.price,
      change: item.priceChange,
    };
  };

  return (
    <div className="bg-muted/30 border-b border-border/40 overflow-hidden">
      <div className="flex animate-ticker">
        {[...trendingItems, ...trendingItems].map((item, index) => {
          const { price, change } = getDisplayPrice(item);
          return (
            <div
              key={`${item.id}-${index}`}
              className="flex items-center gap-2 px-6 py-2.5 whitespace-nowrap border-r border-border/20"
            >
              <span className="text-sm text-muted-foreground font-medium">{item.name.slice(0, 25)}...</span>
              <span className="text-sm font-semibold text-foreground">
                ₺{price.toLocaleString()}
              </span>
              <span className={`flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-gain' : 'text-loss'}`}>
                {change >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
