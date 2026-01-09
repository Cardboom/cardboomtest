import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, DollarSign, AlertCircle, Info, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ItemPriceChart } from '@/components/item/ItemPriceChart';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getPriceDisplay, hasGradePrice, type PriceStatus } from '@/utils/priceDisplay';

interface PriceMarketPanelProps {
  itemId: string;
  productId?: string;
  itemName: string;
  category?: string;
  currentPrice: number | null;
  lastSalePrice?: number | null;
  floorPrice?: number | null;
  highestRecentSale?: number | null;
  volume24h?: number;
  volume30d?: number;
  tcgplayerPrice?: number;
  cardmarketPrice?: number;
  confidenceBand?: { low: number; high: number };
  priceChange24h?: number;
  priceChange7d?: number;
  priceChange30d?: number;
  psa10Price?: number | null;
  rawPrice?: number | null;
  // New pricing fields
  priceStatus?: PriceStatus | string | null;
  verifiedPrice?: number | null;
  listingMedianPrice?: number | null;
  listingSampleCount?: number;
}

export const PriceMarketPanel = ({
  itemId,
  productId,
  itemName,
  category,
  currentPrice,
  lastSalePrice,
  floorPrice,
  highestRecentSale,
  volume24h = 0,
  volume30d = 0,
  tcgplayerPrice,
  cardmarketPrice,
  confidenceBand,
  priceChange24h = 0,
  priceChange7d = 0,
  priceChange30d = 0,
  psa10Price,
  rawPrice,
  priceStatus,
  verifiedPrice,
  listingMedianPrice,
  listingSampleCount = 0,
}: PriceMarketPanelProps) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  
  // Categories that show graded prices
  const showGradedPrices = ['pokemon', 'one-piece', 'yugioh', 'mtg', 'sports', 'nba', 'nfl', 'mlb'].includes(category?.toLowerCase() || '');

  // Get price display info based on status
  const priceInfo = getPriceDisplay(
    currentPrice,
    priceStatus,
    verifiedPrice,
    listingMedianPrice,
    listingSampleCount
  );

  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined || price === 0) return '—';
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const PriceChangeIndicator = ({ change, label }: { change: number; label: string }) => (
    <div className="text-center">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <span className={cn(
        "inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums",
        change >= 0 ? "text-gain" : "text-loss"
      )}>
        {change >= 0 ? '+' : ''}{change.toFixed(1)}%
      </span>
    </div>
  );

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Price & Market Data
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Info className="w-4 h-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">Prices are calculated using weighted median to prevent manipulation. Confidence band shows expected price range.</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Insufficient Data Warning */}
        {!priceInfo.hasPrice && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span className="font-semibold text-amber-400">Insufficient Market Data</span>
            </div>
            <p className="text-sm text-muted-foreground">
              We don't have enough verified sales data to display an accurate market price for this item.
              {listingSampleCount > 0 && ` There are ${listingSampleCount} active listing(s).`}
            </p>
          </div>
        )}

        {/* CBGI 10 & Ungraded Price Display - For graded categories */}
        {showGradedPrices && (hasGradePrice(psa10Price) || hasGradePrice(rawPrice)) && (
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-primary/10 border border-amber-500/20">
            {hasGradePrice(psa10Price) && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Badge className="bg-amber-500 text-white text-xs font-bold">CBGI 10</Badge>
                </div>
                <p className="font-display text-xl font-bold text-amber-400">{formatPrice(psa10Price)}</p>
                <p className="text-xs text-muted-foreground">Gem Mint</p>
              </div>
            )}
            {hasGradePrice(rawPrice) && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Badge variant="outline" className="text-xs">Ungraded</Badge>
                </div>
                <p className="font-display text-lg font-semibold text-foreground">{formatPrice(rawPrice)}</p>
                <p className="text-xs text-muted-foreground">Raw Card</p>
              </div>
            )}
          </div>
        )}

        {/* Live Price & Stats Grid - Only show if we have price data */}
        {priceInfo.hasPrice && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="glass rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-xs mb-1">{priceInfo.priceLabel}</p>
              <p className="font-display text-lg sm:text-xl font-bold text-foreground">{formatPrice(priceInfo.displayPrice)}</p>
              {priceInfo.confidence !== 'high' && (
                <p className="text-[10px] text-amber-500 mt-0.5">Est.</p>
              )}
            </div>
            
            <div className="glass rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-xs mb-1">Last Sale</p>
              <p className="font-semibold text-foreground text-sm sm:text-base">{formatPrice(lastSalePrice)}</p>
            </div>
            
            <div className="glass rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-xs mb-1">Floor Price</p>
              <p className="font-semibold text-foreground text-sm sm:text-base">{formatPrice(floorPrice)}</p>
            </div>
            
            <div className="glass rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-xs mb-1">Recent High</p>
              <p className="font-semibold text-foreground text-sm sm:text-base">{formatPrice(highestRecentSale)}</p>
            </div>
          </div>
        )}

        {/* Listing Median - Show when we have listings but no verified price */}
        {priceInfo.showListingMedian && listingSampleCount > 0 && listingMedianPrice && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Listings Median ({listingSampleCount} listing{listingSampleCount !== 1 ? 's' : ''})
              </span>
              <span className="font-semibold">{formatPrice(listingMedianPrice)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on active user listings, not verified sales
            </p>
          </div>
        )}

        {/* Price Changes */}
        <div className="flex justify-around py-3 border-y border-border/50">
          <PriceChangeIndicator change={priceChange24h} label="24h" />
          <PriceChangeIndicator change={priceChange7d} label="7d" />
          <PriceChangeIndicator change={priceChange30d} label="30d" />
        </div>

        {/* Volume Stats */}
        <div className="flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="text-muted-foreground">24h Volume:</span>{' '}
              <span className="font-semibold text-foreground">{formatPrice(volume24h)}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">
              <span className="text-muted-foreground">30d Volume:</span>{' '}
              <span className="font-semibold text-foreground">{formatPrice(volume30d)}</span>
            </span>
          </div>
        </div>

        {/* Price Chart */}
        <div className="rounded-xl overflow-hidden">
          <ItemPriceChart 
            itemId={itemId}
            productId={productId}
            itemName={itemName}
            category={category}
            currentPrice={currentPrice}
            marketItemId={itemId}
          />
        </div>


        {/* Confidence Band */}
        {confidenceBand && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Price Confidence Band</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Expected range: <span className="font-semibold text-foreground">{formatPrice(confidenceBand.low)}</span>
                {' – '}
                <span className="font-semibold text-foreground">{formatPrice(confidenceBand.high)}</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on weighted median analysis to prevent manipulation
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
