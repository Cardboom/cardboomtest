import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Gavel, Loader2 } from 'lucide-react';

interface PlaceBidDialogProps {
  itemId?: string;
  itemName: string;
  category: string;
  currentPrice?: number;
  user: any;
}

// Grading is not applicable to auction bids - items already have their grades set by sellers

export const PlaceBidDialog = ({ 
  itemId, 
  itemName, 
  category, 
  currentPrice = 0,
  user 
}: PlaceBidDialogProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bidAmount, setBidAmount] = useState(currentPrice > 0 ? Math.floor(currentPrice * 0.9).toString() : '');
  const [maxBid, setMaxBid] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to place a bid');
      navigate('/auth');
      return;
    }

    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      toast.error('Please enter a valid bid amount');
      return;
    }

    // Max 8 digits = $99,999,999.99
    const MAX_BID_USD = 99999999.99;
    const bidValue = parseFloat(bidAmount);
    if (bidValue > MAX_BID_USD) {
      toast.error('Maximum bid is $99,999,999.99 USD');
      return;
    }
    if (maxBid && parseFloat(maxBid) > MAX_BID_USD) {
      toast.error('Maximum auto-bid is $99,999,999.99 USD');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('bids').insert({
        user_id: user.id,
        market_item_id: itemId || null,
        item_name: itemName,
        category: category,
        bid_amount: parseFloat(bidAmount),
        max_bid: maxBid ? parseFloat(maxBid) : null,
        notes: notes || null,
      });

      if (error) throw error;

      toast.success('Bid placed successfully! Sellers will be notified.');
      setOpen(false);
      setBidAmount('');
      setMaxBid('');
      setNotes('');
    } catch (error) {
      console.error('Error placing bid:', error);
      toast.error('Failed to place bid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Gavel className="w-4 h-4" />
          Place Bid
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-primary" />
            Place a Bid
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Bidding on</p>
            <p className="font-semibold text-foreground">{itemName}</p>
            {currentPrice > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Current market price: ${currentPrice.toLocaleString()}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bidAmount">Your Bid ($)</Label>
            <Input
              id="bidAmount"
              type="number"
              step="0.01"
              min="0"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="Enter your bid amount"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxBid">Max Bid (Optional)</Label>
            <Input
              id="maxBid"
              type="number"
              step="0.01"
              min="0"
              value={maxBid}
              onChange={(e) => setMaxBid(e.target.value)}
              placeholder="Auto-bid up to this amount"
            />
            <p className="text-xs text-muted-foreground">
              We'll automatically increase your bid up to this amount
            </p>
          </div>


          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific requirements..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Place Bid'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
