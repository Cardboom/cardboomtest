import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WalletTopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TOPUP_FEE_PERCENT = 7;

export const WalletTopUpDialog = ({ open, onOpenChange, onSuccess }: WalletTopUpDialogProps) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const fee = numAmount * (TOPUP_FEE_PERCENT / 100);
  const total = numAmount + fee;

  const presetAmounts = [50, 100, 250, 500, 1000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (numAmount < 10) {
      toast.error('Minimum top-up is $10');
      return;
    }

    setLoading(true);

    // TODO: Integrate with payment processor (Stripe, etc.)
    // For now, show placeholder message
    toast.info('Payment integration coming soon. Contact support to add funds manually.');
    
    setLoading(false);
    onOpenChange(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Add Funds to Wallet
          </DialogTitle>
          <DialogDescription>
            Top up your wallet with credit card. 7% processing fee applies.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preset amounts */}
          <div>
            <Label className="mb-2 block">Quick Select</Label>
            <div className="flex flex-wrap gap-2">
              {presetAmounts.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={numAmount === preset ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAmount(preset.toString())}
                >
                  ${preset}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <Label htmlFor="amount">Custom Amount (USD)</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                min="10"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          {/* Fee breakdown */}
          {numAmount > 0 && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span>{formatCurrency(numAmount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Processing Fee (7%)</span>
                <span>{formatCurrency(fee)}</span>
              </div>
              <div className="flex justify-between font-medium text-foreground border-t border-border pt-2">
                <span>Total Charge</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Funds will be added to your wallet immediately after payment confirmation.
              You can use your balance to buy cards, subscribe to verified seller, or withdraw.
            </p>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || numAmount < 10}>
              {loading ? 'Processing...' : `Pay ${formatCurrency(total)}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
