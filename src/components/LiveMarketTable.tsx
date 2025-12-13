import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MarketItem {
  id: string;
  name: string;
  image: string;
  price: number;
  priceChange: number;
  category: string;
}

interface LiveMarketTableProps {
  items: MarketItem[];
  title: string;
}

export const LiveMarketTable = ({ items, title }: LiveMarketTableProps) => {
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-border/50">
        <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary hover:text-primary/80 font-semibold"
          onClick={() => navigate('/markets')}
        >
          View All
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
      
      <div className="divide-y divide-border/30">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
          <div className="col-span-5">Name</div>
          <div className="col-span-3 text-right">Price</div>
          <div className="col-span-4 text-right">24h Change</div>
        </div>
        
        {/* Rows */}
        {items.slice(0, 5).map((item) => {
          const isPositive = item.priceChange >= 0;
          return (
            <div 
              key={item.id}
              className="grid grid-cols-12 gap-4 px-5 py-4 hover:bg-muted/20 transition-colors cursor-pointer"
              onClick={() => navigate(`/item/${item.id}`)}
            >
              <div className="col-span-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary/50 shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
              </div>
              <div className="col-span-3 text-right flex items-center justify-end">
                <span className="font-semibold text-foreground">{formatPrice(item.price)}</span>
              </div>
              <div className="col-span-4 text-right flex items-center justify-end gap-1">
                {isPositive ? (
                  <TrendingUp className="w-4 h-4 text-gain" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-loss" />
                )}
                <span className={cn(
                  'font-semibold text-sm',
                  isPositive ? 'text-gain' : 'text-loss'
                )}>
                  {isPositive ? '+' : ''}{item.priceChange.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
