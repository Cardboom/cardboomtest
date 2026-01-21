import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Clock, Rocket, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useGradingPricing, GRADING_SPEED_TIERS_DEFAULT } from '@/hooks/useGradingPricing';

export type SpeedTier = 'standard' | 'express' | 'priority';

interface SpeedTierOption {
  id: SpeedTier;
  name: string;
  price: number;
  daysMin: number;
  daysMax: number;
  icon: React.ElementType;
  description: string;
  badge?: string;
  popular?: boolean;
}

// Helper to build speed tiers from pricing data
// Online AI Grading: Standard ($5 from $10, 5 min queue), Priority ($10 from $20, instant)
const buildSpeedTiers = (pricing: ReturnType<typeof useGradingPricing>): SpeedTierOption[] => [
  {
    id: 'standard',
    name: 'Standard',
    price: pricing.standard.price,
    daysMin: 5, // 5 minutes represented as "5 min"
    daysMax: 5,
    icon: Clock,
    description: 'AI grading with 5-minute queue',
  },
  {
    id: 'priority',
    name: 'Priority',
    price: pricing.priority.price,
    daysMin: 0, // Instant
    daysMax: 0,
    icon: Zap,
    description: 'Instant AI grading - immediate results',
    popular: true,
    badge: 'Instant',
  },
];

// Static fallback for non-hook contexts
const SPEED_TIERS: SpeedTierOption[] = buildSpeedTiers({
  ...GRADING_SPEED_TIERS_DEFAULT,
  referralCommissionRate: 0.10,
  creatorRevenueShare: 0.15,
  launchDiscount: 0.50,
  launchDiscountEndsAt: '2027-01-21T00:00:00Z',
  isLoading: false,
});

interface SpeedTierSelectorProps {
  value: SpeedTier;
  onChange: (tier: SpeedTier) => void;
}

export const SpeedTierSelector: React.FC<SpeedTierSelectorProps> = ({
  value,
  onChange,
}) => {
  const pricing = useGradingPricing();
  const dynamicTiers = buildSpeedTiers(pricing);
  const selectedTier = dynamicTiers.find(t => t.id === value) || dynamicTiers[0];
  
  // Check if launch discount is active
  const isLaunchActive = pricing.launchDiscount > 0;
  const discountPercent = Math.round(pricing.launchDiscount * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Grading Speed</Label>
        {isLaunchActive && (
          <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[10px] animate-pulse">
            🎉 {discountPercent}% Launch Discount
          </Badge>
        )}
      </div>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as SpeedTier)}
        className="grid gap-2"
      >
        {dynamicTiers.map((tier) => {
          const isSelected = value === tier.id;
          const Icon = tier.icon;
          
          // Calculate original price before discount
          const originalPrice = isLaunchActive ? Math.round(tier.price / (1 - pricing.launchDiscount)) : tier.price;
          const showStrikethrough = isLaunchActive && originalPrice !== tier.price;
          
          return (
            <motion.div
              key={tier.id}
              whileTap={{ scale: 0.98 }}
            >
              <Label
                htmlFor={tier.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <RadioGroupItem value={tier.id} id={tier.id} className="sr-only" />
                
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{tier.name}</span>
                    {tier.badge && (
                      <Badge 
                        variant={tier.popular ? 'default' : 'secondary'} 
                        className="text-[10px] h-4 px-1.5"
                      >
                        {tier.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tier.daysMin === 0 ? 'Instant results' : `~${tier.daysMin} min queue`} • {tier.description}
                  </p>
                </div>
                
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5">
                    {showStrikethrough && (
                      <span className="text-sm text-muted-foreground line-through">${originalPrice}</span>
                    )}
                    <span className={cn(
                      "text-lg font-bold",
                      isLaunchActive ? "text-emerald-500" : "text-primary"
                    )}>${tier.price}</span>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-primary ml-auto mt-0.5" />
                  )}
                </div>
              </Label>
            </motion.div>
          );
        })}
      </RadioGroup>
      
      {isLaunchActive && (
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            🚀 Launch Special: {discountPercent}% off base grading (without protection bundle)
          </p>
        </div>
      )}
      
      <div className="p-2 rounded-lg bg-muted/50 text-center">
        <p className="text-xs text-muted-foreground">
          {selectedTier.daysMin === 0 ? (
            <>Results: <span className="font-semibold text-foreground">Instant</span></>
          ) : (
            <>Estimated wait: <span className="font-semibold text-foreground">~{selectedTier.daysMin} minutes</span></>
          )}
        </p>
      </div>
    </div>
  );
};

export { SPEED_TIERS };
export type { SpeedTierOption };
