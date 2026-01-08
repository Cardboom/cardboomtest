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
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, Loader2, Package, PlusCircle, ArrowLeft } from 'lucide-react';
import { CollectionPicker } from './CollectionPicker';
import { UserHoldingItem } from '@/hooks/useUserHoldings';
import { cn } from '@/lib/utils';

interface CreateSwapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Mode = 'select' | 'collection' | 'manual';

export const CreateSwapModal = ({ open, onOpenChange, onSuccess }: CreateSwapModalProps) => {
  const [mode, setMode] = useState<Mode>('select');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<UserHoldingItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'pokemon',
    condition: 'near_mint',
    grade: '',
    grading_company: '',
    estimated_value: '',
    looking_for: '',
    accept_cash_offers: true,
    min_cash_addon: '',
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setMode('select');
      setSelectedItem(null);
    }
  }, [open]);

  const handleSelectFromCollection = (item: UserHoldingItem) => {
    setSelectedItem(item);
    // Pre-fill form data from selected item
    setFormData({
      ...formData,
      title: item.title,
      category: item.category,
      condition: item.condition,
      grade: item.grade || '',
      grading_company: item.gradingCompany || '',
      estimated_value: item.currentValue.toString(),
    });
    setImageUrl(item.imageUrl || '');
    setMode('manual'); // Go to form to complete details
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `swap-listings/${fileName}`;

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
    
    if (!formData.title) {
      toast.error('Please enter a title');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('swap_listings').insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description || null,
        image_url: imageUrl || null,
        category: formData.category,
        condition: formData.condition,
        grade: formData.grade || null,
        grading_company: formData.grading_company || null,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        looking_for: formData.looking_for || null,
        accept_cash_offers: formData.accept_cash_offers,
        min_cash_addon: formData.min_cash_addon ? parseFloat(formData.min_cash_addon) : 0,
        card_instance_id: selectedItem?.cardInstanceId || null,
      });

      if (error) throw error;

      toast.success('Swap listing created!');
      onSuccess();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'pokemon',
        condition: 'near_mint',
        grade: '',
        grading_company: '',
        estimated_value: '',
        looking_for: '',
        accept_cash_offers: true,
        min_cash_addon: '',
      });
      setImageUrl('');
      setSelectedItem(null);
      setMode('select');
    } catch (error: any) {
      console.error('Error creating listing:', error);
      toast.error(error.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  const renderModeSelection = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        How would you like to create your swap listing?
      </p>
      
      <div className="grid gap-3">
        <button
          onClick={() => setMode('collection')}
          className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
        >
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Choose from My Collection</h3>
            <p className="text-sm text-muted-foreground">Select from your listings or vault items</p>
          </div>
        </button>

        <button
          onClick={() => setMode('manual')}
          className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
        >
          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
            <PlusCircle className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Create New Listing</h3>
            <p className="text-sm text-muted-foreground">Manually enter card details</p>
          </div>
        </button>
      </div>
    </div>
  );

  const renderCollectionPicker = () => (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setMode('select')}
        className="gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>
      
      {userId && (
        <CollectionPicker
          userId={userId}
          onSelect={handleSelectFromCollection}
          selectedId={selectedItem?.id}
        />
      )}
    </div>
  );

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === 'manual' && !selectedItem && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setMode('select')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      )}

      {selectedItem && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          {selectedItem.imageUrl && (
            <img 
              src={selectedItem.imageUrl} 
              alt={selectedItem.title}
              className="w-12 h-16 rounded object-cover"
            />
          )}
          <div className="flex-1">
            <p className="font-medium text-sm">{selectedItem.title}</p>
            <p className="text-xs text-muted-foreground">
              From your {selectedItem.type.replace('_', ' ')}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedItem(null);
              setMode('select');
            }}
          >
            Change
          </Button>
        </div>
      )}

      {/* Image Upload - only show if no selected item with image */}
      {(!selectedItem || !selectedItem.imageUrl) && (
        <div>
          <Label>Card Image</Label>
          <div className="mt-2">
            {imageUrl ? (
              <div className="relative w-32 h-44 rounded-lg overflow-hidden">
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
              <label className="flex flex-col items-center justify-center w-32 h-44 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-muted-foreground mb-2" />
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
      )}

      {/* Title */}
      <div>
        <Label htmlFor="title">Card Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Charizard Holo Base Set"
          required
        />
      </div>

      {/* Category & Condition */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
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
          <Label htmlFor="condition">Condition</Label>
          <select
            id="condition"
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

      {/* Grading */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="grading_company">Grading Company</Label>
          <select
            id="grading_company"
            value={formData.grading_company}
            onChange={(e) => setFormData({ ...formData, grading_company: e.target.value })}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">Not Graded</option>
            <option value="PSA">PSA</option>
            <option value="BGS">BGS</option>
            <option value="CGC">CGC</option>
          </select>
        </div>
        <div>
          <Label htmlFor="grade">Grade</Label>
          <Input
            id="grade"
            value={formData.grade}
            onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
            placeholder="e.g., 10, 9.5"
            disabled={!formData.grading_company}
          />
        </div>
      </div>

      {/* Estimated Value */}
      <div>
        <Label htmlFor="estimated_value">Estimated Value ($)</Label>
        <Input
          id="estimated_value"
          type="number"
          value={formData.estimated_value}
          onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
          placeholder="e.g., 150"
        />
      </div>

      {/* Looking For */}
      <div>
        <Label htmlFor="looking_for">What are you looking for?</Label>
        <Textarea
          id="looking_for"
          value={formData.looking_for}
          onChange={(e) => setFormData({ ...formData, looking_for: e.target.value })}
          placeholder="Describe what cards you'd like in exchange..."
          rows={2}
        />
      </div>

      {/* Accept Cash */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
        <div>
          <Label>Accept cash with trade?</Label>
          <p className="text-xs text-muted-foreground">Allow cash add-ons to balance trades</p>
        </div>
        <Switch
          checked={formData.accept_cash_offers}
          onCheckedChange={(checked) => setFormData({ ...formData, accept_cash_offers: checked })}
        />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Additional Notes</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Any other details about your card..."
          rows={2}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creating...' : 'Create Swap Listing'}
      </Button>
    </form>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'select' && 'List a Card for Swap'}
            {mode === 'collection' && 'Choose from Your Collection'}
            {mode === 'manual' && (selectedItem ? 'Complete Swap Details' : 'Create New Listing')}
          </DialogTitle>
        </DialogHeader>

        {mode === 'select' && renderModeSelection()}
        {mode === 'collection' && renderCollectionPicker()}
        {mode === 'manual' && renderForm()}
      </DialogContent>
    </Dialog>
  );
};
