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
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ShareListing {
  id: string;
  fractional_listing_id: string;
  seller_id: string;
  shares_for_sale: number;
  price_per_share: number;
  fractional_listing?: {
    listing?: { title: string; image_url: string | null } | null;
    market_item?: { name: string; image_url: string | null } | null;
  };
}

interface BuyShareListingDialogProps {
  listing: ShareListing;
  trigger?: React.ReactNode;
}

export function BuyShareListingDialog({ listing, trigger }: BuyShareListingDialogProps) {
  const [open, setOpen] = useState(false);
  const [sharesToBuy, setSharesToBuy] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const itemName = listing.fractional_listing?.listing?.title || 
    listing.fractional_listing?.market_item?.name || 'Item';
  const maxShares = listing.shares_for_sale;
  const totalCost = sharesToBuy * listing.price_per_share;
  const fee = totalCost * 0.025; // 2.5% buyer fee
  const totalWithFee = totalCost + fee;

  // Fetch user's wallet balance
  const { data: wallet } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .single();

      return data;
    },
  });

  const hasInsufficientBalance = wallet && wallet.balance < totalWithFee;

  const handlePurchase = async () => {
    if (sharesToBuy <= 0 || sharesToBuy > maxShares) {
      toast.error('Invalid number of shares');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to purchase');
        navigate('/auth');
        return;
      }

      if (user.id === listing.seller_id) {
        toast.error("You can't buy your own listing");
        return;
      }

      // Check wallet balance
      if (!wallet || wallet.balance < totalWithFee) {
        toast.error('Insufficient wallet balance');
        navigate('/wallet');
        return;
      }

      // Start transaction - deduct from buyer's wallet
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: wallet.balance - totalWithFee })
        .eq('id', wallet.id);

      if (walletError) throw walletError;

      // Record buyer transaction
      await supabase.from('transactions').insert({
        wallet_id: wallet.id,
        type: 'purchase',
        amount: -totalCost,
        fee: fee,
        description: `Purchased ${sharesToBuy} shares of ${itemName}`,
      });

      // Update or create buyer's ownership
      const { data: existingOwnership } = await supabase
        .from('fractional_ownership')
        .select('*')
        .eq('fractional_listing_id', listing.fractional_listing_id)
        .eq('user_id', user.id)
        .single();

      if (existingOwnership) {
        await supabase
          .from('fractional_ownership')
          .update({
            shares_owned: existingOwnership.shares_owned + sharesToBuy,
            total_invested: existingOwnership.total_invested + totalCost,
          })
          .eq('id', existingOwnership.id);
      } else {
        await supabase.from('fractional_ownership').insert({
          fractional_listing_id: listing.fractional_listing_id,
          user_id: user.id,
          shares_owned: sharesToBuy,
          purchase_price_per_share: listing.price_per_share,
          total_invested: totalCost,
        });
      }

      // Deduct from seller's ownership
      const { data: sellerOwnership } = await supabase
        .from('fractional_ownership')
        .select('*')
        .eq('fractional_listing_id', listing.fractional_listing_id)
        .eq('user_id', listing.seller_id)
        .single();

      if (sellerOwnership) {
        const newShares = sellerOwnership.shares_owned - sharesToBuy;
        if (newShares > 0) {
          await supabase
            .from('fractional_ownership')
            .update({ shares_owned: newShares })
            .eq('id', sellerOwnership.id);
        } else {
          await supabase
            .from('fractional_ownership')
            .delete()
            .eq('id', sellerOwnership.id);
        }
      }

      // Credit seller's wallet
      const { data: sellerWallet } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', listing.seller_id)
        .single();

      if (sellerWallet) {
        const sellerFee = totalCost * 0.05; // 5% seller fee
        const sellerProceeds = totalCost - sellerFee;

        await supabase
          .from('wallets')
          .update({ balance: sellerWallet.balance + sellerProceeds })
          .eq('id', sellerWallet.id);

        await supabase.from('transactions').insert({
          wallet_id: sellerWallet.id,
          type: 'sale',
          amount: sellerProceeds,
          fee: sellerFee,
          description: `Sold ${sharesToBuy} shares of ${itemName}`,
        });
      }

      // Update or remove the listing
      if (sharesToBuy >= listing.shares_for_sale) {
        await supabase
          .from('fractional_share_listings')
          .update({ status: 'sold' })
          .eq('id', listing.id);
      } else {
        await supabase
          .from('fractional_share_listings')
          .update({ shares_for_sale: listing.shares_for_sale - sharesToBuy })
          .eq('id', listing.id);
      }

      toast.success(`Successfully purchased ${sharesToBuy} shares!`);
      queryClient.invalidateQueries({ queryKey: ['my-fractional-holdings'] });
      queryClient.invalidateQueries({ queryKey: ['secondary-market'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      setOpen(false);
    } catch (error: any) {
      console.error('Error purchasing shares:', error);
      toast.error(error.message || 'Failed to purchase shares');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="w-full">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Buy Shares
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Buy Shares</DialogTitle>
          <DialogDescription>
            Purchase shares of {itemName} from another owner.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {hasInsufficientBalance && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Insufficient balance. You need {formatPrice(totalWithFee)} but have {formatPrice(wallet?.balance || 0)}.
              </AlertDescription>
            </Alert>
          )}

          {/* Shares to buy */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Shares to Buy</Label>
              <span className="text-sm text-muted-foreground">
                {sharesToBuy} of {maxShares} available
              </span>
            </div>
            <Slider
              value={[sharesToBuy]}
              onValueChange={([value]) => setSharesToBuy(value)}
              min={1}
              max={maxShares}
              step={1}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSharesToBuy(1)}
              >
                Min
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSharesToBuy(Math.floor(maxShares / 2))}
              >
                Half
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSharesToBuy(maxShares)}
              >
                All
              </Button>
            </div>
          </div>

          {/* Price info */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Price per Share</p>
            <p className="text-xl font-bold">{formatPrice(listing.price_per_share)}</p>
          </div>

          {/* Summary */}
          <div className="space-y-2 p-4 rounded-lg border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal ({sharesToBuy} shares)</span>
              <span className="font-medium">{formatPrice(totalCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Buyer Fee (2.5%)</span>
              <span>{formatPrice(fee)}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-medium">Total</span>
                <span className="font-bold text-primary">{formatPrice(totalWithFee)}</span>
              </div>
            </div>
            {wallet && (
              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                <span>Wallet Balance</span>
                <span>{formatPrice(wallet.balance)}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handlePurchase} 
            disabled={isSubmitting || hasInsufficientBalance}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Buy {sharesToBuy} Shares
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
