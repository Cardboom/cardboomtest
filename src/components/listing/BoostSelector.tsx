import React from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, Crown, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

export type BoostTier = 'none' | '24h' | '7d' | 'top_category';

interface BoostOption {
  id: BoostTier;
  name: string;
  price: number;
  duration: string;
  icon: React.ElementType;
  description: string;
  badge?: string;
  popular?: boolean;
}

const BOOST_OPTIONS: BoostOption[] = [
  {
    id: 'none',
    name: 'No Boost',
    price: 0,
    duration: 'Standard visibility',
    icon: Clock,
    description: 'Your listing appears in normal search order',
  },
  {
    id: '24h',
    name: '24-Hour Boost',
    price: 2,
    duration: '24 hours',
    icon: Zap,
    description: 'Boost visibility for one day',
  },
  {
    id: '7d',
    name: '7-Day Boost',
    price: 5,
    duration: '7 days',
    icon: TrendingUp,
    description: 'Week-long visibility boost',
    popular: true,
    badge: 'Best Value',
  },
  {
    id: 'top_category',
    name: 'Top of Category',
    price: 10,
    duration: 'Until sold',
    icon: Crown,
    description: 'Premium placement at top of category',
    badge: 'Premium',
  },
];

interface BoostSelectorProps {
  value: BoostTier;
  onChange: (tier: BoostTier) => void;
  compact?: boolean;
}

export const BoostSelector: React.FC<BoostSelectorProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  const selectedBoost = BOOST_OPTIONS.find(b => b.id === value) || BOOST_OPTIONS[0];
  const isEnabled = value !== 'none';

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Boost Listing</Label>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => onChange(checked ? '7d' : 'none')}
          />
        </div>
        
        {isEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2"
          >
            <RadioGroup
              value={value}
              onValueChange={(v) => onChange(v as BoostTier)}
              className="grid grid-cols-3 gap-2"
            >
              {BOOST_OPTIONS.filter(b => b.id !== 'none').map((boost) => (
                <Label
                  key={boost.id}
                  htmlFor={`boost-${boost.id}`}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-lg border-2 cursor-pointer text-center transition-all',
                    value === boost.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value={boost.id} id={`boost-${boost.id}`} className="sr-only" />
                  <span className="text-lg font-bold text-primary">${boost.price}</span>
                  <span className="text-[10px] text-muted-foreground">{boost.duration}</span>
                </Label>
              ))}
            </RadioGroup>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <Label className="text-sm font-medium">Boost Your Listing</Label>
        <Badge variant="secondary" className="text-[10px]">Optional</Badge>
      </div>
      
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as BoostTier)}
        className="grid gap-2"
      >
        {BOOST_OPTIONS.map((boost) => {
          const isSelected = value === boost.id;
          const Icon = boost.icon;
          
          return (
            <motion.div
              key={boost.id}
              whileTap={{ scale: 0.98 }}
            >
              <Label
                htmlFor={`boost-full-${boost.id}`}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <RadioGroupItem value={boost.id} id={`boost-full-${boost.id}`} className="sr-only" />
                
                <div className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{boost.name}</span>
                    {boost.badge && (
                      <Badge 
                        variant={boost.popular ? 'default' : 'secondary'} 
                        className="text-[10px] h-4 px-1.5"
                      >
                        {boost.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{boost.description}</p>
                </div>
                
                <div className="text-right shrink-0">
                  {boost.price > 0 ? (
                    <span className="text-base font-bold text-primary">${boost.price}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Free</span>
                  )}
                  {isSelected && boost.price > 0 && (
                    <CheckCircle2 className="w-4 h-4 text-primary ml-auto mt-0.5" />
                  )}
                </div>
              </Label>
            </motion.div>
          );
        })}
      </RadioGroup>
      
      {selectedBoost.price > 0 && (
        <div className="p-2 rounded-lg bg-gain/10 border border-gain/20 text-center">
          <p className="text-xs text-gain">
            🚀 Boosted listings sell <span className="font-semibold">2.5x faster</span> on average
          </p>
        </div>
      )}
    </div>
  );
};

export { BOOST_OPTIONS };
export type { BoostOption };
