import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Vault, Truck, ArrowLeftRight, ShoppingCart, Loader2 } from 'lucide-react';
import { usePurchase } from '@/hooks/usePurchase';

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: {
    id: string;
    title: string;
    price: number;
    seller_id: string;
    allows_vault: boolean;
    allows_shipping: boolean;
    allows_trade: boolean;
    category: string;
    condition: string;
    image_url?: string | null;
  };
}

export const PurchaseDialog = ({ open, onOpenChange, listing }: PurchaseDialogProps) => {
  const [deliveryOption, setDeliveryOption] = useState<'vault' | 'ship' | 'trade'>('vault');
  const { purchase, loading, calculateFees } = usePurchase();

  const fees = calculateFees(listing.price);

  const handlePurchase = async () => {
    const result = await purchase({
      listingId: listing.id,
      sellerId: listing.seller_id,
      price: listing.price,
      deliveryOption,
      title: listing.title,
      category: listing.category,
      condition: listing.condition,
      imageUrl: listing.image_url,
    });

    if (result.success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Confirm Purchase
          </DialogTitle>
          <DialogDescription>
            Complete your purchase of {listing.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Item Summary */}
          <div className="glass rounded-lg p-4">
            <p className="font-medium text-foreground mb-1">{listing.title}</p>
            <p className="text-2xl font-bold text-foreground">
              ${listing.price.toLocaleString()}
            </p>
          </div>

          {/* Delivery Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Delivery Option</Label>
            <RadioGroup
              value={deliveryOption}
              onValueChange={(v) => setDeliveryOption(v as 'vault' | 'ship' | 'trade')}
              className="space-y-2"
            >
              {listing.allows_vault && (
                <label className="flex items-center gap-3 glass rounded-lg p-3 cursor-pointer hover:bg-secondary/50 transition-colors">
                  <RadioGroupItem value="vault" id="vault" />
                  <Vault className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Vault Storage</p>
                    <p className="text-xs text-muted-foreground">
                      Secure storage in our vault
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">Recommended</Badge>
                </label>
              )}

              {listing.allows_shipping && (
                <label className="flex items-center gap-3 glass rounded-lg p-3 cursor-pointer hover:bg-secondary/50 transition-colors">
                  <RadioGroupItem value="ship" id="ship" />
                  <Truck className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Shipping</p>
                    <p className="text-xs text-muted-foreground">
                      Ship to your address
                    </p>
                  </div>
                </label>
              )}

              {listing.allows_trade && (
                <label className="flex items-center gap-3 glass rounded-lg p-3 cursor-pointer hover:bg-secondary/50 transition-colors">
                  <RadioGroupItem value="trade" id="trade" />
                  <ArrowLeftRight className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Trade Online</p>
                    <p className="text-xs text-muted-foreground">
                      Trade digitally on platform
                    </p>
                  </div>
                </label>
              )}
            </RadioGroup>
          </div>

          {/* Price Breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item Price</span>
              <span>${listing.price.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buyer Fee (5%)</span>
              <span>${fees.buyerFee.toFixed(2)}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span className="text-primary">${fees.totalBuyerPays.toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 gap-2"
              onClick={handlePurchase}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Pay ${fees.totalBuyerPays.toFixed(2)}
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Payment will be deducted from your wallet balance
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
