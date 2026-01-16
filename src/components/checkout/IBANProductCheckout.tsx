import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Building2, Copy, Check, ShoppingBag, Shield, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface IBANProductCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderTotal: number; // in TRY
  productTitle: string;
  onPaymentConfirmed?: () => void;
}

// Cardboom's bank details
const CARDBOOM_IBAN = 'TR490086401100008249929845';
const CARDBOOM_IBAN_FORMATTED = 'TR49 0086 4011 0000 8249 9298 45';
const CARDBOOM_BANK = 'BRAINBABY BILISIM ANONIM SIRKETI';

/**
 * IBAN Product Checkout for Turkish Users
 * 
 * COMPLIANCE: Bank transfers in Turkey are ONLY for direct product purchases.
 * Each transfer is tied to a specific order/invoice. No wallet funding.
 */
export const IBANProductCheckout = ({ 
  open, 
  onOpenChange, 
  orderId,
  orderTotal,
  productTitle,
  onPaymentConfirmed 
}: IBANProductCheckoutProps) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success(`${field} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  // Payment reference must include order ID for matching
  const paymentReference = `CB-${orderId.slice(0, 8).toUpperCase()}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Buy with Bank Transfer (IBAN)
          </DialogTitle>
          <DialogDescription>
            Complete your purchase via domestic Turkish bank transfer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Summary - Tied to specific order */}
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <ShoppingBag className="h-4 w-4" />
              <span className="text-sm font-medium">Order Details</span>
            </div>
            <div>
              <p className="font-medium text-foreground">{productTitle}</p>
              <p className="text-2xl font-bold text-primary mt-1">
                ₺{orderTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              Order ID: {paymentReference}
            </Badge>
          </div>

          {/* Critical Instructions */}
          <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-bold text-foreground">⚠️ IMPORTANT</p>
                <p className="text-sm text-muted-foreground">
                  You <strong>MUST</strong> include the reference <strong className="text-amber-500">{paymentReference}</strong> in your transfer description.
                </p>
                <p className="text-xs text-muted-foreground">
                  Transfers without the correct reference will be refunded to the sender.
                </p>
              </div>
            </div>
          </div>

          {/* Transfer Details */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Transfer Details</Label>
            
            <div className="space-y-3">
              {/* Beneficiary Name */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Beneficiary Name</p>
                  <p className="font-medium text-sm">{CARDBOOM_BANK}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(CARDBOOM_BANK, 'Beneficiary Name')}
                >
                  {copied === 'Beneficiary Name' ? (
                    <Check className="h-4 w-4 text-gain" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* IBAN */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                <div>
                  <p className="text-xs text-muted-foreground">IBAN</p>
                  <p className="font-mono font-medium text-sm">{CARDBOOM_IBAN_FORMATTED}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(CARDBOOM_IBAN, 'IBAN')}
                >
                  {copied === 'IBAN' ? (
                    <Check className="h-4 w-4 text-gain" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Amount */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Exact Amount</p>
                  <p className="font-bold text-lg text-primary">
                    ₺{orderTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(orderTotal.toFixed(2), 'Amount')}
                >
                  {copied === 'Amount' ? (
                    <Check className="h-4 w-4 text-gain" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Reference */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border-2 border-amber-500/30">
                <div>
                  <p className="text-xs text-muted-foreground">Payment Reference (Required)</p>
                  <p className="font-mono font-bold text-lg text-amber-500">{paymentReference}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(paymentReference, 'Reference')}
                >
                  {copied === 'Reference' ? (
                    <Check className="h-4 w-4 text-gain" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Currency */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Currency</p>
                  <p className="font-medium text-sm">TRY (Turkish Lira only)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Processing Time */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Processing Time</p>
              <p className="text-xs text-muted-foreground">
                1-2 business days after transfer is received
              </p>
            </div>
          </div>

          {/* Trust Message */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gain/5 border border-gain/20">
            <Shield className="h-5 w-5 text-gain" />
            <div>
              <p className="text-sm font-medium text-gain">Buyer Protection</p>
              <p className="text-xs text-muted-foreground">
                Your purchase is protected until item is confirmed delivered
              </p>
            </div>
          </div>

          {/* Compliance Notice */}
          <p className="text-xs text-muted-foreground text-center">
            This payment is for the purchase of the specific product listed above.
            Bank transfers do not credit account balances.
          </p>

          <Button onClick={() => onOpenChange(false)} className="w-full" size="lg">
            I've Completed the Transfer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
