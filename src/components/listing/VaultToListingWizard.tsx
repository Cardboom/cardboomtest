import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Vault, Package, Loader2, CheckCircle, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VaultItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  condition: string;
  estimated_value: number;
  image_url?: string;
}

interface VaultToListingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaultItem: VaultItem | null;
  onSuccess: (listingId: string) => void;
}

const conditions = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor'];

export const VaultToListingWizard = ({
  open,
  onOpenChange,
  vaultItem,
  onSuccess,
}: VaultToListingWizardProps) => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'tcg',
    condition: 'Near Mint',
    price: '',
    allowsTrade: true,
  });

  // Pre-fill form when vault item changes
  useEffect(() => {
    if (vaultItem) {
      setFormData({
        title: vaultItem.title || '',
        description: vaultItem.description || '',
        category: vaultItem.category || 'tcg',
        condition: vaultItem.condition || 'Near Mint',
        price: vaultItem.estimated_value?.toString() || '',
        allowsTrade: true,
      });
    }
  }, [vaultItem]);

  if (!vaultItem) return null;

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    const price = parseFloat(formData.price);
    if (!price || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to create a listing');
        navigate('/auth');
        return;
      }

      // Create listing from vault item
      const { data: listing, error } = await supabase
        .from('listings')
        .insert({
          seller_id: session.user.id,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          condition: formData.condition,
          price: price,
          allows_vault: true, // Item is already in vault
          allows_trade: formData.allowsTrade,
          allows_shipping: false, // Vault items ship from warehouse
          image_url: vaultItem.image_url,
          vault_item_id: vaultItem.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Update vault item status
      await supabase
        .from('vault_items')
        .update({ status: 'listed' })
        .eq('id', vaultItem.id);

      toast.success('Listing created from vault item!');
      onSuccess(listing.id);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating listing:', error);
      toast.error(error.message || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Vault className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>List from Vault</DialogTitle>
              <DialogDescription>
                Create a marketplace listing for your vault item
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Vault Item Preview */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border">
            {vaultItem.image_url ? (
              <img
                src={vaultItem.image_url}
                alt={vaultItem.title}
                className="w-16 h-20 object-cover rounded-md"
              />
            ) : (
              <div className="w-16 h-20 bg-muted rounded-md flex items-center justify-center">
                <Package className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <Badge variant="outline" className="mb-1 gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                Verified in Vault
              </Badge>
              <h3 className="font-semibold text-foreground truncate">
                {vaultItem.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                Est. Value: ${vaultItem.estimated_value?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Card name and details"
              />
            </div>

            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details about the card..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pokemon">Pokémon</SelectItem>
                    <SelectItem value="mtg">Magic: The Gathering</SelectItem>
                    <SelectItem value="yugioh">Yu-Gi-Oh!</SelectItem>
                    <SelectItem value="onepiece">One Piece</SelectItem>
                    <SelectItem value="lorcana">Lorcana</SelectItem>
                    <SelectItem value="nba">NBA Cards</SelectItem>
                    <SelectItem value="football">Football Cards</SelectItem>
                    <SelectItem value="figures">Figures</SelectItem>
                    <SelectItem value="tcg">Other TCG</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="condition">Condition</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conditions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="price">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Asking Price (USD)
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
                className="text-lg font-semibold"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowsTrade"
                checked={formData.allowsTrade}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowsTrade: !!checked }))}
              />
              <Label htmlFor="allowsTrade" className="text-sm font-normal">
                Open to trade offers
              </Label>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 inline mr-1 text-emerald-500" />
              Since this item is verified in our vault, buyers will receive it directly from CardBoom with guaranteed authenticity.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Listing'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
