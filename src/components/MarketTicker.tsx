import { TrendingUp, TrendingDown } from 'lucide-react';
import { mockCollectibles } from '@/data/mockData';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useMemo } from 'react';
import { useLivePrices } from '@/hooks/useLivePrices';

export const MarketTicker = () => {
  const { formatPrice } = useCurrency();
  const trendingMock = useMemo(() => mockCollectibles.filter(item => item.trending), []);
  
  const productIds = useMemo(() => trendingMock.map(item => item.id), []);
  const { prices } = useLivePrices({ productIds, refreshInterval: 30000 });
  
  const trendingItems = useMemo(() => 
    trendingMock.map(item => {
      const livePrice = prices[item.id];
      return {
        id: item.id,
        name: item.name,
        price: livePrice?.price ?? item.price,
        change: livePrice?.change ?? item.priceChange,
      };
    }), 
  [prices]);

  const duplicatedItems = useMemo(() => 
    [...trendingItems, ...trendingItems], 
  [trendingItems]);

  return (
    <div className="bg-muted/30 border-b border-border/40 overflow-hidden">
      <div className="flex animate-ticker">
        {duplicatedItems.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="flex items-center gap-2 px-6 py-2.5 whitespace-nowrap border-r border-border/20"
          >
            <span className="text-sm text-muted-foreground font-medium">
              {item.name.slice(0, 25)}...
            </span>
            <span className="text-sm font-semibold text-foreground">
              {formatPrice(item.price)}
            </span>
            <span className={`flex items-center gap-1 text-xs font-medium ${item.change >= 0 ? 'text-gain' : 'text-loss'}`}>
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
