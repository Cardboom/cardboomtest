import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Clock, Rocket, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

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

const SPEED_TIERS: SpeedTierOption[] = [
  {
    id: 'standard',
    name: 'Standard',
    price: 15,
    daysMin: 20,
    daysMax: 25,
    icon: Clock,
    description: 'Quality grading at our best price',
  },
  {
    id: 'express',
    name: 'Express',
    price: 25,
    daysMin: 7,
    daysMax: 10,
    icon: Zap,
    description: 'Faster turnaround for time-sensitive cards',
    popular: true,
    badge: 'Popular',
  },
  {
    id: 'priority',
    name: 'Priority',
    price: 50,
    daysMin: 2,
    daysMax: 3,
    icon: Rocket,
    description: 'Our fastest service for urgent grading',
    badge: 'Fastest',
  },
];

interface SpeedTierSelectorProps {
  value: SpeedTier;
  onChange: (tier: SpeedTier) => void;
}

export const SpeedTierSelector: React.FC<SpeedTierSelectorProps> = ({
  value,
  onChange,
}) => {
  const selectedTier = SPEED_TIERS.find(t => t.id === value) || SPEED_TIERS[0];

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Grading Speed</Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as SpeedTier)}
        className="grid gap-2"
      >
        {SPEED_TIERS.map((tier) => {
          const isSelected = value === tier.id;
          const Icon = tier.icon;
          
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
                    {tier.daysMin}-{tier.daysMax} days • {tier.description}
                  </p>
                </div>
                
                <div className="text-right shrink-0">
                  <span className="text-lg font-bold text-primary">${tier.price}</span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-primary ml-auto mt-0.5" />
                  )}
                </div>
              </Label>
            </motion.div>
          );
        })}
      </RadioGroup>
      
      <div className="p-2 rounded-lg bg-muted/50 text-center">
        <p className="text-xs text-muted-foreground">
          Est. completion: <span className="font-semibold text-foreground">{selectedTier.daysMin}-{selectedTier.daysMax} days</span>
        </p>
      </div>
    </div>
  );
};

export { SPEED_TIERS };
export type { SpeedTierOption };
