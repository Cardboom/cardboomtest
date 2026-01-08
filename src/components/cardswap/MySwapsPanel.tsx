import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { 
  ArrowLeftRight, 
  Check, 
  X, 
  Clock, 
  Trash2,
  MessageCircle
} from 'lucide-react';

interface MySwapsPanelProps {
  userId: string;
  onRefresh: () => void;
}

interface SwapOffer {
  id: string;
  offered_card_title: string;
  offered_card_image: string | null;
  offered_card_estimated_value: number | null;
  cash_addon: number;
  message: string | null;
  status: string;
  created_at: string;
  swap_listings?: {
    title: string;
    image_url: string | null;
  };
  profiles?: {
    display_name: string | null;
  };
}

export const MySwapsPanel = ({ userId, onRefresh }: MySwapsPanelProps) => {
  const [myListings, setMyListings] = useState<any[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<SwapOffer[]>([]);
  const [sentOffers, setSentOffers] = useState<SwapOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyData();
  }, [userId]);

  const fetchMyData = async () => {
    setLoading(true);
    try {
      // Fetch my listings
      const { data: listings } = await supabase
        .from('swap_listings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setMyListings(listings || []);

      // Fetch offers I received (on my listings)
      const { data: received } = await supabase
        .from('swap_offers')
        .select(`
          *,
          swap_listings!inner (title, image_url, user_id)
        `)
        .eq('swap_listings.user_id', userId)
        .order('created_at', { ascending: false });

      setReceivedOffers(received || []);

      // Fetch offers I sent
      const { data: sent } = await supabase
        .from('swap_offers')
        .select(`
          *,
          swap_listings (title, image_url)
        `)
        .eq('offerer_id', userId)
        .order('created_at', { ascending: false });

      setSentOffers(sent || []);
    } catch (error) {
      console.error('Error fetching my swaps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOfferAction = async (offerId: string, action: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('swap_offers')
        .update({ status: action })
        .eq('id', offerId);

      if (error) throw error;

      toast.success(`Offer ${action}!`);
      fetchMyData();
    } catch (error) {
      toast.error('Failed to update offer');
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('swap_listings')
        .delete()
        .eq('id', listingId);

      if (error) throw error;

      toast.success('Listing deleted');
      fetchMyData();
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete listing');
    }
  };

  const handleWithdrawOffer = async (offerId: string) => {
    try {
      const { error } = await supabase
        .from('swap_offers')
        .update({ status: 'withdrawn' })
        .eq('id', offerId);

      if (error) throw error;

      toast.success('Offer withdrawn');
      fetchMyData();
    } catch (error) {
      toast.error('Failed to withdraw offer');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <Tabs defaultValue="listings" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="listings">
          My Listings ({myListings.length})
        </TabsTrigger>
        <TabsTrigger value="received">
          Received ({receivedOffers.filter(o => o.status === 'pending').length})
        </TabsTrigger>
        <TabsTrigger value="sent">
          Sent ({sentOffers.length})
        </TabsTrigger>
      </TabsList>

      {/* My Listings */}
      <TabsContent value="listings" className="space-y-3">
        {myListings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            You haven't listed any cards for swap yet
          </div>
        ) : (
          myListings.map(listing => (
            <div key={listing.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
              <div className="w-16 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {listing.image_url ? (
                  <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ArrowLeftRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground line-clamp-1">{listing.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>
                    {listing.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteListing(listing.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </TabsContent>

      {/* Received Offers */}
      <TabsContent value="received" className="space-y-3">
        {receivedOffers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No offers received yet
          </div>
        ) : (
          receivedOffers.map(offer => (
            <div key={offer.id} className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-start gap-4">
                <div className="w-16 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {offer.offered_card_image ? (
                    <img src={offer.offered_card_image} alt={offer.offered_card_title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ArrowLeftRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground">{offer.offered_card_title}</h4>
                  <p className="text-sm text-muted-foreground">
                    For: {offer.swap_listings?.title}
                  </p>
                  {offer.cash_addon > 0 && (
                    <Badge className="mt-1 bg-green-500">+${offer.cash_addon} cash</Badge>
                  )}
                  {offer.message && (
                    <p className="text-sm text-muted-foreground mt-2 flex items-start gap-1">
                      <MessageCircle className="w-3 h-3 mt-1 flex-shrink-0" />
                      {offer.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={
                    offer.status === 'pending' ? 'outline' : 
                    offer.status === 'accepted' ? 'default' : 'secondary'
                  }>
                    {offer.status}
                  </Badge>
                  {offer.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOfferAction(offer.id, 'accepted')}
                        className="text-green-500 hover:bg-green-500/10"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOfferAction(offer.id, 'rejected')}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </TabsContent>

      {/* Sent Offers */}
      <TabsContent value="sent" className="space-y-3">
        {sentOffers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            You haven't made any offers yet
          </div>
        ) : (
          sentOffers.map(offer => (
            <div key={offer.id} className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-start gap-4">
                <div className="w-16 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {offer.offered_card_image ? (
                    <img src={offer.offered_card_image} alt={offer.offered_card_title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ArrowLeftRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground">{offer.offered_card_title}</h4>
                  <p className="text-sm text-muted-foreground">
                    For: {offer.swap_listings?.title}
                  </p>
                  {offer.cash_addon > 0 && (
                    <Badge className="mt-1 bg-green-500">+${offer.cash_addon} cash</Badge>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={
                    offer.status === 'pending' ? 'outline' : 
                    offer.status === 'accepted' ? 'default' : 'secondary'
                  }>
                    {offer.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                    {offer.status}
                  </Badge>
                  {offer.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleWithdrawOffer(offer.id)}
                      className="text-muted-foreground"
                    >
                      Withdraw
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
};
