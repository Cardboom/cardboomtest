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
import { DollarSign, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MakeOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingPrice: number;
  sellerName: string;
  sellerId?: string;
  onOfferSent?: () => void;
}

export const MakeOfferDialog = ({
  open,
  onOpenChange,
  listingId,
  listingPrice,
  sellerName,
  sellerId,
  onOfferSent,
}: MakeOfferDialogProps) => {
  const [offerAmount, setOfferAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  const handleSubmit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Please sign in to make an offer');
      return;
    }

    const amount = parseFloat(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid offer amount');
      return;
    }

    setIsLoading(true);

    try {
      // Get seller ID from listing if not provided
      let actualSellerId = sellerId;
      if (!actualSellerId) {
        const { data: listing } = await supabase
          .from('listings')
          .select('seller_id')
          .eq('id', listingId)
          .maybeSingle();
        actualSellerId = listing?.seller_id;
      }

      if (!actualSellerId) {
        throw new Error('Could not find seller');
      }

      // Insert offer into database
      const { error } = await supabase
        .from('offers')
        .insert({
          listing_id: listingId,
          buyer_id: session.user.id,
          seller_id: actualSellerId,
          amount: amount,
          message: message || null,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });

      if (error) throw error;

      toast.success(`Offer of ${formatPrice(amount)} sent to ${sellerName}`);
      setOfferAmount('');
      setMessage('');
      onOpenChange(false);
      onOfferSent?.();
    } catch (error: any) {
      console.error('Error making offer:', error);
      toast.error(error.message || 'Failed to submit offer');
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedOffers = [
    Math.round(listingPrice * 0.85),
    Math.round(listingPrice * 0.90),
    Math.round(listingPrice * 0.95),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Make an Offer
          </DialogTitle>
          <DialogDescription>
            Listed at {formatPrice(listingPrice)} by {sellerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Your Offer</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                placeholder="0.00"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestedOffers.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setOfferAmount(amount.toString())}
                className="text-xs"
              >
                {formatPrice(amount)} ({Math.round((amount / listingPrice) * 100)}%)
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Message (optional)</Label>
            <Textarea
              placeholder="Add a message to your offer..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
              <Send className="w-4 h-4" />
              {isLoading ? 'Submitting...' : 'Submit Offer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
