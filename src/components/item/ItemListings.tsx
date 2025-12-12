import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, MessageSquare, ArrowLeftRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MakeOfferDialog } from '@/components/trading/MakeOfferDialog';
import { StartConversationDialog } from '@/components/messaging/StartConversationDialog';

interface ItemListingsProps {
  itemId: string;
}

// Mock listings data
const MOCK_LISTINGS = [
  { id: '1', price: 425000, grade: 'PSA 10', seller: 'TopCollector', verified: true, allowsVault: true, allowsTrade: true },
  { id: '2', price: 418000, grade: 'PSA 10', seller: 'CardKing99', verified: true, allowsVault: true, allowsTrade: false },
  { id: '3', price: 395000, grade: 'PSA 9', seller: 'VintageCards', verified: false, allowsVault: true, allowsTrade: true },
  { id: '4', price: 385000, grade: 'PSA 9', seller: 'TCGMaster', verified: true, allowsVault: false, allowsTrade: true },
  { id: '5', price: 410000, grade: 'PSA 10', seller: 'RareFinds', verified: true, allowsVault: true, allowsTrade: true },
];

export const ItemListings = ({ itemId }: ItemListingsProps) => {
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

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

  const currentListing = MOCK_LISTINGS.find(l => l.id === selectedListing);

  return (
    <>
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <h3 className="font-display text-xl font-semibold text-foreground">Active Listings</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {MOCK_LISTINGS.length} listings available
          </p>
        </div>

        <div className="divide-y divide-border/30">
          {MOCK_LISTINGS.map((listing) => (
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
                        listing.grade === 'PSA 10' ? "bg-gold/20 text-gold" : "bg-purple-500/20 text-purple-400"
                      )}>
                        {listing.grade}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-muted-foreground text-sm">{listing.seller}</span>
                      {listing.verified && (
                        <span className="flex items-center gap-1 text-xs text-primary">
                          <Check className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {listing.allowsVault && (
                    <span className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground">
                      Vault
                    </span>
                  )}
                  {listing.allowsTrade && (
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
        sellerName={currentListing?.seller || ''}
      />

      <StartConversationDialog
        open={showMessageDialog}
        onOpenChange={setShowMessageDialog}
        listingId={selectedListing || ''}
        sellerName={currentListing?.seller || ''}
      />
    </>
  );
};
