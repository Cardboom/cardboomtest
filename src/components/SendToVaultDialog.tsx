import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Vault, Package, MapPin, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SendToVaultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WAREHOUSE_ADDRESS = {
  name: 'CardBoom Vault',
  address: 'CardBoom Secure Storage Facility',
  city: 'Istanbul',
  country: 'Turkey',
  postal: '34000',
  phone: 'Support: help@cardboom.com',
};

const categories = ['pokemon', 'mtg', 'yugioh', 'onepiece', 'lorcana', 'nba', 'football', 'figures', 'tcg'];
const conditions = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor'];

export const SendToVaultDialog = ({ open, onOpenChange }: SendToVaultDialogProps) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'pokemon',
    condition: 'Near Mint',
    estimatedValue: '',
  });

  const handleCopyAddress = () => {
    const fullAddress = `${WAREHOUSE_ADDRESS.name}\n${WAREHOUSE_ADDRESS.address}\n${WAREHOUSE_ADDRESS.city}, ${WAREHOUSE_ADDRESS.postal}\n${WAREHOUSE_ADDRESS.country}`;
    navigator.clipboard.writeText(fullAddress);
    toast.success('Address copied to clipboard');
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a card title');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in first');
        return;
      }

      // Create a pending vault item
      const { error } = await supabase
        .from('vault_items')
        .insert({
          owner_id: session.user.id,
          title: formData.title,
          description: formData.description || `Pending arrival - ${formData.category}`,
          category: formData.category,
          condition: formData.condition,
          estimated_value: formData.estimatedValue ? parseFloat(formData.estimatedValue) : null,
        });

      if (error) throw error;

      toast.success('Vault request submitted! Ship your card to the address shown.');
      setStep(3);
    } catch (error) {
      console.error('Error creating vault request:', error);
      toast.error('Failed to submit vault request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      title: '',
      description: '',
      category: 'pokemon',
      condition: 'Near Mint',
      estimatedValue: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Vault className="h-5 w-5 text-primary" />
            Send Your Card to Vault
          </DialogTitle>
          <DialogDescription>
            Store your cards securely in our insured facility
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  How it works
                </h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Register your card details below</li>
                  <li>Ship your card to our secure warehouse</li>
                  <li>We verify, authenticate & store your card</li>
                  <li>Your card appears in your vault, ready to trade or sell</li>
                </ol>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div>
                <Label htmlFor="title">Card Name *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Charizard Base Set 1st Edition PSA 10"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Condition</Label>
                  <Select
                    value={formData.condition}
                    onValueChange={(value) => setFormData({ ...formData, condition: value })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {conditions.map((cond) => (
                        <SelectItem key={cond} value={cond}>
                          {cond}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="estimatedValue">Estimated Value (USD)</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="estimatedValue"
                    type="number"
                    placeholder="0.00"
                    value={formData.estimatedValue}
                    onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                    className="pl-7"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Additional Notes</Label>
                <Textarea
                  id="description"
                  placeholder="Any special instructions or notes about your card..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1.5"
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-4">
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Ship to this address:</h4>
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      <p className="font-medium text-foreground">{WAREHOUSE_ADDRESS.name}</p>
                      <p>{WAREHOUSE_ADDRESS.address}</p>
                      <p>{WAREHOUSE_ADDRESS.city}, {WAREHOUSE_ADDRESS.postal}</p>
                      <p>{WAREHOUSE_ADDRESS.country}</p>
                      <p className="mt-2 text-xs">{WAREHOUSE_ADDRESS.phone}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-2"
                      onClick={handleCopyAddress}
                    >
                      <Copy className="h-3 w-3" />
                      Copy Address
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
              <AlertCircle className="h-4 w-4 text-accent mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Important:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Use secure, tracked shipping</li>
                  <li>Package your card in protective sleeve & toploader</li>
                  <li>Include your username inside the package</li>
                  <li>Processing takes 3-5 business days after arrival</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-gain/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-gain" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Request Submitted!</h3>
            <p className="text-muted-foreground mb-4">
              Your vault request has been created. Ship your card to our warehouse address and we'll verify it upon arrival.
            </p>
            <Card className="border-primary/20">
              <CardContent className="p-3 text-left">
                <p className="text-sm font-medium">{WAREHOUSE_ADDRESS.name}</p>
                <p className="text-xs text-muted-foreground">{WAREHOUSE_ADDRESS.address}</p>
                <p className="text-xs text-muted-foreground">{WAREHOUSE_ADDRESS.city}, {WAREHOUSE_ADDRESS.country}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          {step === 1 && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep(2)}>
                <Package className="h-4 w-4 mr-2" />
                Continue
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Confirm & Submit'}
              </Button>
            </>
          )}
          {step === 3 && (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};