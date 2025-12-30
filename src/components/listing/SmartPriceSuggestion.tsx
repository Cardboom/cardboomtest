import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, TrendingDown, Minus, Zap, 
  AlertTriangle, CheckCircle, Info, DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SmartPriceSuggestionProps {
  itemName: string;
  category: string;
  condition?: string;
  currentPrice?: number;
  onPriceSelect?: (price: number) => void;
}

interface PriceSuggestion {
  marketPrice: number;
  quickSellPrice: number;
  maxProfitPrice: number;
  competitivePrice: number;
  priceConfidence: 'high' | 'medium' | 'low';
  recentSales: number;
  activeListings: number;
  avgDaysToSell: number | null;
  priceVsMarket: 'below' | 'at' | 'above' | null;
  percentDiff: number | null;
}

export const SmartPriceSuggestion = ({
  itemName,
  category,
  condition = 'near_mint',
  currentPrice,
  onPriceSelect,
}: SmartPriceSuggestionProps) => {
  const [suggestion, setSuggestion] = useState<PriceSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formatPrice, currency } = useCurrency();

  useEffect(() => {
    const fetchPriceSuggestion = async () => {
      if (!itemName || itemName.length < 3) {
        setSuggestion(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Search for matching market item
        const { data: marketItems } = await supabase
          .from('market_items')
          .select('id, name, current_price, change_24h, change_7d, views_24h, liquidity')
          .ilike('name', `%${itemName}%`)
          .eq('category', category)
          .gt('current_price', 0)
          .limit(1)
          .single();

        if (!marketItems) {
          setError('No market data found for this item');
          setSuggestion(null);
          return;
        }

        const marketPrice = marketItems.current_price || 0;

        // Get recent sales count
        const { count: recentSales } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        // Get active listings count
        const { count: activeListings } = await supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .ilike('title', `%${itemName}%`);

        // Calculate price suggestions
        const quickSellPrice = marketPrice * 0.85; // 15% below market for quick sale
        const maxProfitPrice = marketPrice * 1.1; // 10% above market
        const competitivePrice = marketPrice * 0.95; // 5% below for competitive edge

        // Determine confidence based on liquidity
        let priceConfidence: 'high' | 'medium' | 'low' = 'medium';
        if (marketItems.liquidity === 'high') priceConfidence = 'high';
        else if (marketItems.liquidity === 'low') priceConfidence = 'low';

        // Compare current price to market
        let priceVsMarket: 'below' | 'at' | 'above' | null = null;
        let percentDiff: number | null = null;

        if (currentPrice && marketPrice > 0) {
          percentDiff = ((currentPrice - marketPrice) / marketPrice) * 100;
          if (percentDiff < -5) priceVsMarket = 'below';
          else if (percentDiff > 5) priceVsMarket = 'above';
          else priceVsMarket = 'at';
        }

        setSuggestion({
          marketPrice,
          quickSellPrice,
          maxProfitPrice,
          competitivePrice,
          priceConfidence,
          recentSales: recentSales || 0,
          activeListings: activeListings || 0,
          avgDaysToSell: marketItems.liquidity === 'high' ? 3 : marketItems.liquidity === 'medium' ? 7 : 14,
          priceVsMarket,
          percentDiff,
        });
      } catch (err) {
        console.error('Price suggestion error:', err);
        setError('Unable to fetch price data');
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchPriceSuggestion, 500);
    return () => clearTimeout(debounce);
  }, [itemName, category, currentPrice]);

  if (!itemName || itemName.length < 3) {
    return null;
  }

  if (loading) {
    return (
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !suggestion) {
    return (
      <div className="glass rounded-xl p-4 border border-border/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info className="w-4 h-4" />
          <span className="text-sm">{error || 'Enter item name to see pricing suggestions'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4 border border-primary/20">
      {/* Header with confidence */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground text-sm">Smart Pricing</span>
        </div>
        <Badge 
          variant="secondary" 
          className={cn(
            "text-xs",
            suggestion.priceConfidence === 'high' && "bg-gain/20 text-gain",
            suggestion.priceConfidence === 'medium' && "bg-accent/20 text-accent-foreground",
            suggestion.priceConfidence === 'low' && "bg-muted text-muted-foreground"
          )}
        >
          {suggestion.priceConfidence} confidence
        </Badge>
      </div>

      {/* Current price comparison */}
      {currentPrice && suggestion.priceVsMarket && (
        <div className={cn(
          "flex items-center gap-2 p-2 rounded-lg mb-4",
          suggestion.priceVsMarket === 'below' && "bg-gain/10",
          suggestion.priceVsMarket === 'above' && "bg-loss/10",
          suggestion.priceVsMarket === 'at' && "bg-muted/50"
        )}>
          {suggestion.priceVsMarket === 'below' && (
            <>
              <TrendingDown className="w-4 h-4 text-gain" />
              <span className="text-gain text-sm">
                {Math.abs(suggestion.percentDiff!).toFixed(0)}% below market — will sell fast!
              </span>
            </>
          )}
          {suggestion.priceVsMarket === 'above' && (
            <>
              <TrendingUp className="w-4 h-4 text-loss" />
              <span className="text-loss text-sm">
                {Math.abs(suggestion.percentDiff!).toFixed(0)}% above market — may take longer
              </span>
            </>
          )}
          {suggestion.priceVsMarket === 'at' && (
            <>
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="text-foreground text-sm">
                Priced competitively at market value
              </span>
            </>
          )}
        </div>
      )}

      {/* Price options */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <PriceOption
          label="Quick Sell"
          price={suggestion.quickSellPrice}
          description="Sell within 24h"
          icon={<Zap className="w-3 h-3" />}
          variant="fast"
          formatPrice={formatPrice}
          onSelect={() => onPriceSelect?.(suggestion.quickSellPrice)}
        />
        <PriceOption
          label="Competitive"
          price={suggestion.competitivePrice}
          description="Market rate"
          icon={<DollarSign className="w-3 h-3" />}
          variant="balanced"
          formatPrice={formatPrice}
          onSelect={() => onPriceSelect?.(suggestion.competitivePrice)}
          recommended
        />
        <PriceOption
          label="Max Profit"
          price={suggestion.maxProfitPrice}
          description="Wait for buyer"
          icon={<TrendingUp className="w-3 h-3" />}
          variant="profit"
          formatPrice={formatPrice}
          onSelect={() => onPriceSelect?.(suggestion.maxProfitPrice)}
        />
      </div>

      {/* Market stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
        <span>Market: {formatPrice(suggestion.marketPrice)}</span>
        <span>~{suggestion.avgDaysToSell}d to sell</span>
        <span>{suggestion.activeListings} competing</span>
      </div>
    </div>
  );
};

interface PriceOptionProps {
  label: string;
  price: number;
  description: string;
  icon: React.ReactNode;
  variant: 'fast' | 'balanced' | 'profit';
  formatPrice: (price: number) => string;
  onSelect: () => void;
  recommended?: boolean;
}

const PriceOption = ({ 
  label, 
  price, 
  description, 
  icon, 
  variant, 
  formatPrice, 
  onSelect,
  recommended 
}: PriceOptionProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={onSelect}
        className={cn(
          "relative p-3 rounded-lg border transition-all text-left hover:scale-[1.02]",
          variant === 'fast' && "border-gain/30 bg-gain/5 hover:border-gain/50",
          variant === 'balanced' && "border-primary/30 bg-primary/5 hover:border-primary/50",
          variant === 'profit' && "border-accent/30 bg-accent/5 hover:border-accent/50"
        )}
      >
        {recommended && (
          <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] px-1.5">
            Best
          </Badge>
        )}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          {icon}
          <span>{label}</span>
        </div>
        <p className={cn(
          "font-bold text-sm",
          variant === 'fast' && "text-gain",
          variant === 'balanced' && "text-primary",
          variant === 'profit' && "text-foreground"
        )}>
          {formatPrice(price)}
        </p>
      </button>
    </TooltipTrigger>
    <TooltipContent>
      <p>{description}</p>
    </TooltipContent>
  </Tooltip>
);

export default SmartPriceSuggestion;
