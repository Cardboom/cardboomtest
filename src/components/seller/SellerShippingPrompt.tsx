import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, Truck, CheckCircle, Copy, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface SellerShippingPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    title: string;
    price: number;
    buyerName?: string;
    deliveryOption: string;
    shippingAddress?: {
      name: string;
      address: string;
      city: string;
      postalCode: string;
    } | null;
  } | null;
  onComplete: () => void;
}

export const SellerShippingPrompt = ({
  open,
  onOpenChange,
  order,
  onComplete,
}: SellerShippingPromptProps) => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!order) return null;

  const isVaultDelivery = order.deliveryOption === 'vault';

  const handleSubmitTracking = async () => {
    if (!trackingNumber.trim()) {
      toast.error('Please enter a tracking number');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          tracking_number: trackingNumber,
          carrier: carrier || null,
          status: 'shipped',
          shipped_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Tracking info saved! Buyer has been notified.');
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating tracking:', error);
      toast.error('Failed to save tracking info');
    } finally {
      setSubmitting(false);
    }
  };

  const copyAddress = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="mx-auto mb-4 w-16 h-16 rounded-full bg-gain/20 flex items-center justify-center"
          >
            <CheckCircle className="w-8 h-8 text-gain" />
          </motion.div>
          <DialogTitle className="text-center text-xl">
            Congratulations! Your Item Sold!
          </DialogTitle>
          <DialogDescription className="text-center">
            <span className="font-semibold text-foreground">{order.title}</span> for{' '}
            <span className="font-bold text-primary">${order.price.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Shipping Instructions */}
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Ship within 3 business days</p>
                <p className="text-sm text-muted-foreground">
                  Funds will be held until the buyer confirms receipt
                </p>
              </div>
            </div>
          </div>

          {isVaultDelivery ? (
            /* Vault Delivery - Ship to CardBoom */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <span className="font-medium">Ship to CardBoom Vault</span>
                <Badge variant="outline" className="ml-auto">Vault Delivery</Badge>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Recipient</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2"
                    onClick={() => copyAddress('BRAINBABY BİLİŞİM ANONİM ŞİRKETİ')}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <p className="font-medium text-foreground">BRAINBABY BİLİŞİM ANONİM ŞİRKETİ</p>
                <Separator />
                <p className="text-sm text-muted-foreground">İran Caddesi 55/9</p>
                <p className="text-sm text-muted-foreground">Gaziosmanpaşa Mahallesi</p>
                <p className="text-sm text-muted-foreground">Çankaya, Ankara, Türkiye 06700</p>
              </div>
            </div>
          ) : order.shippingAddress ? (
            /* Direct Shipping to Buyer */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                <span className="font-medium">Ship to Buyer</span>
                <Badge variant="outline" className="ml-auto">Direct Shipping</Badge>
              </div>
              
              {order.shippingAddress ? (
                <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Shipping Address</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2"
                      onClick={() => copyAddress(
                        `${order.shippingAddress?.name || ''}\n${order.shippingAddress?.address || ''}\n${order.shippingAddress?.city || ''} ${order.shippingAddress?.postalCode || ''}`
                      )}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy All
                    </Button>
                  </div>
                  <p className="font-medium text-foreground">{order.shippingAddress.name}</p>
                  <p className="text-sm text-muted-foreground">{order.shippingAddress.address}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.shippingAddress.city} {order.shippingAddress.postalCode}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-center">
                  <p className="text-sm text-destructive">Shipping address not available</p>
                </div>
              )}
            </div>
          ) : null}

          <Separator />

          {/* Tracking Input */}
          <div className="space-y-3">
            <Label htmlFor="tracking">Tracking Number</Label>
            <Input
              id="tracking"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
            />
            <Label htmlFor="carrier">Carrier (optional)</Label>
            <Input
              id="carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="e.g., DHL, FedEx, UPS"
            />
          </div>

          {/* Timeline */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Tracking info is shared with the buyer for peace of mind</span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            I'll do this later
          </Button>
          <Button
            onClick={handleSubmitTracking}
            disabled={submitting || !trackingNumber.trim()}
            className="w-full sm:w-auto gap-2"
          >
            {submitting ? (
              <>Saving...</>
            ) : (
              <>
                <Truck className="w-4 h-4" />
                Confirm Shipped
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
