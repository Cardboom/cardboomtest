import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, DollarSign, Package, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface BuyOrder {
  id: string;
  buyer_id: string;
  item_name: string;
  category: string;
  condition: string | null;
  grade: string | null;
  max_price: number;
  quantity: number;
  filled_quantity: number;
}

interface AcceptBuyOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: BuyOrder;
  onSuccess?: () => void;
}

export const AcceptBuyOrderDialog = ({
  open,
  onOpenChange,
  order,
  onSuccess,
}: AcceptBuyOrderDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string>('');

  // Fetch seller's matching listings
  const { data: matchingListings } = useQuery({
    queryKey: ['matching-listings', order.id],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const { data, error } = await supabase
        .from('listings')
        .select('id, title, price, condition, image_url')
        .eq('seller_id', session.user.id)
        .eq('status', 'active')
        .eq('category', order.category)
        .lte('price', order.max_price)
        .ilike('title', `%${order.item_name.split(' ')[0]}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString()}`;
  };

  const handleAccept = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Please sign in to accept this order');
      return;
    }

    if (!selectedListingId) {
      toast.error('Please select a listing to sell');
      return;
    }

    setIsLoading(true);

    try {
      // Create the fill record
      const { error: fillError } = await supabase.from('buy_order_fills').insert({
        buy_order_id: order.id,
        seller_id: session.user.id,
        listing_id: selectedListingId,
        fill_price: order.max_price,
        quantity: 1,
      });

      if (fillError) throw fillError;

      // Update the buy order
      const newFilledQty = order.filled_quantity + 1;
      const newStatus = newFilledQty >= order.quantity ? 'filled' : 'partially_filled';

      const { error: updateError } = await supabase
        .from('buy_orders')
        .update({
          filled_quantity: newFilledQty,
          status: newStatus,
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      toast.success('Order accepted! The buyer will be notified.');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('Failed to accept order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Accept Buy Order
          </DialogTitle>
          <DialogDescription>
            Sell instantly to {order.item_name} for {formatPrice(order.max_price)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{order.item_name}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline">{order.category}</Badge>
                    {order.grade && <Badge variant="secondary">{order.grade}</Badge>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-500">
                    {formatPrice(order.max_price)}
                  </p>
                  <p className="text-xs text-muted-foreground">Instant payment</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Select Listing */}
          <div className="space-y-3">
            <Label>Select Your Listing to Sell</Label>
            
            {matchingListings && matchingListings.length > 0 ? (
              <RadioGroup
                value={selectedListingId}
                onValueChange={setSelectedListingId}
                className="space-y-2"
              >
                {matchingListings.map((listing: any) => (
                  <div
                    key={listing.id}
                    className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedListingId === listing.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/50'
                    }`}
                    onClick={() => setSelectedListingId(listing.id)}
                  >
                    <RadioGroupItem value={listing.id} id={listing.id} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{listing.title}</p>
                      {listing.condition && (
                        <span className="text-xs text-muted-foreground">
                          {listing.condition}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPrice(listing.price)}</p>
                      {listing.price < order.max_price && (
                        <p className="text-xs text-green-500">
                          +{formatPrice(order.max_price - listing.price)} profit
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    No matching listings found. Create a listing first.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Fee info */}
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Funds are held in escrow until you ship the item
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isLoading || !selectedListingId}
              className="gap-2"
            >
              <Zap className="w-4 h-4" />
              {isLoading ? 'Processing...' : 'Accept & Sell'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
