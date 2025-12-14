import { TrendingUp, TrendingDown, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LiveTickerPrice } from './LiveTickerPrice';
import { Badge } from '@/components/ui/badge';

interface MarketItem {
  id: string;
  name: string;
  image: string;
  price: number;
  priceChange: number;
  category: string;
  priceUpdated?: boolean;
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
    <div className="rounded-2xl border border-border/50 bg-card/80 overflow-hidden backdrop-blur-sm">
      <div className="flex items-center justify-between p-5 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
          <Badge variant="outline" className="gap-1 text-xs">
            <span className="w-1.5 h-1.5 bg-gain rounded-full animate-pulse" />
            LIVE
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary hover:text-primary/80 font-semibold group"
          onClick={() => navigate('/markets')}
        >
          View All
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
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
        {items.slice(0, 5).map((item, index) => {
          const isPositive = item.priceChange >= 0;
          return (
            <div 
              key={item.id}
              className={cn(
                "grid grid-cols-12 gap-4 px-5 py-4 hover:bg-muted/20 transition-all cursor-pointer group",
                item.priceUpdated && "row-updated"
              )}
              onClick={() => navigate(`/item/${item.id}`)}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="col-span-5 flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-secondary/50 shrink-0 ring-2 ring-border/50 group-hover:ring-primary/30 transition-all">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  {index === 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gold rounded-full flex items-center justify-center">
                      <Sparkles className="w-2.5 h-2.5 text-background" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
              </div>
              <div className="col-span-3 text-right flex items-center justify-end">
                <LiveTickerPrice value={item.price} tickInterval={2500} volatility={0.002} className="text-sm font-semibold" />
              </div>
              <div className="col-span-4 text-right flex items-center justify-end gap-1.5">
                <div className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold',
                  isPositive ? 'bg-gain/10 text-gain' : 'bg-loss/10 text-loss'
                )}>
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {isPositive ? '+' : ''}{item.priceChange.toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
