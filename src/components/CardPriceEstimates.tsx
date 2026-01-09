import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  RefreshCw, 
  Info, 
  Sparkles,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

interface CardPriceEstimatesProps {
  marketItemId?: string;
  cardName: string;
  setName?: string;
  category: string;
}

interface PriceEstimate {
  price_ungraded: number | null;
  price_psa_6: number | null;
  price_psa_7: number | null;
  price_psa_8: number | null;
  price_psa_9: number | null;
  price_psa_10: number | null;
  confidence_score: number;
  notes: string;
  updated_at?: string;
}

const gradeLabels = [
  { key: 'price_ungraded', label: 'Raw', grade: 'Ungraded', color: 'bg-muted' },
  { key: 'price_psa_6', label: 'CBGI 6', grade: 'EX-MT', color: 'bg-amber-500/20' },
  { key: 'price_psa_7', label: 'CBGI 7', grade: 'NM', color: 'bg-amber-400/20' },
  { key: 'price_psa_8', label: 'CBGI 8', grade: 'NM-MT', color: 'bg-emerald-500/20' },
  { key: 'price_psa_9', label: 'CBGI 9', grade: 'Mint', color: 'bg-blue-500/20' },
  { key: 'price_psa_10', label: 'CBGI 10', grade: 'Gem Mint', color: 'bg-primary/20' },
];

export const CardPriceEstimates = ({ 
  marketItemId, 
  cardName, 
  setName, 
  category 
}: CardPriceEstimatesProps) => {
  const [estimate, setEstimate] = useState<PriceEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formatPrice } = useCurrency();

  const fetchEstimates = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // First check for cached estimates
      if (marketItemId && !forceRefresh) {
        const { data: cached } = await supabase
          .from('card_price_estimates')
          .select('*')
          .eq('market_item_id', marketItemId)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (cached) {
          setEstimate(cached as PriceEstimate);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      // Fetch from edge function
      const { data, error: fnError } = await supabase.functions.invoke('fetch-price-estimates', {
        body: {
          market_item_id: marketItemId,
          card_name: cardName,
          set_name: setName,
          category: category,
          force_refresh: forceRefresh,
        }
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setEstimate(data as PriceEstimate);
    } catch (err) {
      console.error('Error fetching price estimates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch estimates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (cardName && category) {
      fetchEstimates();
    }
  }, [cardName, category, marketItemId]);

  if (loading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Price Estimates by Grade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass border-warning/30">
        <CardContent className="py-6 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-warning" />
          <p className="text-muted-foreground">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={() => fetchEstimates(true)}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!estimate) {
    return (
      <Card className="glass">
        <CardContent className="py-6 text-center text-muted-foreground">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No price estimates available for this card.</p>
        </CardContent>
      </Card>
    );
  }

  const confidenceLevel = estimate.confidence_score >= 0.8 ? 'High' 
    : estimate.confidence_score >= 0.5 ? 'Medium' : 'Low';
  const confidenceColor = estimate.confidence_score >= 0.8 ? 'text-gain' 
    : estimate.confidence_score >= 0.5 ? 'text-amber-500' : 'text-loss';

  return (
    <TooltipProvider>
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Price Estimates by Grade
            </CardTitle>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className={cn("gap-1", confidenceColor)}>
                    <Shield className="w-3 h-3" />
                    {confidenceLevel} Confidence
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Confidence: {Math.round(estimate.confidence_score * 100)}%</p>
                </TooltipContent>
              </Tooltip>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => fetchEstimates(true)}
                disabled={refreshing}
              >
                <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {gradeLabels.map(({ key, label, grade, color }) => {
              const price = estimate[key as keyof PriceEstimate] as number | null;
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "p-3 rounded-lg border border-border/50 text-center transition-all hover:border-primary/50",
                      color
                    )}>
                      <p className="text-xs text-muted-foreground mb-1">{label}</p>
                      <p className="font-bold text-lg text-foreground">
                        {price ? formatPrice(price) : 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">{grade}</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{label} ({grade})</p>
                    {price && <p className="font-medium">{formatPrice(price)}</p>}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {estimate.notes && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">{estimate.notes}</p>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Data from CardBoom. Based on median of latest sales.
            </span>
            {estimate.updated_at && (
              <span>
                Updated: {new Date(estimate.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
