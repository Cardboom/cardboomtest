import React from 'react';
import { motion } from 'framer-motion';
import { Zap, DollarSign, TrendingUp, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GradePriceEstimate {
  grade: string;
  price: number | null;
}

interface GradeAndFlipToggleProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  suggestedPrice?: number;
  customPrice?: number;
  onCustomPriceChange?: (price: number) => void;
  /** Base ungraded price for calculating grade estimates */
  ungradedPrice?: number;
  /** Pre-calculated grade estimates from API */
  gradeEstimates?: GradePriceEstimate[];
}

export const GradeAndFlipToggle: React.FC<GradeAndFlipToggleProps> = ({
  enabled,
  onEnabledChange,
  suggestedPrice,
  customPrice,
  onCustomPriceChange,
  ungradedPrice,
  gradeEstimates,
}) => {
  // Calculate grade estimates if not provided
  const estimates = gradeEstimates || (ungradedPrice ? [
    { grade: 'CBGI 8', price: Math.round(ungradedPrice * 1.5) },
    { grade: 'CBGI 9', price: Math.round(ungradedPrice * 2.0) },
    { grade: 'CBGI 10', price: Math.round(ungradedPrice * 3.5) },
  ] : []);

  return (
    <motion.div
      className={`p-4 rounded-xl border-2 transition-all ${
        enabled 
          ? 'border-green-500 bg-green-500/10' 
          : 'border-border bg-card'
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${enabled ? 'bg-green-500' : 'bg-muted'}`}>
            <Zap className={`w-5 h-5 ${enabled ? 'text-white' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <Label className="text-base font-semibold flex items-center gap-2">
              Grade & Flip Mode
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Automatically list your card for sale after grading is complete. We'll suggest a competitive price based on the grade and market data.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <p className="text-sm text-muted-foreground">Auto-list after grading</p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onEnabledChange}
        />
      </div>

      {enabled && (
        <motion.div 
          className="space-y-3 pt-3 border-t border-border/50"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span>Your card will be listed automatically once graded</span>
          </div>

          {/* Grade-specific price estimates */}
          {estimates.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Estimated listing price by grade:</p>
              <div className="grid grid-cols-3 gap-2">
                {estimates.map(({ grade, price }) => (
                  <div 
                    key={grade} 
                    className={`text-center p-2 rounded-lg border ${
                      grade === 'CBGI 10' 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : grade === 'CBGI 9'
                          ? 'bg-blue-500/10 border-blue-500/30'
                          : 'bg-amber-500/10 border-amber-500/30'
                    }`}
                  >
                    <p className="text-[10px] font-medium text-muted-foreground">{grade}</p>
                    <p className={`text-sm font-bold ${
                      grade === 'CBGI 10' ? 'text-green-500' : grade === 'CBGI 9' ? 'text-blue-500' : 'text-amber-500'
                    }`}>
                      {price ? `$${price.toLocaleString()}` : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {suggestedPrice && suggestedPrice > 0 && !estimates.length && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center justify-between">
                <span className="text-sm">AI Suggested Price:</span>
                <span className="font-bold text-green-500">${suggestedPrice.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm">Custom Listing Price (optional)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Leave blank for auto-pricing"
                className="pl-9"
                value={customPrice || ''}
                onChange={(e) => onCustomPriceChange?.(parseFloat(e.target.value) || 0)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              If left blank, we'll set a competitive price based on your grade result
            </p>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span>Grade & Flip users see 30% faster sales on average</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
