import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, BadgeCheck, Lock, Heart, Bell, TrendingUp, TrendingDown,
  Clock, Zap, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CardHeroSectionProps {
  item: {
    name: string;
    category: string;
    set_name?: string;
    series?: string;
    rarity?: string;
    is_trending?: boolean;
    current_price?: number;
    change_7d?: number;
    year?: number;
    edition?: string;
  };
  soldLast24h: number;
  soldLast7d: number;
  medianSellTime: number;
  isWatching: boolean;
  onToggleWatchlist: () => void;
  onBuyNow: () => void;
  isPending?: boolean;
}

export const CardHeroSection = ({
  item,
  soldLast24h,
  soldLast7d,
  medianSellTime,
  isWatching,
  onToggleWatchlist,
  onBuyNow,
  isPending,
}: CardHeroSectionProps) => {
  const change7d = item.change_7d || 0;
  const isPositive = change7d >= 0;

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  return (
    <div className="space-y-4">
      {/* Card Name & Edition */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="secondary" className="capitalize text-xs">
            {item.category?.replace('-', ' ')}
          </Badge>
          {item.is_trending && (
            <Badge className="bg-accent text-accent-foreground text-xs">
              <Zap className="w-3 h-3 mr-1" />
              Trending
            </Badge>
          )}
          {item.rarity && (
            <Badge variant="outline" className="text-xs capitalize">{item.rarity}</Badge>
          )}
        </div>
        
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
          {item.name}
        </h1>
        
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          {item.edition && <span className="font-medium">{item.edition} • </span>}
          {item.set_name && `${item.set_name} • `}
          {item.series}
          {item.year && ` • ${item.year}`}
        </p>
      </div>

      {/* Trust Badges */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gain/10 border border-gain/20 text-xs font-medium text-gain">
          <Shield className="w-3.5 h-3.5" />
          Escrow Protected
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
          <BadgeCheck className="w-3.5 h-3.5" />
          Verified Seller
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-xs font-medium text-foreground">
          <Lock className="w-3.5 h-3.5" />
          Secure Payment
        </div>
      </div>

      {/* Current Price */}
      <div className="glass rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-xs sm:text-sm mb-1">Current Price</p>
            <p className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              {formatPrice(item.current_price || 0)}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold",
              isPositive ? "bg-gain/20 text-gain" : "bg-loss/20 text-loss"
            )}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="text-sm sm:text-base">
                {isPositive ? '+' : ''}{change7d.toFixed(1)}%
              </span>
              <span className="text-xs opacity-75">vs 7d avg</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={onBuyNow} 
          size="lg" 
          className="flex-1 h-12 sm:h-14 text-base sm:text-lg font-semibold gap-2"
        >
          Buy Now
          <ExternalLink className="w-4 h-4" />
        </Button>
        <Button 
          onClick={onToggleWatchlist}
          variant={isWatching ? "secondary" : "outline"}
          size="lg"
          className="h-12 sm:h-14 gap-2"
          disabled={isPending}
        >
          <Heart className={cn("w-5 h-5", isWatching && "fill-current text-loss")} />
          <span className="hidden sm:inline">{isWatching ? 'Watching' : 'Add to Watchlist'}</span>
          <span className="sm:hidden">{isWatching ? 'Watching' : 'Watchlist'}</span>
        </Button>
        <Button variant="outline" size="lg" className="h-12 sm:h-14 gap-2">
          <Bell className="w-5 h-5" />
          <span className="hidden sm:inline">Price Alert</span>
        </Button>
      </div>

      {/* Liquidity Indicator */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 rounded-lg bg-muted/50 border border-border/50">
        <div className="flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{soldLast24h}</span> sold in 24h
          </span>
        </div>
        <div className="h-4 w-px bg-border hidden sm:block" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{soldLast7d}</span> sold in 7 days
          </span>
        </div>
        <div className="h-4 w-px bg-border hidden sm:block" />
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Median sell time: <span className="font-semibold text-foreground">{medianSellTime} days</span>
          </span>
        </div>
      </div>
    </div>
  );
};
