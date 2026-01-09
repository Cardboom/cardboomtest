import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Loader2, ShoppingCart, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CardHeroSection, CardImageModule, PriceMarketPanel, BuyBox, SellerInfoCard, EscrowSection, CardDetailsSection } from '@/components/card-sale';
import { CardSocialProof } from '@/components/CardSocialProof';
import { ItemSalesHistory } from '@/components/item/ItemSalesHistory';
import { ItemListings } from '@/components/item/ItemListings';
import { CardDiscussionPanel } from '@/components/discussions/CardDiscussionPanel';
import { GradingDonationPanel } from '@/components/listing/GradingDonationPanel';
import { generateCardUrl } from '@/lib/seoSlug';

const CardSalePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
  }, []);

  const { data: item, isLoading } = useQuery({
    queryKey: ['market-item', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('market_items').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: viewStats } = useQuery({
    queryKey: ['item-views', id],
    queryFn: async () => {
      const now = new Date();
      const [views24h, views7d] = await Promise.all([
        supabase.from('item_views').select('id', { count: 'exact', head: true }).eq('market_item_id', id).gte('viewed_at', new Date(now.getTime() - 86400000).toISOString()),
        supabase.from('item_views').select('id', { count: 'exact', head: true }).eq('market_item_id', id).gte('viewed_at', new Date(now.getTime() - 604800000).toISOString()),
      ]);
      return { views24h: views24h.count || 0, views7d: views7d.count || 0 };
    },
    enabled: !!id,
  });

  const { data: watchlistCount } = useQuery({
    queryKey: ['watchlist-count', id],
    queryFn: async () => {
      const { count } = await supabase.from('watchlist').select('id', { count: 'exact', head: true }).eq('market_item_id', id);
      return count || 0;
    },
    enabled: !!id,
  });

  const { data: isWatching } = useQuery({
    queryKey: ['user-watchlist', id, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase.from('watchlist').select('id').eq('market_item_id', id).eq('user_id', user.id).maybeSingle();
      return !!data;
    },
    enabled: !!id && !!user?.id,
  });

  const toggleWatchlistMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      if (isWatching) {
        await supabase.from('watchlist').delete().eq('market_item_id', id).eq('user_id', user.id);
      } else {
        await supabase.from('watchlist').insert({ market_item_id: id, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-watchlist', id] });
      queryClient.invalidateQueries({ queryKey: ['watchlist-count', id] });
      toast.success(isWatching ? 'Removed from watchlist' : 'Added to watchlist');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        <main className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Card Not Found</h1>
          <Button onClick={() => navigate('/explorer')}>Browse Cards</Button>
        </main>
        <Footer />
      </div>
    );
  }

  // Fetch actual listings for this market item (including donation fields)
  const { data: activeListings, refetch: refetchListings } = useQuery({
    queryKey: ['item-listings', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, price, condition, seller_id, allows_vault, allows_shipping, allows_trade, image_url, category, accepts_grading_donations, donation_goal_cents')
        .eq('status', 'active')
        .or(`title.ilike.%${item?.name}%,market_item_id.eq.${id}`)
        .order('price', { ascending: true })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && !!item,
  });

  // Get listings that accept donations
  const donationListings = activeListings?.filter(l => l.accepts_grading_donations) || [];

  const hasListings = activeListings && activeListings.length > 0;
  const cheapestListing = hasListings ? activeListings[0] : null;
  
  // For display purposes - show real listings or placeholder info
  const displayListings = hasListings 
    ? activeListings.map(l => ({
        id: l.id,
        condition: l.condition,
        price: l.price,
        sellerId: l.seller_id,
        sellerName: 'Seller',
        sellerRating: 4.5,
        sellerVerified: false,
        totalSales: 0,
        estimatedDelivery: '3-5 days'
      }))
    : [{ id: item.id, condition: 'Near Mint', price: item.current_price || 100, sellerId: '', sellerName: 'No listings', sellerRating: 0, sellerVerified: false, totalSales: 0, estimatedDelivery: '-' }];

  const mockSeller = hasListings && cheapestListing
    ? { id: cheapestListing.seller_id, username: 'Seller', isVerified: false, rating: 4.5, totalSales: 0, avgDeliveryDays: 3, memberSince: '2024', responseTime: '< 1 hour' }
    : { id: '', username: 'No listings available', isVerified: false, rating: 0, totalSales: 0, avgDeliveryDays: 0, memberSince: '-', responseTime: '-' };

  const handleBuyNow = () => {
    if (!user) {
      toast.error('Please sign in to purchase');
      navigate('/auth');
      return;
    }
    
    // If there are real listings, navigate to the listing detail page
    if (cheapestListing) {
      navigate(`/listing/${cheapestListing.id}`);
    } else {
      toast.info('No active listings available. Check back later or create a Buy Order!');
      navigate('/buy-orders');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{item.name} | CardBoom</title>
        <meta name="description" content={`Buy ${item.name} on CardBoom. Secure escrow, verified sellers.`} />
      </Helmet>

      <Header cartCount={0} onCartClick={() => {}} />

      <main className="container mx-auto px-4 py-4 sm:py-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 gap-2 -ml-2">
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column - Image */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-4 space-y-4">
              <CardImageModule imageUrl={item.image_url} name={item.name} condition="Near Mint" />
            </div>
          </div>

          {/* Right Column - Info */}
          <div className="lg:col-span-7 space-y-6">
            <CardHeroSection
              item={item}
              soldLast24h={viewStats?.views24h ? Math.floor(viewStats.views24h * 0.1) : 2}
              soldLast7d={viewStats?.views7d ? Math.floor(viewStats.views7d * 0.08) : 12}
              medianSellTime={3}
              isWatching={isWatching || false}
              onToggleWatchlist={() => user ? toggleWatchlistMutation.mutate() : navigate('/auth')}
              onBuyNow={handleBuyNow}
              isPending={toggleWatchlistMutation.isPending}
            />

            <div className="grid md:grid-cols-2 gap-6">
              <BuyBox
                listings={displayListings}
                selectedListingId={cheapestListing?.id || item.id}
                onSelectListing={(listingId) => navigate(`/listing/${listingId}`)}
                onBuyNow={handleBuyNow}
                onMakeOffer={() => hasListings ? toast.info('Make an offer feature coming soon') : navigate('/buy-orders')}
                userBalance={250}
              />
              <SellerInfoCard 
                seller={mockSeller} 
                onViewProfile={() => cheapestListing ? navigate(`/seller/${cheapestListing.seller_id}`) : {}} 
                onMessage={() => navigate('/messages')} 
                otherListingsCount={activeListings?.length || 0} 
              />
            </div>

            <EscrowSection onRequestGrading={() => navigate('/grading')} />
            
            <CardDetailsSection metadata={{ game: item.category, setName: item.set_name, rarity: item.rarity, cardNumber: item.external_id, language: 'English' }} />
          </div>
        </div>

        {/* Full Width Sections */}
        <div className="mt-8 space-y-8">
          {/* Community Grading Donations */}
          {donationListings.length > 0 && (
            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Help Get This Card Graded
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Tip towards grading fees. When the goal ($10) is reached, the owner can get this card professionally graded!
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {donationListings.map((listing) => (
                    <GradingDonationPanel
                      key={listing.id}
                      targetType="listing"
                      targetId={listing.id}
                      ownerId={listing.seller_id}
                      acceptsDonations={listing.accepts_grading_donations || false}
                      goalCents={listing.donation_goal_cents || 1000}
                      isOwner={user?.id === listing.seller_id}
                      cardTitle={listing.title}
                      onToggleDonations={async (enabled) => {
                        const { error } = await supabase
                          .from('listings')
                          .update({ accepts_grading_donations: enabled })
                          .eq('id', listing.id);
                        if (!error) {
                          refetchListings();
                          toast.success(enabled ? 'Donations enabled' : 'Donations disabled');
                        }
                      }}
                      onRefundAndDelist={async () => {
                        await supabase.from('listings').update({ status: 'cancelled' }).eq('id', listing.id);
                        refetchListings();
                        toast.success('Listing delisted and donations refunded');
                      }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Sellers Section - TCGPlayer style */}
          <ItemListings itemId={item.id} itemName={item.name} />
          
          <CardSocialProof itemId={item.id} views={viewStats?.views24h || 0} watchlistCount={watchlistCount || 0} searchCount={Math.floor((viewStats?.views24h || 0) * 0.3)} mentionCount={Math.floor((watchlistCount || 0) * 0.5)} recentBuyers={5} />
          <PriceMarketPanel itemId={item.id} productId={item.external_id} itemName={item.name} category={item.category} currentPrice={item.current_price || 0} priceChange24h={item.change_24h} priceChange7d={item.change_7d} priceChange30d={item.change_30d} confidenceBand={{ low: (item.current_price || 100) * 0.9, high: (item.current_price || 100) * 1.1 }} psa10Price={(item as any).psa10_price} rawPrice={(item as any).raw_price} />
          <ItemSalesHistory itemId={id || ''} />
          <CardDiscussionPanel marketItemId={item.id} itemName={item.name} currentPrice={item.current_price} />
        </div>
      </main>

      {/* Mobile Sticky Buy Button */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border z-50">
        <Button className="w-full h-12 text-base font-semibold gap-2" onClick={handleBuyNow} disabled={!hasListings}>
          <ShoppingCart className="w-5 h-5" /> 
          {hasListings 
            ? `Buy Now - $${(cheapestListing?.price || 0).toLocaleString()}`
            : 'No Listings Available'
          }
        </Button>
      </div>

      <div className="lg:hidden h-20" /> {/* Spacer for sticky button */}
      <Footer />
    </div>
  );
};

export default CardSalePage;
