import { useState } from 'react';
import { Shield, ShieldCheck, AlertTriangle, Globe, Eye, Users, Clock, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export type CertificationTier = 'standard' | 'express';

interface CertificationToggleProps {
  enabled: boolean;
  tier: CertificationTier;
  onEnabledChange: (enabled: boolean) => void;
  onTierChange: (tier: CertificationTier) => void;
}

const CERTIFICATION_TIERS = [
  {
    id: 'standard' as const,
    name: 'Standard',
    price: 10,
    days: '3–5 days',
    description: 'Quality AI grading at our best price',
  },
  {
    id: 'express' as const,
    name: 'Express',
    price: 15,
    days: '24–48h',
    description: 'Priority processing for faster sales',
    badge: 'Fast',
  },
];

export const CertificationToggle = ({
  enabled,
  tier,
  onEnabledChange,
  onTierChange,
}: CertificationToggleProps) => {
  const [showWarning, setShowWarning] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
    onEnabledChange(checked);
  };

  const selectedTier = CERTIFICATION_TIERS.find(t => t.id === tier);

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="text-center space-y-2 p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Get More Trust. Sell Faster.</h3>
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Cards with CardBoom Certification sell up to <span className="text-primary font-semibold">28% faster</span> and receive priority visibility across the marketplace.
        </p>
      </div>

      {/* Main Toggle */}
      <div 
        className={cn(
          "p-4 rounded-lg border transition-all",
          enabled 
            ? "border-primary/50 bg-primary/5" 
            : "border-border bg-muted/30"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              enabled ? "bg-primary/20" : "bg-muted"
            )}>
              <Shield className={cn(
                "h-5 w-5",
                enabled ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-base font-semibold cursor-pointer">
                  Add CardBoom Certification
                </Label>
                <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                  Recommended
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered condition analysis with market-based grading
              </p>
            </div>
          </div>
          <Switch 
            checked={enabled} 
            onCheckedChange={handleToggle}
          />
        </div>

        {/* Benefits */}
        <AnimatePresence>
          {enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                {/* Trust Points */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">Trusted globally</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Eye className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">Visible badge</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">Higher trust</span>
                  </div>
                </div>

                {/* Tier Selection */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span>Select speed</span>
                    {selectedTier && (
                      <Badge variant="secondary" className="ml-2">
                        ${selectedTier.price} · {selectedTier.name}
                      </Badge>
                    )}
                  </button>

                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <RadioGroup 
                          value={tier}
                          onValueChange={(value) => onTierChange(value as CertificationTier)}
                          className="grid grid-cols-2 gap-3"
                        >
                          {CERTIFICATION_TIERS.map((tierOption) => (
                            <label
                              key={tierOption.id}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                tier === tierOption.id 
                                  ? "border-primary bg-primary/10" 
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <RadioGroupItem value={tierOption.id} className="mt-0.5" />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {tierOption.id === 'express' ? (
                                      <Zap className="h-4 w-4 text-amber-500" />
                                    ) : (
                                      <Clock className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="font-medium">{tierOption.name}</span>
                                    {tierOption.badge && (
                                      <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-xs">
                                        {tierOption.badge}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">${tierOption.price} · {tierOption.days}</p>
                              </div>
                            </label>
                          ))}
                        </RadioGroup>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Warning when disabled */}
        <AnimatePresence>
          {showWarning && !enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    Ungraded cards may receive lower visibility
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Certified cards are shown first in search results and typically sell faster with higher buyer confidence.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
