import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CardHeroSection, CardImageModule, PriceMarketPanel, BuyBox, SellerInfoCard, EscrowSection, CardDetailsSection } from '@/components/card-sale';
import { CardSocialProof } from '@/components/CardSocialProof';
import { ItemSalesHistory } from '@/components/item/ItemSalesHistory';
import { CardDiscussionPanel } from '@/components/discussions/CardDiscussionPanel';
import { generateCardUrl } from '@/lib/seoSlug';
import { PurchaseDialog } from '@/components/purchase/PurchaseDialog';

const CardSalePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);

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

  const mockListings = [{ id: item.id, condition: 'Near Mint', price: item.current_price || 100, sellerId: '1', sellerName: 'CardBoom Seller', sellerRating: 4.8, sellerVerified: true, totalSales: 156, estimatedDelivery: '3-5 days' }];
  const mockSeller = { id: '1', username: 'CardBoom Seller', isVerified: true, rating: 4.8, totalSales: 156, avgDeliveryDays: 3, memberSince: '2023', responseTime: '< 1 hour' };
  
  // Create a listing object for PurchaseDialog
  const purchaseListing = {
    id: item.id,
    title: item.name,
    price: item.current_price || 100,
    seller_id: '1', // Mock seller
    allows_vault: true,
    allows_shipping: true,
    allows_trade: true,
    category: item.category,
    condition: 'Near Mint',
    image_url: item.image_url,
  };

  const handleBuyNow = () => {
    if (!user) {
      toast.error('Please sign in to purchase');
      navigate('/auth');
      return;
    }
    setPurchaseDialogOpen(true);
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
                listings={mockListings}
                selectedListingId={item.id}
                onSelectListing={() => {}}
                onBuyNow={handleBuyNow}
                onMakeOffer={() => toast.info('Make an offer feature coming soon')}
                userBalance={250}
              />
              <SellerInfoCard seller={mockSeller} onViewProfile={() => navigate('/seller/1')} onMessage={() => navigate('/messages')} otherListingsCount={23} />
            </div>

            <EscrowSection onRequestGrading={() => navigate('/grading')} />
            
            <CardDetailsSection metadata={{ game: item.category, setName: item.set_name, rarity: item.rarity, cardNumber: item.external_id, language: 'English' }} />
          </div>
        </div>

        {/* Full Width Sections */}
        <div className="mt-8 space-y-8">
          <CardSocialProof itemId={item.id} views={viewStats?.views24h || 0} watchlistCount={watchlistCount || 0} searchCount={Math.floor((viewStats?.views24h || 0) * 0.3)} mentionCount={Math.floor((watchlistCount || 0) * 0.5)} recentBuyers={5} />
          <PriceMarketPanel itemId={item.id} productId={item.external_id} itemName={item.name} category={item.category} currentPrice={item.current_price || 0} priceChange24h={item.change_24h} priceChange7d={item.change_7d} priceChange30d={item.change_30d} confidenceBand={{ low: (item.current_price || 100) * 0.9, high: (item.current_price || 100) * 1.1 }} />
          <ItemSalesHistory itemId={id || ''} />
          <CardDiscussionPanel marketItemId={item.id} itemName={item.name} currentPrice={item.current_price} />
        </div>
      </main>

      {/* Purchase Dialog */}
      <PurchaseDialog
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
        listing={purchaseListing}
      />

      {/* Mobile Sticky Buy Button */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border z-50">
        <Button className="w-full h-12 text-base font-semibold gap-2" onClick={handleBuyNow}>
          <ShoppingCart className="w-5 h-5" /> Buy Now - ${(item.current_price || 0).toLocaleString()}
        </Button>
      </div>

      <div className="lg:hidden h-20" /> {/* Spacer for sticky button */}
      <Footer />
    </div>
  );
};

export default CardSalePage;
