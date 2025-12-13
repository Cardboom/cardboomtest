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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Gavel, Loader2 } from 'lucide-react';

interface PlaceBidDialogProps {
  itemId?: string;
  itemName: string;
  category: string;
  currentPrice?: number;
  user: any;
}

const GRADES = [
  { value: 'any', label: 'Any Grade' },
  { value: 'raw', label: 'Raw / Ungraded' },
  { value: 'psa10', label: 'PSA 10' },
  { value: 'psa9', label: 'PSA 9' },
  { value: 'psa8', label: 'PSA 8' },
  { value: 'bgs10', label: 'BGS 10' },
  { value: 'bgs9_5', label: 'BGS 9.5' },
  { value: 'cgc10', label: 'CGC 10' },
];

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
  const [grade, setGrade] = useState('any');
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

    setLoading(true);

    try {
      const { error } = await supabase.from('bids').insert({
        user_id: user.id,
        market_item_id: itemId || null,
        item_name: itemName,
        category: category,
        bid_amount: parseFloat(bidAmount),
        max_bid: maxBid ? parseFloat(maxBid) : null,
        grade,
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
            <Label>Preferred Grade</Label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {GRADES.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
