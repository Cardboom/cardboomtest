import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, TrendingDown, Eye, Heart, 
  Clock, Users, ChevronLeft, Plus, Loader2, ImagePlus,
  BarChart3, DollarSign, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ItemPriceChart } from '@/components/item/ItemPriceChart';
import { ItemSalesHistory } from '@/components/item/ItemSalesHistory';
import { ItemListings } from '@/components/item/ItemListings';
import { ItemGradeComparison } from '@/components/item/ItemGradeComparison';
import { WhatIfSimulator } from '@/components/item/WhatIfSimulator';
import { TimeToSell } from '@/components/item/TimeToSell';
import { SentimentIndicator } from '@/components/item/SentimentIndicator';
import { ShareButton } from '@/components/ShareButton';
import { useGenerateItemImage } from '@/hooks/useGenerateItemImage';
import { PlaceBidDialog } from '@/components/item/PlaceBidDialog';
import { ItemBids } from '@/components/item/ItemBids';
import { FractionalOwnershipCard } from '@/components/fractional/FractionalOwnershipCard';
import { CreateFractionalDialog } from '@/components/fractional/CreateFractionalDialog';
import { CardSocialProof } from '@/components/CardSocialProof';
import { generateCardUrl } from '@/lib/seoSlug';

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState<any>(null);
  const [selectedGrade, setSelectedGrade] = useState('psa10');
  const { generateImage, isGenerating } = useGenerateItemImage();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // Track view on page load
  useEffect(() => {
    if (id) {
      const sessionId = localStorage.getItem('session_id') || crypto.randomUUID();
      localStorage.setItem('session_id', sessionId);
      
      supabase.from('item_views').insert({
        market_item_id: id,
        user_id: user?.id || null,
        session_id: sessionId,
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['item-views', id] });
      });
    }
  }, [id, user?.id]);

  // Fetch market item from database
  const { data: item, isLoading: itemLoading } = useQuery({
    queryKey: ['market-item', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_items')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Redirect to SEO-friendly URL
  useEffect(() => {
    if (item && !itemLoading) {
      const seoUrl = generateCardUrl({
        name: item.name,
        category: item.category,
        set_name: item.set_name,
        series: item.series,
        external_id: item.external_id,
      });
      // Replace current URL with SEO-friendly version
      navigate(seoUrl, { replace: true });
    }
  }, [item, itemLoading, navigate]);

  // Fetch view counts
  const { data: viewStats } = useQuery({
    queryKey: ['item-views', id],
    queryFn: async () => {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [views24hRes, views7dRes] = await Promise.all([
        supabase.from('item_views').select('id', { count: 'exact', head: true })
          .eq('market_item_id', id).gte('viewed_at', twentyFourHoursAgo.toISOString()),
        supabase.from('item_views').select('id', { count: 'exact', head: true })
          .eq('market_item_id', id).gte('viewed_at', sevenDaysAgo.toISOString()),
      ]);

      return {
        views24h: views24hRes.count || 0,
        views7d: views7dRes.count || 0,
      };
    },
    enabled: !!id,
  });

  // Fetch watchlist count
  const { data: watchlistCount } = useQuery({
    queryKey: ['watchlist-count', id],
    queryFn: async () => {
      const { count } = await supabase
        .from('watchlist')
        .select('id', { count: 'exact', head: true })
        .eq('market_item_id', id);
      return count || 0;
    },
    enabled: !!id,
  });

  // Check if user is watching this item
  const { data: isWatching } = useQuery({
    queryKey: ['user-watchlist', id, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('watchlist')
        .select('id')
        .eq('market_item_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!id && !!user?.id,
  });

  // Fetch sales count
  const { data: salesCount30d } = useQuery({
    queryKey: ['sales-count', id],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());
      return count || 0;
    },
    enabled: !!id,
  });

  // Fetch active bids count
  const { data: bidCount } = useQuery({
    queryKey: ['bid-count', id],
    queryFn: async () => {
      const { count } = await supabase
        .from('bids')
        .select('id', { count: 'exact', head: true })
        .eq('market_item_id', id)
        .eq('status', 'active');
      return count || 0;
    },
    enabled: !!id,
  });

  // Toggle watchlist mutation
  const toggleWatchlistMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      if (isWatching) {
        const { error } = await supabase
          .from('watchlist')
          .delete()
          .eq('market_item_id', id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('watchlist')
          .insert({ market_item_id: id, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-watchlist', id] });
      queryClient.invalidateQueries({ queryKey: ['watchlist-count', id] });
      toast.success(isWatching ? 'Removed from watchlist' : 'Added to watchlist');
    },
    onError: (error) => {
      toast.error('Failed to update watchlist');
      console.error(error);
    },
  });

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  const toggleWatchlist = () => {
    if (!user) {
      toast.error('Please sign in to add to watchlist');
      navigate('/auth');
      return;
    }
    toggleWatchlistMutation.mutate();
  };

  const addToPortfolio = () => {
    if (!user) {
      toast.error('Please sign in to add to portfolio');
      navigate('/auth');
      return;
    }
    toast.success('Added to portfolio');
  };

  const handleGenerateImage = async () => {
    if (!item) return;
    const newImageUrl = await generateImage({
      item_id: item.id,
      item_name: item.name,
      category: item.category,
      set_name: item.set_name || undefined,
      rarity: item.rarity || undefined
    });
    if (newImageUrl) {
      queryClient.invalidateQueries({ queryKey: ['market-item', id] });
    }
  };

  if (itemLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show card info page even if item doesn't exist in our database
  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        <main className="container mx-auto px-4 py-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4 gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-1">
              <div className="glass rounded-2xl p-4 aspect-square flex items-center justify-center">
                <div className="text-center">
                  <ImagePlus className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No image available</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div>
                <Badge variant="secondary" className="mb-2">Unknown Card</Badge>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                  Card Not in Database
                </h1>
                <p className="text-muted-foreground text-lg">
                  This card isn't in our database yet, but you can still place a bid!
                </p>
              </div>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Activity className="w-6 h-6 text-primary" />
                    <h3 className="font-semibold text-lg">Want this card?</h3>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Place a bid and we'll notify sellers when someone wants to sell this card.
                  </p>
                  <PlaceBidDialog
                    itemName="Unknown Card"
                    category="unknown"
                    user={user}
                  />
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => navigate('/explorer')} variant="outline">
                  Browse Cards
                </Button>
                <Button onClick={() => navigate('/sell')} variant="outline">
                  List Your Cards
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const change24h = item.change_24h || 0;
  const change7d = item.change_7d || 0;
  const change30d = item.change_30d || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={cartItems.length} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-6">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4 gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        {/* Item Header */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Image */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-4 aspect-square relative">
              <img 
                src={item.image_url || '/placeholder.svg'} 
                alt={item.name}
                className="w-full h-full object-contain rounded-xl"
              />
              {(!item.image_url || item.image_url === '/placeholder.svg') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleGenerateImage}
                  disabled={isGenerating}
                  className="absolute bottom-6 right-6 gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4" />
                  )}
                  Generate Image
                </Button>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="capitalize">
                  {item.category?.replace('-', ' ')}
                </Badge>
                {item.is_trending && (
                  <Badge className="bg-accent text-accent-foreground">
                    🔥 Trending
                  </Badge>
                )}
                {item.rarity && (
                  <Badge variant="outline">{item.rarity}</Badge>
                )}
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                {item.name}
              </h1>
              <p className="text-muted-foreground text-lg">
                {item.set_name && `${item.set_name} • `}{item.series}
              </p>
            </div>

            {/* Price & Change */}
            <div className="glass rounded-xl p-6">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Current Price</p>
                  <p className="font-display text-4xl font-bold text-foreground">
                    {formatPrice(item.current_price || 0)}
                  </p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">24h</p>
                    <span className={cn(
                      "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold",
                      change24h >= 0 ? "bg-gain/20 text-gain" : "bg-loss/20 text-loss"
                    )}>
                      {change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {change24h >= 0 ? '+' : ''}{change24h.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">7d</p>
                    <span className={cn(
                      "text-sm font-semibold",
                      change7d >= 0 ? "text-gain" : "text-loss"
                    )}>
                      {change7d >= 0 ? '+' : ''}{change7d.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">30d</p>
                    <span className={cn(
                      "text-sm font-semibold",
                      change30d >= 0 ? "text-gain" : "text-loss"
                    )}>
                      {change30d >= 0 ? '+' : ''}{change30d.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="glass rounded-xl p-4 text-center">
                <Eye className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-foreground font-semibold">{(viewStats?.views24h || 0).toLocaleString()}</p>
                <p className="text-muted-foreground text-xs">Views (24h)</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <Eye className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-foreground font-semibold">{(viewStats?.views7d || 0).toLocaleString()}</p>
                <p className="text-muted-foreground text-xs">Views (7d)</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <Users className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-foreground font-semibold">{watchlistCount || 0}</p>
                <p className="text-muted-foreground text-xs">Watching</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <Clock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-foreground font-semibold">{salesCount30d || 0}</p>
                <p className="text-muted-foreground text-xs">Sales (30d)</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <DollarSign className="w-5 h-5 mx-auto mb-2 text-primary" />
                <p className="text-foreground font-semibold">{bidCount || 0}</p>
                <p className="text-muted-foreground text-xs">Active Bids</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <PlaceBidDialog
                itemId={item.id}
                itemName={item.name}
                category={item.category}
                currentPrice={item.current_price}
                user={user}
              />
              <Button 
                onClick={toggleWatchlist}
                variant={isWatching ? "secondary" : "outline"}
                className="gap-2"
                disabled={toggleWatchlistMutation.isPending}
              >
                <Heart className={cn("w-4 h-4", isWatching && "fill-current text-loss")} />
                {isWatching ? 'Watching' : 'Add to Watchlist'}
              </Button>
              <Button onClick={addToPortfolio} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Add to Portfolio
              </Button>
              <ShareButton 
                title={item.name}
                text={`Check out ${item.name} on CardBoom - ${formatPrice(item.current_price || 0)}`}
              />
            </div>
          </div>
        </div>

        {/* Fractional Ownership & Bids Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <ItemBids itemId={item.id} itemName={item.name} />
          <div className="space-y-4">
            <FractionalOwnershipCard marketItemId={item.id} />
          </div>
        </div>

        {/* Social Proof Section */}
        <div className="mb-8">
          <CardSocialProof
            itemId={item.id}
            views={viewStats?.views24h || 0}
            watchlistCount={watchlistCount || 0}
            searchCount={Math.floor((viewStats?.views24h || 0) * 0.3)}
            mentionCount={Math.floor((watchlistCount || 0) * 0.5)}
            recentBuyers={salesCount30d || 0}
          />
        </div>

        {/* Investment Intelligence Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <WhatIfSimulator currentPrice={item.current_price || 0} itemName={item.name} />
          <TimeToSell category={item.category} rarity={item.rarity || 'common'} />
          <SentimentIndicator 
            priceChange24h={change24h}
            priceChange7d={change7d}
            views24h={viewStats?.views24h || 0}
            salesCount30d={salesCount30d || 0}
            watchlistCount={watchlistCount || 0}
          />
        </div>

        {/* Price Chart - Full Width (SEO: Main content) */}
        <section className="mb-8" aria-labelledby="price-history-heading">
          <ItemPriceChart 
            itemId={id || ''} 
            productId={item.external_id || id || ''} 
            itemName={item.name}
            category={item.category}
            currentPrice={item.current_price}
            marketItemId={item.id}
          />
        </section>

        {/* Sales History & Grade Comparison - Side by Side */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <section aria-labelledby="sales-history-heading">
            <ItemSalesHistory itemId={id || ''} />
          </section>
          
          <section aria-labelledby="grade-comparison-heading">
            <ItemGradeComparison 
              itemId={id || ''} 
              selectedGrade={selectedGrade}
              onGradeChange={setSelectedGrade}
            />
          </section>
        </div>

        {/* Active Listings - Full Width */}
        <section className="mb-8" aria-labelledby="active-listings-heading">
          <ItemListings itemId={id || ''} />
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ItemDetail;
