import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, Upload, X, Loader2, DollarSign, Image as ImageIcon, Pencil } from 'lucide-react';

interface EditListingDialogProps {
  listing: {
    id: string;
    title: string;
    description: string | null;
    price: number;
    image_url: string | null;
    grading_order_id?: string | null;
    cbgi_score?: number | null;
  };
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export const EditListingDialog = ({
  listing,
  onSuccess,
  trigger,
}: EditListingDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(listing.price.toString());
  const [description, setDescription] = useState(listing.description || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);

  const hasGrading = !!listing.grading_order_id || !!listing.cbgi_score;

  useEffect(() => {
    if (open) {
      setPrice(listing.price.toString());
      setDescription(listing.description || '');
      setImageFile(null);
      setImagePreview(null);
      setImageChanged(false);
    }
  }, [open, listing]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setImageChanged(true);
    }
  };

  const removeNewImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageChanged(false);
  };

  const handleSave = async () => {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setLoading(true);
    try {
      let newImageUrl = listing.image_url;

      // Upload new image if changed
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const filePath = `${listing.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('listing-images')
          .getPublicUrl(filePath);

        newImageUrl = publicUrl;
      }

      // Build update object
      const updates: Record<string, any> = {
        price: priceNum,
        description: description || null,
      };

      if (imageChanged) {
        updates.image_url = newImageUrl;
        
        // If grading exists and image changed, archive grading but keep record
        if (hasGrading) {
          // Store old grading in grading_passport_history (for future reference)
          // Clear current grading from listing
          updates.cbgi_score = null;
          updates.cbgi_grade_label = null;
          updates.certification_status = null;
          // Keep grading_order_id for historical reference but mark as invalidated
          // The grading result itself remains in grading_orders table as a passport record
        }
      }

      const { error } = await supabase
        .from('listings')
        .update(updates)
        .eq('id', listing.id);

      if (error) throw error;

      if (imageChanged && hasGrading) {
        toast.success('Listing updated. Previous grading archived to your Passport Index.');
      } else {
        toast.success('Listing updated successfully');
      }

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating listing:', error);
      toast.error('Failed to update listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Pencil className="w-4 h-4" />
            Edit Listing
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">

        <div className="space-y-4 py-4">
          {/* Title (read-only) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Item</Label>
            <p className="font-medium">{listing.title}</p>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Price (USD)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-9"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about condition, edition, etc."
              rows={3}
            />
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label>Image</Label>
            <div className="flex gap-3">
              {/* Current/Preview Image */}
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border bg-muted">
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="New" className="w-full h-full object-cover" />
                    <button
                      onClick={removeNewImage}
                      className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <Badge className="absolute bottom-1 left-1 text-[10px]">New</Badge>
                  </>
                ) : listing.image_url ? (
                  <img src={listing.image_url} alt="Current" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors p-4">
                <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-sm text-muted-foreground">Change Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Grading Warning */}
          {hasGrading && imageChanged && (
            <Alert variant="destructive" className="border-warning bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning">
                Changing the image will invalidate the current grading. The grade will be archived
                to your Passport Index for historical reference, but this listing will show as ungraded.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
