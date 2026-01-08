import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatDistanceToNow } from 'date-fns';
import { DollarSign, User, Clock, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Offer {
  id: string;
  amount: number;
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
  const { formatPrice } = useCurrency();

  useEffect(() => {
    fetchOffers();
  }, [listingId]);

  const fetchOffers = async () => {
    try {
      // Fetch offers
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('id, amount, message, status, created_at, buyer_id')
        .eq('listing_id', listingId)
        .eq('status', 'pending')
        .order('amount', { ascending: false });

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
      const { error } = await supabase
        .from('offers')
        .update({ status: 'accepted' })
        .eq('id', offerId);

      if (error) throw error;
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Offers ({offers.length})
        </h3>
      </div>

      <div className="space-y-2">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50"
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
                  <span className="font-bold text-primary">
                    {formatPrice(offer.amount)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    by {offer.buyer?.display_name || 'Anonymous'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}
                </div>
              </div>
            </div>

            {isOwner && (
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
        ))}
      </div>
    </div>
  );
};