import { useState } from 'react';
import { Bell, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

interface CreatePriceAlertDialogProps {
  itemId: string;
  itemName: string;
  currentPrice: number;
  children?: React.ReactNode;
}

export const CreatePriceAlertDialog = ({ 
  itemId, 
  itemName, 
  currentPrice,
  children 
}: CreatePriceAlertDialogProps) => {
  const { formatPrice } = useCurrency();
  const { createAlert } = usePriceAlerts();
  const [open, setOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState(currentPrice.toString());
  const [alertType, setAlertType] = useState<'above' | 'below'>('below');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      setPriceError('Please enter a valid price greater than $0');
      return;
    }
    setPriceError(null);

    setIsSubmitting(true);
    const success = await createAlert(itemId, price, alertType);
    setIsSubmitting(false);
    
    if (success) {
      setOpen(false);
      setTargetPrice(currentPrice.toString());
    }
  };

  const targetNum = parseFloat(targetPrice) || 0;
  const priceDiff = ((targetNum - currentPrice) / currentPrice) * 100;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <Bell className="w-4 h-4" />
            Set Alert
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Create Price Alert
          </DialogTitle>
          <DialogDescription>
            Get notified when {itemName.slice(0, 40)}... reaches your target price
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Price */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <span className="text-sm text-muted-foreground">Current Price</span>
            <span className="font-bold text-lg">{formatPrice(currentPrice)}</span>
          </div>

          {/* Alert Type */}
          <div className="space-y-2">
            <Label>Alert me when price goes:</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={alertType === 'below' ? 'default' : 'outline'}
                className={cn(
                  "gap-2",
                  alertType === 'below' && "bg-gain hover:bg-gain/90"
                )}
                onClick={() => setAlertType('below')}
              >
                <TrendingDown className="w-4 h-4" />
                Below
              </Button>
              <Button
                variant={alertType === 'above' ? 'default' : 'outline'}
                className={cn(
                  "gap-2",
                  alertType === 'above' && "bg-loss hover:bg-loss/90"
                )}
                onClick={() => setAlertType('above')}
              >
                <TrendingUp className="w-4 h-4" />
                Above
              </Button>
            </div>
          </div>

          {/* Target Price */}
          <div className="space-y-2">
            <Label htmlFor="targetPrice">Target Price ($)</Label>
            <Input
              id="targetPrice"
              type="number"
              min="0"
              step="0.01"
              value={targetPrice}
              onChange={(e) => {
                setTargetPrice(e.target.value);
                setPriceError(null);
              }}
              className={cn("text-lg font-semibold", priceError && "border-destructive")}
            />
            {priceError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {priceError}
              </p>
            )}
            {targetNum > 0 && !priceError && (
              <p className={cn(
                "text-sm",
                priceDiff >= 0 ? "text-loss" : "text-gain"
              )}>
                {priceDiff >= 0 ? '+' : ''}{priceDiff.toFixed(1)}% from current price
              </p>
            )}
          </div>

          {/* Quick Set Buttons */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Quick Set</Label>
            <div className="flex flex-wrap gap-2">
              {[-20, -10, -5, 5, 10, 20].map((pct) => (
                <Button
                  key={pct}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newPrice = currentPrice * (1 + pct / 100);
                    setTargetPrice(newPrice.toFixed(2));
                    setAlertType(pct < 0 ? 'below' : 'above');
                  }}
                  className={cn(
                    "text-xs",
                    pct < 0 ? "hover:bg-gain/10 hover:text-gain" : "hover:bg-loss/10 hover:text-loss"
                  )}
                >
                  {pct > 0 ? '+' : ''}{pct}%
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || targetNum <= 0}
            className="gap-2"
          >
            <Bell className="w-4 h-4" />
            {isSubmitting ? 'Creating...' : 'Create Alert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
