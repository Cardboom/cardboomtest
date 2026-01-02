import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Truck, MapPin, AlertCircle, Package } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VaultItem {
  id: string;
  title: string;
  estimated_value: number;
}

interface RequestReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: VaultItem | null;
  onSuccess: () => void;
}

export const RequestReturnDialog = ({ open, onOpenChange, item, onSuccess }: RequestReturnDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [shippingRate, setShippingRate] = useState({ try: 75, usd: 7.5 });
  const [address, setAddress] = useState({
    name: '',
    street: '',
    city: '',
    postalCode: '',
    phone: '',
  });

  useEffect(() => {
    if (open) {
      fetchShippingRates();
    }
  }, [open]);

  const fetchShippingRates = async () => {
    const { data } = await supabase
      .from('vault_shipping_rates')
      .select('*')
      .eq('direction', 'from_vault')
      .eq('is_active', true)
      .single();
    
    if (data) {
      setShippingRate({ try: data.rate_try, usd: data.rate_usd });
    }
  };

  const handleSubmit = async () => {
    if (!item) return;
    
    if (!address.name || !address.street || !address.city) {
      toast.error('Please fill in all required address fields');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in first');
        return;
      }

      // Check wallet balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', session.user.id)
        .single();

      if (!wallet || wallet.balance < shippingRate.usd) {
        toast.error(`Insufficient balance. You need $${shippingRate.usd} for return shipping.`);
        return;
      }

      // Deduct shipping fee
      await supabase
        .from('wallets')
        .update({ balance: wallet.balance - shippingRate.usd })
        .eq('user_id', session.user.id);

      // Update vault item status
      await supabase
        .from('vault_items')
        .update({ 
          status: 'return_requested',
          return_shipping_fee: shippingRate.usd,
          admin_notes: `Return requested to: ${address.name}, ${address.street}, ${address.city} ${address.postalCode}, Phone: ${address.phone}`
        })
        .eq('id', item.id);

      toast.success('Return request submitted! We will ship your card within 3-5 business days.');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error requesting return:', error);
      toast.error('Failed to submit return request');
    } finally {
      setSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Request Card Return
          </DialogTitle>
          <DialogDescription>
            Have your card shipped back to you from the vault
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item Info */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="font-medium text-sm line-clamp-2">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Est. Value: ${item.estimated_value?.toLocaleString() || '0'}
              </p>
            </CardContent>
          </Card>

          {/* Shipping Fee */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-medium">Return Shipping Fee</p>
                    <p className="text-xs text-muted-foreground">Deducted from wallet</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">₺{shippingRate.try}</p>
                  <p className="text-xs text-muted-foreground">~${shippingRate.usd} USD</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">Shipping Address</Label>
            </div>
            
            <Input
              placeholder="Full Name *"
              value={address.name}
              onChange={(e) => setAddress({ ...address, name: e.target.value })}
            />
            <Input
              placeholder="Street Address *"
              value={address.street}
              onChange={(e) => setAddress({ ...address, street: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="City *"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
              />
              <Input
                placeholder="Postal Code"
                value={address.postalCode}
                onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
              />
            </div>
            <Input
              placeholder="Phone Number"
              value={address.phone}
              onChange={(e) => setAddress({ ...address, phone: e.target.value })}
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Your card will be shipped within 3-5 business days via tracked courier. You will receive tracking information via email.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Processing...' : `Pay ₺${shippingRate.try} & Request Return`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};