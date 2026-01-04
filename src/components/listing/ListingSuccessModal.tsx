import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Eye, Share2, Plus, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface ListingSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: {
    id: string;
    title: string;
    price: number;
    imageUrl?: string | null;
    category: string;
  } | null;
  onListAnother: () => void;
}

export const ListingSuccessModal = ({
  open,
  onOpenChange,
  listing,
  onListAnother,
}: ListingSuccessModalProps) => {
  const navigate = useNavigate();

  if (!listing) return null;

  const handleViewListing = () => {
    onOpenChange(false);
    navigate(`/listing/${listing.id}`);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/listing/${listing.id}`;
    const text = `Check out "${listing.title}" on CardBoom!`;

    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, text, url });
      } catch (e) {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleListAnother = () => {
    onOpenChange(false);
    onListAnother();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="mx-auto mb-4 w-16 h-16 rounded-full bg-gain/20 flex items-center justify-center"
          >
            <CheckCircle className="w-8 h-8 text-gain" />
          </motion.div>
          <DialogTitle className="text-xl">Listing Created!</DialogTitle>
          <DialogDescription>
            Your card is now live on the marketplace
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Listing Preview */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border">
            {listing.imageUrl ? (
              <img
                src={listing.imageUrl}
                alt={listing.title}
                className="w-16 h-20 object-cover rounded-md"
              />
            ) : (
              <div className="w-16 h-20 bg-muted rounded-md flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {listing.title}
              </h3>
              <Badge variant="outline" className="mt-1 text-xs">
                {listing.category.toUpperCase()}
              </Badge>
              <p className="text-lg font-bold text-primary mt-1">
                ${listing.price.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Stats Teaser */}
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground text-center">
              <Sparkles className="w-4 h-4 inline mr-1 text-primary" />
              Your listing is now visible to <span className="font-semibold text-foreground">thousands</span> of collectors
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <Button onClick={handleViewListing} className="w-full gap-2">
            <Eye className="w-4 h-4" />
            View Listing
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleShare} className="gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button variant="outline" onClick={handleListAnother} className="gap-2">
              <Plus className="w-4 h-4" />
              List Another
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
