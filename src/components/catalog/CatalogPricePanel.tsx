import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  Activity, 
  HelpCircle, 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  ShoppingBag,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import type { ResolvedPrice } from '@/hooks/useCatalogCard';

interface CatalogPricePanelProps {
  price: ResolvedPrice | null;
  isLoading?: boolean;
  cardName?: string;
  setCode?: string;
  cardNumber?: string;
  game?: string;
  catalogCardId?: string;
}

// CBGI multipliers for PSA grade estimates (based on market data)
const CBGI_PSA_MULTIPLIERS = {
  psa10: 8.5,  // PSA 10 typically 8-10x raw price
  psa9: 3.2,   // PSA 9 typically 3-4x raw price
  psa8: 1.8,   // PSA 8 typically 1.5-2x raw price
};

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
    case 'tcgplayer_live': return 'TCGPlayer (Live)';
    default: return 'Estimated';
  }
};

export const CatalogPricePanel = ({ 
  price, 
  isLoading,
  cardName,
  setCode,
  cardNumber,
  game,
  catalogCardId
}: CatalogPricePanelProps) => {
  const { formatPrice } = useCurrency();
  const [isFetching, setIsFetching] = useState(false);
  const [livePrice, setLivePrice] = useState<{
    market: number | null;
    low: number | null;
    high: number | null;
    url: string | null;
    source: string;
  } | null>(null);

  const hasListings = price?.listing_count && price.listing_count > 0;
  const hasPrice = price?.has_price && price?.price_usd !== null;
  const showNoData = !hasPrice && !hasListings && !livePrice && !isLoading;

  // Fetch live price from TCGPlayer via Firecrawl
  const fetchLivePrice = async () => {
    if (!cardName || !setCode || !cardNumber) return;
    
    setIsFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-tcgplayer-price', {
        body: {
          cards: [{
            name: cardName,
            setCode: setCode,
            cardNumber: cardNumber,
            game: game || 'onepiece'
          }]
        }
      });

      if (data?.success && data.results?.[0]) {
        const result = data.results[0];
        if (result.marketPrice || result.lowPrice) {
          setLivePrice({
            market: result.marketPrice,
            low: result.lowPrice,
            high: result.highPrice,
            url: result.tcgplayerUrl,
            source: 'tcgplayer_live'
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch live price:', error);
    } finally {
      setIsFetching(false);
    }
  };

  // Auto-fetch when no price data
  useEffect(() => {
    if (showNoData && cardName && setCode && cardNumber && !isFetching) {
      fetchLivePrice();
    }
  }, [showNoData, cardName, setCode, cardNumber]);

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

  // Display the effective price (from DB or live fetch)
  const effectivePrice = livePrice?.market || price?.price_usd;
  const effectiveLow = livePrice?.low || price?.min_listing_price;
  const priceSource = livePrice ? 'tcgplayer_live' : price?.price_source;

  // Show fetch button when no data
  if (!hasPrice && !hasListings && !livePrice) {
    return (
      <Card className="glass border-muted">
        <CardContent className="p-6">
          {isFetching ? (
            <div className="flex items-center justify-center gap-3 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-muted-foreground">Fetching live prices...</span>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">No cached price data</p>
              <Button 
                variant="outline" 
                onClick={fetchLivePrice}
                disabled={!cardName || !setCode}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Fetch Live Price
              </Button>
              <p className="text-xs text-muted-foreground">
                Fetches current price from TCGPlayer
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const confidenceBadge = getConfidenceBadge(livePrice ? 0.6 : (price?.confidence || 0));
  const ConfidenceIcon = confidenceBadge.icon;
  const isFromListings = priceSource === 'listing';
  const isLive = priceSource === 'tcgplayer_live';

  // Calculate CBGI PSA estimates
  const rawPrice = effectivePrice || 0;
  const psa10Estimate = rawPrice * CBGI_PSA_MULTIPLIERS.psa10;
  const psa9Estimate = rawPrice * CBGI_PSA_MULTIPLIERS.psa9;

  return (
    <TooltipProvider>
      <Card className={`glass ${isLive ? 'border-primary/40' : 'border-primary/20'}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              {isFromListings ? 'Available From' : 'Market Price'}
              {isLive && (
                <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                  Live
                </Badge>
              )}
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
                    {isLive 
                      ? 'Live price from TCGPlayer. Refresh for latest.'
                      : `Based on ${price?.liquidity_count || 0} ${getSourceLabel(price?.price_source || '').toLowerCase()}.`
                    }
                  </p>
                </TooltipContent>
              </Tooltip>
              {/* Refresh button */}
              {cardName && setCode && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={fetchLivePrice}
                  disabled={isFetching}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          {/* Raw Price Display */}
          <div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              Raw / Ungraded
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3 h-3" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">Current market price for ungraded cards</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-baseline gap-2">
              {isFromListings && effectiveLow ? (
                <>
                  <span className="text-muted-foreground text-sm">From</span>
                  <span className="font-display text-3xl font-bold text-gain">
                    {formatPrice(effectiveLow)}
                  </span>
                </>
              ) : (
                <span className="font-display text-3xl font-bold">
                  {formatPrice(effectivePrice || 0)}
                </span>
              )}
              {livePrice?.url && (
                <a 
                  href={livePrice.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs flex items-center gap-1"
                >
                  TCGPlayer <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* CBGI PSA Estimates */}
          {rawPrice > 0 && (
            <div className="border-t border-border pt-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <TrendingUp className="w-3 h-3" />
                CBGI Graded Estimates
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-3 h-3" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      CardBoom Grading Index estimates based on historical PSA price multipliers.
                      Actual prices may vary based on card condition, centering, and market demand.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">PSA 10</span>
                    <Badge variant="outline" className="text-[10px] px-1 h-4 bg-gain/10 text-gain border-gain/30">
                      {CBGI_PSA_MULTIPLIERS.psa10}x
                    </Badge>
                  </div>
                  <p className="font-display text-lg font-bold text-foreground">
                    {formatPrice(psa10Estimate)}
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">PSA 9</span>
                    <Badge variant="outline" className="text-[10px] px-1 h-4 bg-primary/10 text-primary border-primary/30">
                      {CBGI_PSA_MULTIPLIERS.psa9}x
                    </Badge>
                  </div>
                  <p className="font-display text-lg font-bold text-foreground">
                    {formatPrice(psa9Estimate)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Source info */}
          <div className="grid grid-cols-2 gap-4 text-sm pt-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Source:</span>
              <span className="font-medium text-xs">
                {getSourceLabel(priceSource || '')}
              </span>
            </div>
            {(price?.last_updated || isLive) && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Updated:</span>
                <span className="font-medium text-xs">
                  {isLive ? 'Just now' : new Date(price!.last_updated!).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
