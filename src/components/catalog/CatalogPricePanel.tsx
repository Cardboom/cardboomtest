import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Activity, HelpCircle, ShieldCheck, ShieldAlert, Shield, ShoppingBag } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { ResolvedPrice } from '@/hooks/useCatalogCard';

interface CatalogPricePanelProps {
  price: ResolvedPrice | null;
  isLoading?: boolean;
}

const getConfidenceBadge = (confidence: number) => {
  if (confidence >= 0.7) {
    return { label: 'High', icon: ShieldCheck, className: 'bg-gain/20 text-gain' };
  } else if (confidence >= 0.4) {
    return { label: 'Medium', icon: Shield, className: 'bg-warning/20 text-warning' };
  } else {
    return { label: 'Low', icon: ShieldAlert, className: 'bg-loss/20 text-loss' };
  }
};

const getSourceLabel = (source: string) => {
  switch (source) {
    case 'listing': return 'Active listings';
    case 'market_aggregate': return 'Market data (30D)';
    case 'market_item': return 'Market estimate';
    case 'snapshot': return 'Verified sales';
    case 'listing_median': return 'Active listings';
    default: return 'Estimated';
  }
};

export const CatalogPricePanel = ({ price, isLoading }: CatalogPricePanelProps) => {
  const { formatPrice } = useCurrency();

  if (isLoading) {
    return (
      <Card className="glass animate-pulse">
        <CardContent className="p-6">
          <div className="h-12 bg-muted rounded w-1/2 mb-4" />
          <div className="h-6 bg-muted rounded w-1/3" />
        </CardContent>
      </Card>
    );
  }

  // CRITICAL: Only show "no data" if truly no price AND no listings exist
  // If user can BUY the card, price is NOT pending
  const hasListings = price?.listing_count && price.listing_count > 0;
  const hasPrice = price?.has_price && price?.price_usd !== null;
  
  if (!hasPrice && !hasListings) {
    return (
      <Card className="glass border-muted">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No market data yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Be the first to list this card or check back later for pricing
          </p>
        </CardContent>
      </Card>
    );
  }

  const confidenceBadge = getConfidenceBadge(price?.confidence || 0);
  const ConfidenceIcon = confidenceBadge.icon;
  const isFromListings = price?.price_source === 'listing';

  return (
    <TooltipProvider>
      <Card className="glass border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              {isFromListings ? 'Available From' : 'Market Price'}
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasListings && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3" />
                  {price?.listing_count} {price?.listing_count === 1 ? 'listing' : 'listings'}
                </Badge>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className={confidenceBadge.className}>
                    <ConfidenceIcon className="w-3 h-3 mr-1" />
                    {confidenceBadge.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    Based on {price?.liquidity_count || 0} {getSourceLabel(price?.price_source || '').toLowerCase()}. 
                    Higher sample = higher confidence.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-baseline gap-2 mb-4">
            {isFromListings && price?.min_listing_price ? (
              <>
                <span className="text-muted-foreground">From</span>
                <span className="font-display text-4xl font-bold text-gain">
                  {formatPrice(price.min_listing_price)}
                </span>
              </>
            ) : (
              <span className="font-display text-4xl font-bold">
                {formatPrice(price?.price_usd || 0)}
              </span>
            )}
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">
                  Source: {getSourceLabel(price?.price_source || '')} ({price?.liquidity_count || 0} data points)
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Show median price if we have listings */}
          {isFromListings && price?.price_usd && price.listing_count && price.listing_count > 1 && (
            <div className="flex items-center gap-2 mb-4 text-sm">
              <span className="text-muted-foreground">Median:</span>
              <span className="font-semibold">{formatPrice(price.price_usd)}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Data points:</span>
              <span className="font-semibold">{price?.liquidity_count || 0}</span>
            </div>
            {price?.last_updated && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Updated:</span>
                <span className="font-semibold">
                  {new Date(price.last_updated).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
