import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCurrency, Currency } from '@/contexts/CurrencyContext';
import { formatDistanceToNow } from 'date-fns';
import { DollarSign, User, Clock, Check, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Offer {
  id: string;
  amount: number;
  currency: Currency;
  amount_usd: number | null;
  message: string | null;
  status: string;
  created_at: string;
  buyer_id: string;
  buyer?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface ListingOffersPanelProps {
  listingId: string;
  sellerId: string;
  isOwner: boolean;
}

export const ListingOffersPanel = ({ listingId, sellerId, isOwner }: ListingOffersPanelProps) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatPrice, formatPriceInCurrency, convertToUSD } = useCurrency();

  const getCurrencySymbol = (cur: Currency) => {
    if (cur === 'TRY') return '₺';
    if (cur === 'EUR') return '€';
    return '$';
  };

  useEffect(() => {
    fetchOffers();
  }, [listingId]);

  const fetchOffers = async () => {
    try {
      // Fetch offers - include pending and rejected
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('id, amount, currency, amount_usd, message, status, created_at, buyer_id')
        .eq('listing_id', listingId)
        .in('status', ['pending', 'rejected'])
        .order('created_at', { ascending: false });

      if (offersError) throw offersError;

      // Fetch buyer profiles separately
      if (offersData && offersData.length > 0) {
        const buyerIds = [...new Set(offersData.map(o => o.buyer_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', buyerIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const offersWithBuyers = offersData.map(offer => ({
          ...offer,
          currency: (offer.currency || 'USD') as Currency,
          buyer: profileMap.get(offer.buyer_id) || null
        }));

        setOffers(offersWithBuyers as Offer[]);
      } else {
        setOffers([]);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    try {
      // Get the offer details first
      const offer = offers.find(o => o.id === offerId);
      if (!offer) throw new Error('Offer not found');

      const { error } = await supabase
        .from('offers')
        .update({ status: 'accepted' })
        .eq('id', offerId);

      if (error) throw error;

      // Send notification to buyer (on-site, email, SMS)
      try {
        const { formattedAmount } = getOfferDisplayInfo(offer);
        
        await supabase.functions.invoke('send-notification', {
          body: {
            user_id: offer.buyer_id,
            type: 'offer_accepted',
            title: '🎉 Your Offer Was Accepted!',
            body: `Great news! Your offer of ${formattedAmount} has been accepted. Complete your purchase now.`,
            data: { 
              listing_id: listingId, 
              offer_id: offerId,
              offer_amount: offer.amount,
              currency: offer.currency 
            },
          },
        });
      } catch (notifError) {
        console.error('Failed to send offer accepted notification:', notifError);
      }

      toast.success('Offer accepted! The buyer will be notified.');
      fetchOffers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept offer');
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ status: 'rejected' })
        .eq('id', offerId);

      if (error) throw error;
      toast.success('Offer rejected');
      fetchOffers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject offer');
    }
  };

  const getOfferDisplayInfo = (offer: Offer) => {
    const symbol = getCurrencySymbol(offer.currency);
    const formattedAmount = `${symbol}${offer.amount.toLocaleString()}`;
    
    // Calculate USD equivalent for non-USD offers
    let usdEquivalent: number | null = null;
    if (offer.currency !== 'USD') {
      usdEquivalent = offer.amount_usd ?? convertToUSD(offer.amount, offer.currency);
    }

    return { formattedAmount, usdEquivalent };
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-secondary/50 rounded-lg" />
        ))}
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No offers yet</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Offers ({offers.length})
          </h3>
        </div>

        <div className="space-y-2">
          {offers.map((offer) => {
            const { formattedAmount, usdEquivalent } = getOfferDisplayInfo(offer);
            
            return (
              <div
                key={offer.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  offer.status === 'rejected' 
                    ? "bg-loss/5 border-loss/20 opacity-60" 
                    : "bg-secondary/30 border-border/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={offer.buyer?.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-bold",
                        offer.status === 'rejected' ? "text-muted-foreground line-through" : "text-primary"
                      )}>
                        {formattedAmount}
                      </span>
                      {offer.currency !== 'USD' && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {offer.currency}
                        </span>
                      )}
                      {usdEquivalent !== null && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5 cursor-help">
                              <Info className="w-3 h-3" />
                              ≈ ${usdEquivalent.toFixed(2)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>USD equivalent at current exchange rate</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {offer.status === 'rejected' && (
                        <span className="text-xs bg-loss/20 text-loss px-1.5 py-0.5 rounded font-medium">
                          Rejected
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">{offer.buyer?.display_name || 'Anonymous'}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>

                {isOwner && offer.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-gain border-gain/30 hover:bg-gain/10"
                      onClick={() => handleAcceptOffer(offer.id)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-loss border-loss/30 hover:bg-loss/10"
                      onClick={() => handleRejectOffer(offer.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};
