import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, MessageSquare, CreditCard, Wallet, 
  Truck, Clock, BadgeCheck, Star, Minus, Plus,
  Shield, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Listing {
  id: string;
  condition: string;
  price: number;
  sellerId: string;
  sellerName: string;
  sellerRating: number;
  sellerVerified: boolean;
  totalSales: number;
  estimatedDelivery: string;
}

interface BuyBoxProps {
  listings: Listing[];
  selectedListingId?: string;
  onSelectListing: (id: string) => void;
  onBuyNow: () => void;
  onMakeOffer: () => void;
  buyerFeePercent?: number;
  userBalance?: number;
  isLoading?: boolean;
}

export const BuyBox = ({
  listings,
  selectedListingId,
  onSelectListing,
  onBuyNow,
  onMakeOffer,
  buyerFeePercent = 4,
  userBalance = 0,
  isLoading,
}: BuyBoxProps) => {
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'card'>('balance');

  const selectedListing = listings.find(l => l.id === selectedListingId) || listings[0];
  
  if (!selectedListing) return null;

  const subtotal = selectedListing.price * quantity;
  const buyerFee = subtotal * (buyerFeePercent / 100);
  const total = subtotal + buyerFee;

  const hasEnoughBalance = userBalance >= total;

  const formatPrice = (price: number) => `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent sticky top-4">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          Buy This Card
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Condition Selector */}
        {listings.length > 1 && (
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Condition</label>
            <Select value={selectedListingId} onValueChange={onSelectListing}>
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {listings.map((listing) => (
                  <SelectItem key={listing.id} value={listing.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{listing.condition}</span>
                      <span className="font-semibold">{formatPrice(listing.price)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Quantity Selector */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Quantity</label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 text-center"
              min={1}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Seller Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Seller</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{selectedListing.sellerName}</span>
              {selectedListing.sellerVerified && (
                <BadgeCheck className="w-4 h-4 text-primary" />
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Rating</span>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-medium text-sm">{selectedListing.sellerRating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({selectedListing.totalSales} sales)</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Est. Delivery</span>
            <div className="flex items-center gap-1">
              <Truck className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">{selectedListing.estimatedDelivery}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Price Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              Buyer Fee ({buyerFeePercent}%)
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">This fee covers payment processing and buyer protection</p>
                </TooltipContent>
              </Tooltip>
            </span>
            <span>{formatPrice(buyerFee)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <span className="text-lg text-primary">{formatPrice(total)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={paymentMethod === 'balance' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPaymentMethod('balance')}
            className="gap-2 h-10"
          >
            <Wallet className="w-4 h-4" />
            Balance
          </Button>
          <Button
            variant={paymentMethod === 'card' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPaymentMethod('card')}
            className="gap-2 h-10"
          >
            <CreditCard className="w-4 h-4" />
            Card
          </Button>
        </div>

        {paymentMethod === 'balance' && !hasEnoughBalance && (
          <p className="text-xs text-loss flex items-center gap-1">
            <Info className="w-3 h-3" />
            Insufficient balance. Current: {formatPrice(userBalance)}
          </p>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button 
            onClick={onBuyNow} 
            className="w-full h-12 text-base font-semibold gap-2"
            disabled={isLoading || (paymentMethod === 'balance' && !hasEnoughBalance)}
          >
            <ShoppingCart className="w-5 h-5" />
            Buy Now
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onMakeOffer}
            className="w-full h-10 gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Make Offer
          </Button>
        </div>

        {/* Trust Message */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gain/10 border border-gain/20">
          <Shield className="w-5 h-5 text-gain flex-shrink-0" />
          <p className="text-xs text-gain">
            Your payment is protected by escrow until you receive and verify your card
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
