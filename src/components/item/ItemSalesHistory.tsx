import { Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemSalesHistoryProps {
  itemId: string;
}

// Mock sales data
const MOCK_SALES = [
  { id: '1', price: 425000, grade: 'PSA 10', date: '2 hours ago', platform: 'CardBoom' },
  { id: '2', price: 418000, grade: 'PSA 10', date: '5 hours ago', platform: 'CardBoom' },
  { id: '3', price: 421000, grade: 'PSA 10', date: '1 day ago', platform: 'eBay' },
  { id: '4', price: 410000, grade: 'PSA 10', date: '2 days ago', platform: 'CardBoom' },
  { id: '5', price: 395000, grade: 'PSA 9', date: '3 days ago', platform: 'eBay' },
  { id: '6', price: 430000, grade: 'PSA 10', date: '4 days ago', platform: 'CardBoom' },
  { id: '7', price: 388000, grade: 'PSA 9', date: '5 days ago', platform: 'PWCC' },
  { id: '8', price: 415000, grade: 'PSA 10', date: '1 week ago', platform: 'CardBoom' },
];

export const ItemSalesHistory = ({ itemId }: ItemSalesHistoryProps) => {
  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-6 border-b border-border/50">
        <h3 className="font-display text-xl font-semibold text-foreground">Recent Sales</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Last {MOCK_SALES.length} verified transactions
        </p>
      </div>

      <div className="divide-y divide-border/30">
        {MOCK_SALES.map((sale, index) => {
          const prevSale = MOCK_SALES[index + 1];
          const priceChange = prevSale 
            ? ((sale.price - prevSale.price) / prevSale.price) * 100 
            : 0;

          return (
            <div 
              key={sale.id}
              className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-foreground font-semibold">{formatPrice(sale.price)}</p>
                  <p className="text-muted-foreground text-sm">{sale.date}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    sale.grade === 'PSA 10' ? "bg-gold/20 text-gold" : "bg-purple-500/20 text-purple-400"
                  )}>
                    {sale.grade}
                  </span>
                </div>
                <div className="text-right min-w-20">
                  <span className="text-muted-foreground text-xs">{sale.platform}</span>
                </div>
                {index < MOCK_SALES.length - 1 && (
                  <div className="min-w-16 text-right">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-sm font-medium",
                      priceChange >= 0 ? "text-gain" : "text-loss"
                    )}>
                      {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
