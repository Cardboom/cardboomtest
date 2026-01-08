import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Upload, 
  X, 
  Loader2, 
  ArrowRight, 
  Plus,
  DollarSign 
} from 'lucide-react';

interface MakeOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: {
    id: string;
    title: string;
    image_url: string | null;
    estimated_value: number | null;
    accept_cash_offers: boolean;
    min_cash_addon: number | null;
  };
  onSuccess: () => void;
}

export const MakeOfferModal = ({ open, onOpenChange, listing, onSuccess }: MakeOfferModalProps) => {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'pokemon',
    condition: 'near_mint',
    grade: '',
    estimated_value: '',
    cash_addon: '',
    message: '',
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `swap-offers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('card-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('card-images')
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title && !formData.cash_addon) {
      toast.error('Please offer a card or cash');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('swap_offers').insert({
        swap_listing_id: listing.id,
        offerer_id: user.id,
        offered_card_title: formData.title || 'Cash Only Offer',
        offered_card_image: imageUrl || null,
        offered_card_category: formData.category,
        offered_card_condition: formData.condition,
        offered_card_grade: formData.grade || null,
        offered_card_estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        cash_addon: formData.cash_addon ? parseFloat(formData.cash_addon) : 0,
        message: formData.message || null,
      });

      if (error) throw error;

      onSuccess();
      
      // Reset form
      setFormData({
        title: '',
        category: 'pokemon',
        condition: 'near_mint',
        grade: '',
        estimated_value: '',
        cash_addon: '',
        message: '',
      });
      setImageUrl('');
    } catch (error: any) {
      console.error('Error making offer:', error);
      toast.error(error.message || 'Failed to make offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Make a Swap Offer</DialogTitle>
        </DialogHeader>

        {/* Visual Trade Preview */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 mb-4">
          {/* Their Card */}
          <div className="flex-1 text-center">
            <p className="text-xs text-muted-foreground mb-2">They're offering</p>
            <div className="w-20 h-28 mx-auto rounded-lg overflow-hidden bg-background border border-border">
              {listing.image_url ? (
                <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  ?
                </div>
              )}
            </div>
            <p className="text-sm font-medium mt-2 line-clamp-1">{listing.title}</p>
            {listing.estimated_value && (
              <Badge variant="outline" className="mt-1 text-xs">
                ~${listing.estimated_value}
              </Badge>
            )}
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center gap-1">
            <ArrowRight className="w-5 h-5 text-primary" />
            <ArrowRight className="w-5 h-5 text-primary rotate-180" />
          </div>

          {/* Your Offer */}
          <div className="flex-1 text-center">
            <p className="text-xs text-muted-foreground mb-2">You're offering</p>
            <div className="w-20 h-28 mx-auto rounded-lg overflow-hidden bg-background border-2 border-dashed border-primary/50">
              {imageUrl ? (
                <img src={imageUrl} alt="Your card" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Plus className="w-6 h-6 text-primary/50" />
                </div>
              )}
            </div>
            <p className="text-sm font-medium mt-2 line-clamp-1">
              {formData.title || 'Your Card'}
            </p>
            {formData.cash_addon && (
              <Badge className="mt-1 text-xs bg-green-500">
                +${formData.cash_addon}
              </Badge>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Your Card Image */}
          <div>
            <Label>Your Card Image</Label>
            <div className="mt-2 flex items-center gap-4">
              {imageUrl ? (
                <div className="relative w-24 h-32 rounded-lg overflow-hidden">
                  <img src={imageUrl} alt="Card" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-24 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Card Title */}
          <div>
            <Label htmlFor="offer-title">Card Name</Label>
            <Input
              id="offer-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Pikachu VMAX"
            />
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="offer-category">Category</Label>
              <select
                id="offer-category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="pokemon">Pokémon</option>
                <option value="magic">Magic: The Gathering</option>
                <option value="yugioh">Yu-Gi-Oh!</option>
                <option value="one-piece">One Piece</option>
                <option value="sports">Sports Cards</option>
                <option value="figures">Figures</option>
              </select>
            </div>
            <div>
              <Label htmlFor="offer-condition">Condition</Label>
              <select
                id="offer-condition"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="mint">Mint</option>
                <option value="near_mint">Near Mint</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="played">Played</option>
              </select>
            </div>
          </div>

          {/* Estimated Value */}
          <div>
            <Label htmlFor="offer-value">Estimated Value ($)</Label>
            <Input
              id="offer-value"
              type="number"
              value={formData.estimated_value}
              onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
              placeholder="e.g., 100"
            />
          </div>

          {/* Cash Add-on */}
          {listing.accept_cash_offers && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <Label htmlFor="cash-addon" className="text-green-500">Add Cash to Offer (Optional)</Label>
              </div>
              <Input
                id="cash-addon"
                type="number"
                value={formData.cash_addon}
                onChange={(e) => setFormData({ ...formData, cash_addon: e.target.value })}
                placeholder="0"
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Add cash to make your offer more attractive
              </p>
            </div>
          )}

          {/* Message */}
          <div>
            <Label htmlFor="offer-message">Message (Optional)</Label>
            <Textarea
              id="offer-message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Any additional details about your offer..."
              rows={2}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Sending Offer...' : 'Send Swap Offer'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
