import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Upload, Loader2, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ListThisCardDialogProps {
  cardName: string;
  category: string;
  setName?: string | null;
  marketItemId?: string;
  user: any;
}

export const ListThisCardDialog = ({ 
  cardName, 
  category, 
  setName,
  marketItemId,
  user 
}: ListThisCardDialogProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('near_mint');
  const [description, setDescription] = useState('');
  const [displayCardName, setDisplayCardName] = useState(cardName);
  const [displayCategory, setDisplayCategory] = useState(category);
  const [displaySetName, setDisplaySetName] = useState(setName);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update display values when props change (fixes immediate fill issue)
  useEffect(() => {
    setDisplayCardName(cardName);
    setDisplayCategory(category);
    setDisplaySetName(setName);
  }, [cardName, category, setName]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to list a card');
      navigate('/auth');
      return;
    }

    if (!imageFile) {
      toast.error('Please upload an image of your card');
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setLoading(true);
    try {
      // Upload image to storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('listing-images')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(fileName);

      // Create listing using display values (synced from props)
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert({
          title: displayCardName,
          category: displayCategory,
          set_name: displaySetName,
          condition,
          price: parseFloat(price),
          description: description || null,
          image_url: publicUrl,
          seller_id: user.id,
          status: 'active',
          market_item_id: marketItemId,
          allows_vault: true,
          allows_shipping: true,
          allows_trade: false,
        })
        .select()
        .single();

      if (listingError) throw listingError;

      toast.success('Card listed successfully!');
      setOpen(false);
      navigate(`/listing/${listing.id}`);
    } catch (error: any) {
      console.error('Error listing card:', error);
      toast.error(error.message || 'Failed to list card');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Button 
        onClick={() => navigate('/auth')}
        className="gap-2"
      >
        <Plus className="w-4 h-4" />
        List This Card
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          List This Card
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>List Your {displayCardName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Your Card Photo</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 transition-colors"
            >
              {imagePreview ? (
                <img 
                  src={imagePreview} 
                  alt="Card preview" 
                  className="w-full h-48 object-contain rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Camera className="w-10 h-10 mb-2" />
                  <p className="text-sm font-medium">Take a photo or upload</p>
                  <p className="text-xs">Tap to add your card image</p>
                </div>
              )}
            </div>
          </div>

          {/* Card Name (pre-filled, readonly) */}
          <div className="space-y-2">
            <Label>Card Name</Label>
            <Input value={displayCardName} disabled className="bg-muted" />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Your Price ($)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Enter your price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          {/* Condition */}
          <div className="space-y-2">
            <Label>Condition</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mint">Mint</SelectItem>
                <SelectItem value="near_mint">Near Mint</SelectItem>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="played">Played</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description (optional) */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add any details about your card..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={loading || !imageFile || !price}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Listing...
              </>
            ) : (
              'List Card'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
