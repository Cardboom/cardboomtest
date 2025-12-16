import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, TrendingDown, Eye, Heart, Users, Clock, 
  ChevronLeft, Plus, Loader2, BarChart3, Bell, Share2,
  ShoppingCart, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ItemPriceChart } from '@/components/item/ItemPriceChart';
import { ItemSalesHistory } from '@/components/item/ItemSalesHistory';
import { ItemListings } from '@/components/item/ItemListings';
import { ShareButton } from '@/components/ShareButton';
import { PlaceBidDialog } from '@/components/item/PlaceBidDialog';

const CardPage = () => {
  const { category, slug, grade } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // Parse slug back to search terms
  const searchName = slug?.replace(/-/g, ' ') || '';
  const selectedGrade = grade?.toUpperCase() || 'RAW';

  // Fetch item by slug/name match
  const { data: item, isLoading } = useQuery({
    queryKey: ['card-page', category, slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_items')
        .select('*')
        .eq('category', category)
        .ilike('name', `%${searchName}%`)
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!category && !!slug,
  });

  // Fetch watchlist count
  const { data: watchlistCount } = useQuery({
    queryKey: ['card-watchlist-count', item?.id],
    queryFn: async () => {
      if (!item?.id) return 0;
      const { count } = await supabase
        .from('watchlist')
        .select('id', { count: 'exact', head: true })
        .eq('market_item_id', item.id);
      return count || 0;
    },
    enabled: !!item?.id,
  });

  // Fetch active listings for this item
  const { data: activeListings } = useQuery({
    queryKey: ['card-listings', item?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .ilike('title', `%${searchName}%`)
        .eq('status', 'active')
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!searchName,
  });

  // Fetch price history
  const { data: priceHistory } = useQuery({
    queryKey: ['card-price-history', item?.id],
    queryFn: async () => {
      if (!item?.id) return [];
      const thirtyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('product_id', item.id)
        .gte('recorded_at', thirtyDaysAgo.toISOString())
        .order('recorded_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!item?.id,
  });

  // Check if user is watching
  const { data: isWatching } = useQuery({
    queryKey: ['card-user-watchlist', item?.id, user?.id],
    queryFn: async () => {
      if (!user?.id || !item?.id) return false;
      const { data } = await supabase
        .from('watchlist')
        .select('id')
        .eq('market_item_id', item.id)
        .eq('user_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!item?.id && !!user?.id,
  });

  // Toggle watchlist
  const toggleWatchlistMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !item?.id) throw new Error('Not authenticated');
      
      if (isWatching) {
        await supabase.from('watchlist').delete()
          .eq('market_item_id', item.id).eq('user_id', user.id);
      } else {
        await supabase.from('watchlist').insert({ 
          market_item_id: item.id, 
          user_id: user.id 
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-user-watchlist', item?.id] });
      queryClient.invalidateQueries({ queryKey: ['card-watchlist-count', item?.id] });
      toast.success(isWatching ? 'Removed from watchlist' : 'Added to watchlist');
    },
  });

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  const pageTitle = item 
    ? `${item.name} ${selectedGrade} Price & Value | CardBoom`
    : `${searchName} ${selectedGrade} Price Guide | CardBoom`;

  const pageDescription = item
    ? `Track ${item.name} ${selectedGrade} prices. Current value: ${formatPrice(item.current_price || 0)}. View price history, active listings, and market data.`
    : `Find ${searchName} prices, values, and market data. Track your collection with CardBoom.`;

  const canonicalUrl = `https://cardboom.com/${category}/${slug}${grade ? `/${grade}` : ''}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="product" />
        {item?.image_url && <meta property="og:image" content={item.image_url} />}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": item?.name || searchName,
            "description": pageDescription,
            "image": item?.image_url,
            "offers": {
              "@type": "AggregateOffer",
              "priceCurrency": "USD",
              "lowPrice": activeListings?.length ? Math.min(...activeListings.map(l => l.price)) : item?.current_price,
              "highPrice": activeListings?.length ? Math.max(...activeListings.map(l => l.price)) : item?.current_price,
              "offerCount": activeListings?.length || 0
            }
          })}
        </script>
      </Helmet>

      <Header cartCount={0} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link to="/markets" className="hover:text-foreground">Markets</Link>
          <span>/</span>
          <Link to={`/explorer?category=${category}`} className="hover:text-foreground capitalize">{category}</Link>
          <span>/</span>
          <span className="text-foreground">{item?.name || searchName}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Image & Quick Actions */}
          <div className="lg:col-span-1 space-y-4">
            <div className="glass rounded-2xl p-4 aspect-square sticky top-24">
              <img 
                src={item?.image_url || '/placeholder.svg'} 
                alt={item?.name || searchName}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            {/* Quick Stats */}
            <Card className="glass">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Tracking
                  </span>
                  <span className="font-semibold">{watchlistCount || 0} people</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    Active Listings
                  </span>
                  <span className="font-semibold">{activeListings?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Sales (30d)
                  </span>
                  <span className="font-semibold">{item?.sales_count_30d || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="capitalize">{category}</Badge>
                {item?.is_trending && (
                  <Badge className="bg-accent text-accent-foreground">🔥 Trending</Badge>
                )}
                {item?.rarity && <Badge variant="outline">{item.rarity}</Badge>}
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                {item?.name || searchName}
              </h1>
              {item?.set_name && (
                <p className="text-muted-foreground text-lg">{item.set_name}</p>
              )}
            </div>

            {/* Price Card */}
            <Card className="glass border-primary/20">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Market Price</p>
                    <p className="font-display text-4xl font-bold text-foreground">
                      {formatPrice(item?.current_price || 0)}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    {[
                      { label: '24h', value: item?.change_24h || 0 },
                      { label: '7d', value: item?.change_7d || 0 },
                      { label: '30d', value: item?.change_30d || 0 },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center">
                        <p className="text-muted-foreground text-xs mb-1">{label}</p>
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-semibold",
                          value >= 0 ? "bg-gain/20 text-gain" : "bg-loss/20 text-loss"
                        )}>
                          {value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {value >= 0 ? '+' : ''}{value.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {item && (
                <PlaceBidDialog
                  itemId={item.id}
                  itemName={item.name}
                  category={item.category}
                  currentPrice={item.current_price}
                  user={user}
                />
              )}
              <Button 
                onClick={() => {
                  if (!user) {
                    navigate('/auth');
                    return;
                  }
                  toggleWatchlistMutation.mutate();
                }}
                variant={isWatching ? "secondary" : "outline"}
                className="gap-2"
              >
                <Bell className={cn("w-4 h-4", isWatching && "fill-current")} />
                {isWatching ? 'Tracking' : 'Track Price'}
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => navigate('/portfolio')}>
                <Plus className="w-4 h-4" />
                Add to Portfolio
              </Button>
              <ShareButton 
                title={item?.name || searchName}
                text={`Check out ${item?.name || searchName} on CardBoom`}
              />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="listings" className="space-y-4">
              <TabsList className="glass">
                <TabsTrigger value="listings">
                  Listings ({activeListings?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="history">Price History</TabsTrigger>
                <TabsTrigger value="sales">Sales History</TabsTrigger>
              </TabsList>

              <TabsContent value="listings">
                {activeListings && activeListings.length > 0 ? (
                  <div className="space-y-3">
                    {activeListings.map((listing) => (
                      <Card key={listing.id} className="glass hover:border-primary/30 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <img 
                                src={listing.image_url || '/placeholder.svg'} 
                                alt={listing.title}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                              <div>
                                <h3 className="font-semibold">{listing.title}</h3>
                                <p className="text-sm text-muted-foreground">{listing.condition}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-display text-xl font-bold">${listing.price}</p>
                              <Button size="sm" asChild>
                                <Link to={`/listing/${listing.id}`}>
                                  View <ExternalLink className="w-3 h-3 ml-1" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="glass">
                    <CardContent className="p-8 text-center">
                      <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">No Active Listings</h3>
                      <p className="text-muted-foreground mb-4">
                        Be the first to list this item!
                      </p>
                      <Button onClick={() => navigate('/sell')}>
                        List Now
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="history">
                {item && <ItemPriceChart itemId={item.id} />}
              </TabsContent>

              <TabsContent value="sales">
                {item && <ItemSalesHistory itemId={item.id} />}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CardPage;