import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, TrendingDown, Zap, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { useAutoRelist } from '@/hooks/useAutoRelist';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface AutoRelistPanelProps {
  listingId: string;
  sellerId: string;
  currentPrice: number;
  category: string;
}

export function AutoRelistPanel({ 
  listingId, 
  sellerId, 
  currentPrice, 
  category 
}: AutoRelistPanelProps) {
  const { 
    settings, 
    suggestedPrice, 
    isLoading, 
    fetchSettings, 
    calculateSuggestedPrice,
    enableAutoRelist,
    disableAutoRelist,
    applyPriceReduction
  } = useAutoRelist(listingId);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [priceLadder, setPriceLadder] = useState(false);
  const [reductionPercent, setReductionPercent] = useState(2);
  const [minPrice, setMinPrice] = useState<string>('');

  useEffect(() => {
    fetchSettings();
    calculateSuggestedPrice(currentPrice, category);
  }, [listingId]);

  useEffect(() => {
    if (settings) {
      setPriceLadder(settings.priceLadderEnabled);
      setReductionPercent(settings.priceReductionPercent);
      setMinPrice(settings.minPrice?.toString() || '');
    }
  }, [settings]);

  const handleToggleAutoRelist = async () => {
    if (settings?.enabled) {
      await disableAutoRelist();
    } else {
      await enableAutoRelist(sellerId, currentPrice, {
        priceLadderEnabled: priceLadder,
        priceReductionPercent: reductionPercent,
        minPrice: minPrice ? parseFloat(minPrice) : undefined
      });
    }
  };

  const handleApplySuggestion = async () => {
    if (suggestedPrice) {
      await applyPriceReduction(suggestedPrice.price);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-lg border border-border bg-card overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <h4 className="font-medium">Auto-Relist</h4>
          </div>
          <Switch 
            checked={settings?.enabled || false}
            onCheckedChange={handleToggleAutoRelist}
            disabled={isLoading}
          />
        </div>

        {/* Price Suggestion */}
        {suggestedPrice && (
          <div className={cn(
            "rounded-lg p-3 mb-4",
            suggestedPrice.confidence === 'high' ? "bg-green-500/10 border border-green-500/30" :
            suggestedPrice.confidence === 'medium' ? "bg-yellow-500/10 border border-yellow-500/30" :
            "bg-muted"
          )}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Suggested Price</span>
              <Badge variant="outline" className="text-xs">
                {suggestedPrice.confidence} confidence
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">${suggestedPrice.price.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">{suggestedPrice.basedOn}</div>
              </div>
              <Button 
                size="sm" 
                onClick={handleApplySuggestion}
                disabled={isLoading}
              >
                Apply
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{suggestedPrice.reason}</p>
          </div>
        )}

        {/* Price Ladder */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between mb-2">
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Advanced Settings
              </span>
              <span>{showAdvanced ? '−' : '+'}</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Price Ladder</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically reduce price over time
                </p>
              </div>
              <Switch 
                checked={priceLadder}
                onCheckedChange={setPriceLadder}
                disabled={!settings?.enabled}
              />
            </div>

            {priceLadder && (
              <>
                <div>
                  <Label className="text-sm">
                    Reduction: {reductionPercent}% every 48h
                  </Label>
                  <Slider
                    value={[reductionPercent]}
                    onValueChange={([value]) => setReductionPercent(value)}
                    min={1}
                    max={10}
                    step={0.5}
                    className="mt-2"
                    disabled={!settings?.enabled}
                  />
                </div>

                <div>
                  <Label>Minimum Price</Label>
                  <Input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="No minimum"
                    className="mt-1"
                    disabled={!settings?.enabled}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Price won't go below this amount
                  </p>
                </div>
              </>
            )}

            {settings?.enabled && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => enableAutoRelist(sellerId, currentPrice, {
                  priceLadderEnabled: priceLadder,
                  priceReductionPercent: reductionPercent,
                  minPrice: minPrice ? parseFloat(minPrice) : undefined
                })}
                disabled={isLoading}
              >
                Save Settings
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Info Footer */}
      <div className="bg-muted/30 px-4 py-2 border-t border-border">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Prices only change with your explicit approval
        </p>
      </div>
    </motion.div>
  );
}
