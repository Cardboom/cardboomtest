import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Zap, DollarSign, Calendar, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateBuyOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillData?: {
    itemName?: string;
    category?: string;
    marketItemId?: string;
    suggestedPrice?: number;
  };
  onSuccess?: () => void;
}

const CATEGORIES = [
  { value: 'pokemon', label: 'Pokémon' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!' },
  { value: 'mtg', label: 'Magic: The Gathering' },
  { value: 'sports', label: 'Sports Cards' },
  { value: 'onepiece', label: 'One Piece' },
  { value: 'lorcana', label: 'Lorcana' },
  { value: 'figures', label: 'Figures & Collectibles' },
];

const CONDITIONS = [
  { value: 'mint', label: 'Mint' },
  { value: 'near-mint', label: 'Near Mint' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'played', label: 'Played' },
];

const EXPIRY_OPTIONS = [
  { value: '1', label: '1 Day' },
  { value: '3', label: '3 Days' },
  { value: '7', label: '7 Days' },
  { value: '14', label: '14 Days' },
  { value: '30', label: '30 Days' },
];

export const CreateBuyOrderDialog = ({
  open,
  onOpenChange,
  prefillData,
  onSuccess,
}: CreateBuyOrderDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    itemName: prefillData?.itemName || '',
    category: prefillData?.category || '',
    condition: '',
    grade: '',
    maxPrice: prefillData?.suggestedPrice?.toString() || '',
    quantity: '1',
    expiryDays: '7',
    notes: '',
  });

  const handleSubmit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Please sign in to create a buy order');
      return;
    }

    if (!formData.itemName || !formData.category || !formData.maxPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    const maxPrice = parseFloat(formData.maxPrice);
    if (isNaN(maxPrice) || maxPrice <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setIsLoading(true);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(formData.expiryDays));

      const { error } = await supabase.from('buy_orders').insert({
        buyer_id: session.user.id,
        market_item_id: prefillData?.marketItemId || null,
        item_name: formData.itemName,
        category: formData.category,
        condition: formData.condition || null,
        grade: formData.grade || null,
        max_price: maxPrice,
        quantity: parseInt(formData.quantity) || 1,
        expires_at: expiresAt.toISOString(),
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast.success('Buy order created! Sellers can now accept your offer.');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating buy order:', error);
      toast.error('Failed to create buy order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Create Buy Order
          </DialogTitle>
          <DialogDescription>
            Post an instant offer. Sellers can accept and sell directly to you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Item Name *</Label>
              <Input
                placeholder="e.g. Charizard Base Set 1st Edition"
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={formData.condition}
                onValueChange={(value) => setFormData({ ...formData, condition: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any condition" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((cond) => (
                    <SelectItem key={cond.value} value={cond.value}>
                      {cond.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Grade (Optional)</Label>
              <Input
                placeholder="e.g. PSA 10, BGS 9.5"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Max Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.maxPrice}
                  onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Expires In</Label>
              <Select
                value={formData.expiryDays}
                onValueChange={(value) => setFormData({ ...formData, expiryDays: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Any specific requirements..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
              <Zap className="w-4 h-4" />
              {isLoading ? 'Creating...' : 'Post Buy Order'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
