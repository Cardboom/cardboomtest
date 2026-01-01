import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, MessageSquare, Check, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MakeOfferDialog } from '@/components/trading/MakeOfferDialog';
import { StartConversationDialog } from '@/components/messaging/StartConversationDialog';
import { useCurrency } from '@/contexts/CurrencyContext';

interface ItemListingsProps {
  itemId: string;
  itemName?: string;
}

interface Listing {
  id: string;
  price: number;
  condition: string;
  seller_id: string;
  allows_vault: boolean;
  allows_trade: boolean;
  allows_shipping: boolean;
  seller_name?: string;
  is_verified?: boolean;
}

export const ItemListings = ({ itemId, itemName }: ItemListingsProps) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      
      // Fetch listings that match this market item by name
      const { data, error } = await supabase
        .from('listings')
        .select('id, price, condition, seller_id, allows_vault, allows_trade, allows_shipping')
        .eq('status', 'active')
        .ilike('title', itemName ? `%${itemName}%` : '%')
        .order('price', { ascending: true })
        .limit(20);

      if (error) {
        console.error('Error fetching listings:', error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Fetch seller profiles from public view (excludes PII)
        const sellerIds = [...new Set(data.map(l => l.seller_id))];
        const { data: profiles } = await supabase
          .from('public_profiles')
          .select('id, display_name, is_id_verified')
          .in('id', sellerIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]));

        const listingsWithSellers = data.map(listing => ({
          ...listing,
          seller_name: profileMap.get(listing.seller_id)?.display_name || 'Anonymous',
          is_verified: profileMap.get(listing.seller_id)?.is_id_verified || false
        }));

        setListings(listingsWithSellers);
      } else {
        setListings([]);
      }
      
      setLoading(false);
    };

    fetchListings();
  }, [itemId, itemName]);

  const handleBuyNow = async (listingId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Please sign in to buy');
      return;
    }
    toast.success('Redirecting to checkout...');
  };

  const handleMakeOffer = (listingId: string) => {
    setSelectedListing(listingId);
    setShowOfferDialog(true);
  };

  const handleMessage = (listingId: string) => {
    setSelectedListing(listingId);
    setShowMessageDialog(true);
  };

  const currentListing = listings.find(l => l.id === selectedListing);

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="glass rounded-xl p-6 text-center">
        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold text-foreground mb-1">No Active Listings</h3>
        <p className="text-sm text-muted-foreground">
          Be the first to list this item for sale
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <h3 className="font-display text-xl font-semibold text-foreground">Active Listings</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {listings.length} listing{listings.length !== 1 ? 's' : ''} available
          </p>
        </div>

        <div className="divide-y divide-border/30">
          {listings.map((listing) => (
            <div 
              key={listing.id}
              className="p-4 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-bold text-xl">{formatPrice(listing.price)}</p>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        listing.condition === 'Gem Mint' || listing.condition === 'PSA 10' 
                          ? "bg-gold/20 text-gold" 
                          : "bg-purple-500/20 text-purple-400"
                      )}>
                        {listing.condition}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-muted-foreground text-sm">{listing.seller_name}</span>
                      {listing.is_verified && (
                        <span className="flex items-center gap-1 text-xs text-primary">
                          <Check className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {listing.allows_vault && (
                    <span className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground">
                      Vault
                    </span>
                  )}
                  {listing.allows_trade && (
                    <span className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground">
                      Trade
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleMessage(listing.id)}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleMakeOffer(listing.id)}
                  >
                    Make Offer
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleBuyNow(listing.id)}
                    className="bg-primary text-primary-foreground"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Buy Now
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MakeOfferDialog
        open={showOfferDialog}
        onOpenChange={setShowOfferDialog}
        listingId={selectedListing || ''}
        listingPrice={currentListing?.price || 0}
        sellerName={currentListing?.seller_name || ''}
      />

      <StartConversationDialog
        open={showMessageDialog}
        onOpenChange={setShowMessageDialog}
        listingId={selectedListing || ''}
        sellerName={currentListing?.seller_name || ''}
      />
    </>
  );
};
