import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tag, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface SellSharesDialogProps {
  holding: {
    id: string;
    shares_owned: number;
    fractional_listing_id: string;
    purchase_price_per_share: number;
    fractional_listing?: {
      share_price: number;
      listing?: { title: string } | null;
      market_item?: { name: string } | null;
    };
  };
}

export function SellSharesDialog({ holding }: SellSharesDialogProps) {
  const [open, setOpen] = useState(false);
  const [sharesToSell, setSharesToSell] = useState(1);
  const [pricePerShare, setPricePerShare] = useState(
    holding.fractional_listing?.share_price || holding.purchase_price_per_share
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();

  const itemName = holding.fractional_listing?.listing?.title || 
    holding.fractional_listing?.market_item?.name || 'Item';
  const maxShares = holding.shares_owned;
  const totalValue = sharesToSell * pricePerShare;
  const fee = totalValue * 0.05; // 5% platform fee
  const netProceeds = totalValue - fee;

  const handleSubmit = async () => {
    if (sharesToSell <= 0 || sharesToSell > maxShares) {
      toast.error('Invalid number of shares');
      return;
    }

    if (pricePerShare <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to list shares');
        return;
      }

      // Check if user has enough shares
      const { data: ownership, error: ownershipError } = await supabase
        .from('fractional_ownership')
        .select('shares_owned')
        .eq('id', holding.id)
        .single();

      if (ownershipError || !ownership) {
        toast.error('Could not verify share ownership');
        return;
      }

      // Check existing listings for this ownership
      const { data: existingListings } = await supabase
        .from('fractional_share_listings')
        .select('shares_for_sale')
        .eq('fractional_listing_id', holding.fractional_listing_id)
        .eq('seller_id', user.id)
        .eq('status', 'active');

      const totalListed = existingListings?.reduce((sum, l) => sum + l.shares_for_sale, 0) || 0;
      const availableToList = ownership.shares_owned - totalListed;

      if (sharesToSell > availableToList) {
        toast.error(`You can only list ${availableToList} more shares`);
        return;
      }

      // Create the listing
      const { error } = await supabase
        .from('fractional_share_listings')
        .insert({
          fractional_listing_id: holding.fractional_listing_id,
          seller_id: user.id,
          shares_for_sale: sharesToSell,
          price_per_share: pricePerShare,
          status: 'active',
        });

      if (error) throw error;

      toast.success('Shares listed for sale!');
      queryClient.invalidateQueries({ queryKey: ['my-fractional-holdings'] });
      queryClient.invalidateQueries({ queryKey: ['secondary-market'] });
      queryClient.invalidateQueries({ queryKey: ['my-share-listings'] });
      setOpen(false);
    } catch (error: any) {
      console.error('Error listing shares:', error);
      toast.error(error.message || 'Failed to list shares');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" size="sm">
          <Tag className="h-4 w-4 mr-2" />
          List for Sale
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sell Your Shares</DialogTitle>
          <DialogDescription>
            List shares of {itemName} for sale on the secondary market.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Shares to sell */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Shares to Sell</Label>
              <span className="text-sm text-muted-foreground">
                {sharesToSell} of {maxShares}
              </span>
            </div>
            <Slider
              value={[sharesToSell]}
              onValueChange={([value]) => setSharesToSell(value)}
              min={1}
              max={maxShares}
              step={1}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSharesToSell(1)}
              >
                Min
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSharesToSell(Math.floor(maxShares / 2))}
              >
                Half
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSharesToSell(maxShares)}
              >
                Max
              </Button>
            </div>
          </div>

          {/* Price per share */}
          <div className="space-y-2">
            <Label htmlFor="price">Price per Share (₺)</Label>
            <Input
              id="price"
              type="number"
              min={0.01}
              step={0.01}
              value={pricePerShare}
              onChange={(e) => setPricePerShare(parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Current market price: {formatPrice(holding.fractional_listing?.share_price || 0)}
            </p>
          </div>

          {/* Summary */}
          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Sale Value</span>
              <span className="font-medium">{formatPrice(totalValue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform Fee (5%)</span>
              <span className="text-loss">-{formatPrice(fee)}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-medium">You'll Receive</span>
                <span className="font-bold text-gain">{formatPrice(netProceeds)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            List {sharesToSell} Shares
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
