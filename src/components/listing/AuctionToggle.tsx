import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gavel, Calendar, Clock, DollarSign, Info, Lock, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuctionEligibility } from '@/hooks/useAuctionEligibility';
import { supabase } from '@/integrations/supabase/client';

interface AuctionToggleProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  startingPrice: string;
  onStartingPriceChange: (price: string) => void;
  reservePrice: string;
  onReservePriceChange: (price: string) => void;
  buyNowPrice: string;
  onBuyNowPriceChange: (price: string) => void;
  durationDays: string;
  onDurationChange: (days: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
}

const DURATION_OPTIONS = [
  { value: '1', label: '1 Day' },
  { value: '3', label: '3 Days' },
  { value: '5', label: '5 Days' },
  { value: '7', label: '7 Days' },
  { value: '10', label: '10 Days' },
  { value: '14', label: '14 Days (Max)' },
];

const LISTING_FEE = 0.50;
const SALE_FEE_RATE = 0.05; // 5%

export const AuctionToggle = ({
  enabled,
  onEnabledChange,
  startingPrice,
  onStartingPriceChange,
  reservePrice,
  onReservePriceChange,
  buyNowPrice,
  onBuyNowPriceChange,
  durationDays,
  onDurationChange,
  startDate,
  onStartDateChange,
}: AuctionToggleProps) => {
  const [userId, setUserId] = useState<string | undefined>();
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id);
    });
  }, []);

  const { canCreate, isEnterprise, loading } = useAuctionEligibility(userId);
  const startingPriceNum = parseFloat(startingPrice) || 0;
  const estimatedFee = startingPriceNum * SALE_FEE_RATE;

  // Only show for enterprise sellers
  if (!loading && !isEnterprise) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Gavel className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <Label className="text-base font-medium flex items-center gap-2 text-muted-foreground">
                Auction Mode
                <Badge variant="outline" className="text-xs gap-1">
                  <Building2 className="h-3 w-3" />
                  Enterprise Only
                </Badge>
              </Label>
              <p className="text-sm text-muted-foreground">
                Upgrade to Enterprise to create auctions
              </p>
            </div>
          </div>
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Gavel className="h-5 w-5 text-primary" />
          </div>
          <div>
            <Label className="text-base font-medium flex items-center gap-2">
              Auction Mode
              <Badge variant="outline" className="text-xs">$0.50 listing fee</Badge>
              <Badge className="text-xs gap-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0">
                <Building2 className="h-3 w-3" />
                Enterprise
              </Badge>
            </Label>
            <p className="text-sm text-muted-foreground">
              Let buyers bid on your item • 5% sale fee
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-4">
              {/* Fee Info */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border border-border/50">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">${LISTING_FEE.toFixed(2)}</span> listing fee + 
                  <span className="font-medium"> 5%</span> of final sale price
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Listing fee is charged when auction starts. Sale fee is deducted from final price if item sells.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Starting Price */}
                <div className="space-y-2">
                  <Label htmlFor="startingPrice">Starting Price ($) *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="startingPrice"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={startingPrice}
                      onChange={(e) => onStartingPriceChange(e.target.value)}
                      placeholder="1.00"
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Reserve Price */}
                <div className="space-y-2">
                  <Label htmlFor="reservePrice" className="flex items-center gap-1">
                    Reserve Price
                    <span className="text-xs text-muted-foreground">(Optional)</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reservePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={reservePrice}
                      onChange={(e) => onReservePriceChange(e.target.value)}
                      placeholder="Min to sell"
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Buy Now Price */}
                <div className="space-y-2">
                  <Label htmlFor="buyNowPrice" className="flex items-center gap-1">
                    Buy Now Price
                    <span className="text-xs text-muted-foreground">(Optional)</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="buyNowPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={buyNowPrice}
                      onChange={(e) => onBuyNowPriceChange(e.target.value)}
                      placeholder="Instant buy"
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select value={durationDays} onValueChange={onDurationChange}>
                    <SelectTrigger>
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="startDate" className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Start Date & Time
                    <span className="text-xs text-muted-foreground">(Leave empty to start now)</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              </div>

              {/* Estimated Fee Preview */}
              {startingPriceNum > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-gain/10 border border-gain/20">
                  <span className="text-sm text-muted-foreground">
                    If sells at starting price:
                  </span>
                  <div className="text-right">
                    <p className="text-sm">
                      You receive: <span className="font-semibold text-gain">
                        ${(startingPriceNum - estimatedFee - LISTING_FEE).toFixed(2)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      After ${LISTING_FEE.toFixed(2)} + ${estimatedFee.toFixed(2)} fees
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const AUCTION_LISTING_FEE = LISTING_FEE;
export const AUCTION_SALE_FEE_RATE = SALE_FEE_RATE;