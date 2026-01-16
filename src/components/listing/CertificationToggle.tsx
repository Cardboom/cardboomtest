import { useState } from 'react';
import { Shield, ShieldCheck, AlertTriangle, Globe, Eye, Users, Clock, Zap, ChevronDown, ChevronUp, TrendingUp, Vault, Truck, Award } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export type CertificationTier = 'standard' | 'express';
export type CertificationType = 'ai' | 'physical';

interface CertificationToggleProps {
  enabled: boolean;
  tier: CertificationTier;
  certificationType?: CertificationType;
  onEnabledChange: (enabled: boolean) => void;
  onTierChange: (tier: CertificationTier) => void;
  onTypeChange?: (type: CertificationType) => void;
}

// AI Pre-Grading tiers (same pricing as grading page)
const AI_TIERS = [
  {
    id: 'standard' as const,
    name: 'Standard',
    price: 10,
    days: 'Instant',
    description: 'AI analysis showing grade likelihood',
  },
  {
    id: 'express' as const,
    name: 'Priority',
    price: 15,
    days: 'Instant + badge boost',
    description: 'Priority visibility in marketplace',
    badge: 'Boost',
  },
];

// Physical CBG grading tiers (vault shipping required)
const PHYSICAL_TIERS = [
  {
    id: 'standard' as const,
    name: 'CBG Standard',
    price: 25,
    days: '7-14 days',
    description: 'Physical slab + Passport Index registration',
  },
  {
    id: 'express' as const,
    name: 'CBG Express',
    price: 50,
    days: '3-5 days',
    description: 'Priority physical grading + slab',
    badge: 'Fast',
  },
];

export const CertificationToggle = ({
  enabled,
  tier,
  certificationType = 'ai',
  onEnabledChange,
  onTierChange,
  onTypeChange,
}: CertificationToggleProps) => {
  const [showWarning, setShowWarning] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [activeType, setActiveType] = useState<CertificationType>(certificationType);

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
    onEnabledChange(checked);
  };

  const handleTypeChange = (type: CertificationType) => {
    setActiveType(type);
    onTypeChange?.(type);
  };

  const currentTiers = activeType === 'ai' ? AI_TIERS : PHYSICAL_TIERS;
  const selectedTier = currentTiers.find(t => t.id === tier);

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
                  Add Certification
                </Label>
                <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                  Recommended
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Get your card certified for higher trust and faster sales
              </p>
            </div>
          </div>
          <Switch 
            checked={enabled} 
            onCheckedChange={handleToggle}
          />
        </div>

        {/* Certification Type Selection */}
        <AnimatePresence>
          {enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                {/* Type Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('ai')}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-all",
                      activeType === 'ai' 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">CBGI Pre-Grading</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Instant AI analysis showing grade likelihood before real inspection
                    </p>
                    <Badge variant="secondary" className="mt-2 text-xs">From $10</Badge>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleTypeChange('physical')}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-all",
                      activeType === 'physical' 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Vault className="h-4 w-4 text-gold" />
                      <span className="font-semibold text-sm">CBG Physical</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ship to vault for real physical grading, slab & Passport Index
                    </p>
                    <Badge variant="secondary" className="mt-2 text-xs">From $25</Badge>
                  </button>
                </div>

                {/* Physical Grading Info */}
                {activeType === 'physical' && (
                  <div className="p-3 rounded-lg bg-gold/10 border border-gold/30 flex items-start gap-3">
                    <Truck className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gold">Ships to CardBoom Vault</p>
                      <p className="text-xs text-muted-foreground">
                        Your card will be shipped to our Ankara vault for hands-on physical inspection, 
                        professional encapsulation in a CBG slab, and permanent registration in our read-only Passport Index.
                      </p>
                    </div>
                  </div>
                )}

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
                    <Award className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{activeType === 'physical' ? 'Passport Index' : 'AI verified'}</span>
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
                          {currentTiers.map((tierOption) => (
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

        {/* Warning when disabled - show potential price increase */}
        <AnimatePresence>
          {showWarning && !enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-3">
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
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
                
                {/* Potential price increase info */}
                <div className="p-3 rounded-lg bg-gain/10 border border-gain/30 flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-gain flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gain">
                      Potential value with CBGI 9 grade
                    </p>
                    <p className="text-xs text-muted-foreground">
                      High-grade cards (CBGI 9+) typically sell for <span className="font-semibold text-foreground">2-5x more</span> than ungraded copies. Consider certification to maximize your sale price.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
