import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, TrendingDown, Minus, Zap, DollarSign, 
  Clock, ShieldCheck, Lock, Sparkles, AlertTriangle,
  ChevronDown, ChevronUp, Info, CheckCircle2
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { TooltipProvider } from '@/components/ui/tooltip';

interface PricingData {
  lowestActive: number | null;
  medianSold: number | null;
  trend7d: number | null;
  trendDirection: 'up' | 'down' | 'stable';
  quickSellPrice: number | null;
  maxProfitPrice: number | null;
  priceConfidence: 'high' | 'medium' | 'low';
  salesCount: number;
  listingsCount: number;
}

interface CardAnalysis {
  detected: boolean;
  cardName: string | null;
  setName: string | null;
  cardNumber: string | null;
  estimatedCondition: string | null;
  category: string | null;
  confidence: number;
  pricing: PricingData | null;
  matchedMarketItem: {
    id: string;
    name: string;
    category: string;
    image_url: string | null;
  } | null;
}

interface CardPricingIntelligenceProps {
  analysis: CardAnalysis | null;
  isLoading: boolean;
  onAutoList: (price: number, priceType: 'quick' | 'max' | 'median') => void;
  onApplyPrice: (price: number) => void;
  userId?: string;
}

export const CardPricingIntelligence = ({
  analysis,
  isLoading,
  onAutoList,
  onApplyPrice,
  userId,
}: CardPricingIntelligenceProps) => {
  const { isPro } = useSubscription(userId);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [expandedInsights, setExpandedInsights] = useState(false);

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return '—';
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)}%`;
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-gain';
      case 'medium': return 'text-warning';
      case 'low': return 'text-loss';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-gain" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-loss" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle className="text-lg">Analyzing Card...</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis || !analysis.detected) {
    return null;
  }

  const { pricing, cardName, setName, estimatedCondition, confidence, matchedMarketItem } = analysis;

  return (
    <TooltipProvider>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">AI Pricing Intelligence</CardTitle>
            </div>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              {Math.round(confidence * 100)}% Match
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Detected Card Info */}
          <div className="p-3 rounded-lg bg-background/50 border border-border/50">
            <div className="flex items-start gap-3">
              {matchedMarketItem?.image_url && (
                <img 
                  src={matchedMarketItem.image_url} 
                  alt={cardName || 'Card'} 
                  className="w-16 h-22 object-cover rounded border border-border"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{cardName}</h3>
                {setName && (
                  <p className="text-sm text-muted-foreground truncate">{setName}</p>
                )}
                {estimatedCondition && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    Est. {estimatedCondition}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {pricing ? (
            <>
              {/* Core Pricing Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Lowest Active */}
                <div className="p-3 rounded-lg bg-background/80 border border-border/50">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <DollarSign className="h-3 w-3" />
                    Lowest Active
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {formatCurrency(pricing.lowestActive)}
                  </div>
                </div>

                {/* Median Sold */}
                <div className="p-3 rounded-lg bg-background/80 border border-border/50">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Clock className="h-3 w-3" />
                    Median Sold
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {formatCurrency(pricing.medianSold)}
                  </div>
                </div>
              </div>

              {/* 7-Day Trend */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-background/80 border border-border/50">
                <div className="flex items-center gap-2">
                  {getTrendIcon(pricing.trendDirection)}
                  <span className="text-sm font-medium">7-Day Trend</span>
                </div>
                <span className={`font-bold ${
                  pricing.trendDirection === 'up' ? 'text-gain' : 
                  pricing.trendDirection === 'down' ? 'text-loss' : 
                  'text-muted-foreground'
                }`}>
                  {formatPercent(pricing.trend7d)}
                </span>
              </div>

              {/* Quick Sell vs Max Profit */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto flex-col items-start p-3 border-gain/30 hover:bg-gain/10"
                  onClick={() => pricing.quickSellPrice && onApplyPrice(pricing.quickSellPrice)}
                >
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Zap className="h-3 w-3 text-gain" />
                    Quick Sell Price
                  </div>
                  <div className="text-lg font-bold text-gain">
                    {formatCurrency(pricing.quickSellPrice)}
                  </div>
                  <div className="text-xs text-muted-foreground">Fast liquidity</div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto flex-col items-start p-3 border-primary/30 hover:bg-primary/10"
                  onClick={() => pricing.maxProfitPrice && onApplyPrice(pricing.maxProfitPrice)}
                >
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <TrendingUp className="h-3 w-3 text-primary" />
                    Max Profit Price
                  </div>
                  <div className="text-lg font-bold text-primary">
                    {formatCurrency(pricing.maxProfitPrice)}
                  </div>
                  <div className="text-xs text-muted-foreground">Longer sell time</div>
                </Button>
              </div>

              {/* Auto-List Button */}
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => pricing.medianSold && onAutoList(pricing.medianSold, 'median')}
              >
                <CheckCircle2 className="h-5 w-5" />
                Auto-list at Optimal Price ({formatCurrency(pricing.medianSold)})
              </Button>

              {/* Price Confidence */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Price Confidence:</span>
                  <span className={`font-medium ${getConfidenceColor(pricing.priceConfidence)}`}>
                    {pricing.priceConfidence.charAt(0).toUpperCase() + pricing.priceConfidence.slice(1)}
                  </span>
                </div>
                <span className="text-muted-foreground text-xs">
                  Based on {pricing.salesCount} sales
                </span>
              </div>

              {/* Advanced Insights (Pro Only) */}
              <div className="border-t border-border/50 pt-4">
                <button
                  className="flex items-center justify-between w-full text-sm"
                  onClick={() => isPro ? setExpandedInsights(!expandedInsights) : setShowUpgrade(true)}
                >
                  <div className="flex items-center gap-2">
                    {isPro ? (
                      <Sparkles className="h-4 w-4 text-primary" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">Advanced Pricing Insights</span>
                    {!isPro && (
                      <Badge variant="secondary" className="text-xs">Pro</Badge>
                    )}
                  </div>
                  {isPro && (
                    expandedInsights ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {isPro && expandedInsights && (
                  <div className="mt-3 space-y-3 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded bg-background/80">
                        <div className="text-xs text-muted-foreground">Listings</div>
                        <div className="font-bold">{pricing.listingsCount}</div>
                      </div>
                      <div className="p-2 rounded bg-background/80">
                        <div className="text-xs text-muted-foreground">Avg Days to Sell</div>
                        <div className="font-bold">~3-5</div>
                      </div>
                      <div className="p-2 rounded bg-background/80">
                        <div className="text-xs text-muted-foreground">Demand Score</div>
                        <div className="font-bold text-gain">High</div>
                      </div>
                    </div>

                    <div className="p-3 rounded bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-foreground">AI Recommendation</p>
                          <p className="text-muted-foreground mt-1">
                            {pricing.trendDirection === 'up' 
                              ? 'Market is bullish. Consider listing at max profit price for optimal returns.'
                              : pricing.trendDirection === 'down'
                              ? 'Market is cooling. Quick sell price recommended for faster turnover.'
                              : 'Stable market. Median price offers best balance of speed and profit.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isPro && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Unlock demand scores, sell time estimates, and AI recommendations with Pro.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No pricing data available for this card.</p>
              <p className="text-sm mt-1">Try entering the price manually.</p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <Info className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Prices are estimates based on recent market data and may vary. 
              Always verify current market conditions before listing.
            </p>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
