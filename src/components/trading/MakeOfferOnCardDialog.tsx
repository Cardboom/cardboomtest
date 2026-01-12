import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, MessageSquare, Clock, Loader2, TrendingDown, TrendingUp, Info } from 'lucide-react';
import { useCurrency, Currency } from '@/contexts/CurrencyContext';

interface Listing {
  id: string;
  title: string;
  price: number;
  seller_id: string;
  image_url?: string;
}

interface MakeOfferOnCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Listing;
  marketPrice?: number;
}

export const MakeOfferOnCardDialog = ({
  open,
  onOpenChange,
  listing,
  marketPrice,
}: MakeOfferOnCardDialogProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerCurrency, setOfferCurrency] = useState<Currency>('USD');
  const [message, setMessage] = useState('');
  const { convertToUSD, exchangeRates, formatPriceInCurrency } = useCurrency();

  const getCurrencySymbol = (cur: Currency) => {
    if (cur === 'TRY') return '₺';
    if (cur === 'EUR') return '€';
    return '$';
  };

  const offerPriceNum = parseFloat(offerPrice) || 0;
  
  // Convert to USD for comparison
  const offerInUSD = offerCurrency !== 'USD' 
    ? convertToUSD(offerPriceNum, offerCurrency) 
    : offerPriceNum;
  
  const discount = listing.price > 0 ? ((listing.price - offerInUSD) / listing.price * 100) : 0;
  const isLowball = discount > 30;

  const handleSubmit = async () => {
    if (!offerPriceNum || offerPriceNum <= 0) {
      toast.error('Please enter a valid offer amount');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to make an offer');
        navigate('/auth');
        return;
      }

      if (session.user.id === listing.seller_id) {
        toast.error('You cannot make an offer on your own listing');
        return;
      }

      // Check wallet balance - we check against USD equivalent
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', session.user.id)
        .single();

      const balance = wallet?.balance || 0;
      if (balance < offerInUSD) {
        toast.error(`Insufficient balance. You have $${balance.toFixed(2)} USD`);
        return;
      }

      // Calculate USD equivalent for non-USD offers
      const amountUsd = offerCurrency !== 'USD' ? offerInUSD : null;

      // Create offer
      const { error } = await supabase.from('offers').insert({
        listing_id: listing.id,
        buyer_id: session.user.id,
        seller_id: listing.seller_id,
        amount: offerPriceNum,
        currency: offerCurrency,
        amount_usd: amountUsd,
        message: message.trim() || null,
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiry
      });

      if (error) throw error;

      // Send notification to seller
      const displayAmount = `${getCurrencySymbol(offerCurrency)}${offerPriceNum.toFixed(2)}`;
      await supabase.functions.invoke('send-notification', {
        body: {
          user_id: listing.seller_id,
          type: 'new_offer',
          title: '💰 New Offer Received!',
          body: `Someone offered ${displayAmount}${offerCurrency !== 'USD' ? ` (≈$${offerInUSD.toFixed(2)})` : ''} for "${listing.title}"`,
          data: { listing_id: listing.id, offer_amount: offerPriceNum, currency: offerCurrency },
        },
      });

      toast.success('Offer sent! The seller will be notified.');
      onOpenChange(false);
      setOfferPrice('');
      setOfferCurrency('USD');
      setMessage('');
    } catch (error) {
      console.error('Error making offer:', error);
      toast.error('Failed to send offer');
    } finally {
      setLoading(false);
    }
  };

  const quickOffers = [
    { label: '5% off', value: listing.price * 0.95 },
    { label: '10% off', value: listing.price * 0.90 },
    { label: '15% off', value: listing.price * 0.85 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Make an Offer
          </DialogTitle>
          <DialogDescription>
            Send a price offer to the seller. They have 24 hours to respond.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Listing Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {listing.image_url && (
              <img
                src={listing.image_url}
                alt={listing.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{listing.title}</p>
              <p className="text-lg font-bold text-primary">
                {formatPriceInCurrency(listing.price, 'USD')}
              </p>
            </div>
          </div>

          {/* Quick Offer Buttons */}
          <div className="space-y-2">
            <Label>Quick Offers (USD)</Label>
            <div className="flex gap-2">
              {quickOffers.map((offer) => (
                <Button
                  key={offer.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOfferPrice(offer.value.toFixed(2));
                    setOfferCurrency('USD');
                  }}
                  className="flex-1"
                >
                  {offer.label}
                  <span className="text-xs ml-1 text-muted-foreground">
                    ${offer.value.toFixed(0)}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Offer */}
          <div className="space-y-2">
            <Label htmlFor="offerPrice">Your Offer *</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {getCurrencySymbol(offerCurrency)}
                </span>
                <Input
                  id="offerPrice"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  placeholder="0.00"
                  className="pl-8 text-lg"
                />
              </div>
              <Select value={offerCurrency} onValueChange={(v) => setOfferCurrency(v as Currency)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="TRY">TRY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* USD equivalent for non-USD offers */}
            {offerPriceNum > 0 && offerCurrency !== 'USD' && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="w-3 h-3" />
                ≈ ${offerInUSD.toFixed(2)} USD
                {exchangeRates && (
                  <span className="text-[10px]">
                    (1 {offerCurrency} = ${offerCurrency === 'EUR' ? exchangeRates.EUR_USD.toFixed(4) : exchangeRates.TRY_USD.toFixed(4)})
                  </span>
                )}
              </div>
            )}
            
            {offerPriceNum > 0 && (
              <div className="flex items-center gap-2">
                {discount > 0 ? (
                  <Badge variant={isLowball ? 'destructive' : 'outline'} className="gap-1">
                    <TrendingDown className="h-3 w-3" />
                    {discount.toFixed(0)}% below asking
                  </Badge>
                ) : discount < 0 ? (
                  <Badge variant="secondary" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {Math.abs(discount).toFixed(0)}% above asking
                  </Badge>
                ) : null}
                {isLowball && (
                  <span className="text-xs text-destructive">Low offers are often rejected</span>
                )}
              </div>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note to the seller..."
              rows={2}
            />
          </div>

          {/* Expiry Notice */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Offer expires in 24 hours if not accepted
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !offerPriceNum}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>Send Offer</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
