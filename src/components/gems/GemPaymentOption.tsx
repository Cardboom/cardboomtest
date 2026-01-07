import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';

interface GemPaymentOptionProps {
  totalPriceCents: number;
  onGemAmountChange: (gemAmount: number, discountCents: number) => void;
  className?: string;
}

export function GemPaymentOption({ totalPriceCents, onGemAmountChange, className }: GemPaymentOptionProps) {
  const [useGems, setUseGems] = useState(false);
  const [gemBalance, setGemBalance] = useState(0);
  const [gemAmount, setGemAmount] = useState(0);
  const { formatPrice } = useCurrency();

  // 1 gem = $0.01 = 1 cent
  const maxGemsUsable = Math.min(gemBalance, totalPriceCents);
  const discountCents = gemAmount;
  const remainingCents = totalPriceCents - discountCents;

  useEffect(() => {
    const fetchGemBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('cardboom_points')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setGemBalance(data.balance);
      }
    };

    fetchGemBalance();
  }, []);

  useEffect(() => {
    onGemAmountChange(useGems ? gemAmount : 0, useGems ? discountCents : 0);
  }, [useGems, gemAmount, discountCents, onGemAmountChange]);

  if (gemBalance <= 0) {
    return null;
  }

  return (
    <div className={cn("rounded-xl border border-border p-4 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Checkbox
            id="use-gems"
            checked={useGems}
            onCheckedChange={(checked) => {
              setUseGems(!!checked);
              if (checked) {
                setGemAmount(Math.min(maxGemsUsable, totalPriceCents));
              }
            }}
          />
          <Label htmlFor="use-gems" className="flex items-center gap-2 cursor-pointer">
            <Sparkles className="w-4 h-4 text-primary" />
            Pay with CardBoom Gems
          </Label>
        </div>
        <Badge variant="outline" className="gap-1">
          <Sparkles className="w-3 h-3" />
          {gemBalance.toLocaleString()} available
        </Badge>
      </div>

      {useGems && (
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Gems to use</span>
              <span className="font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" />
                {gemAmount.toLocaleString()}
              </span>
            </div>
            <Slider
              value={[gemAmount]}
              onValueChange={([value]) => setGemAmount(value)}
              min={0}
              max={maxGemsUsable}
              step={100}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>{maxGemsUsable.toLocaleString()} max</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-muted-foreground text-xs">Gem Discount</p>
              <p className="font-bold text-gain">-{formatPrice(discountCents / 100)}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <p className="text-muted-foreground text-xs">You Pay</p>
              <p className="font-bold text-foreground">{formatPrice(remainingCents / 100)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
