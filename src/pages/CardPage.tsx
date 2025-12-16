import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, TrendingDown, Users, Clock, 
  Loader2, Bell, Plus,
  ShoppingCart, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ItemPriceChart } from '@/components/item/ItemPriceChart';
import { ItemSalesHistory } from '@/components/item/ItemSalesHistory';
import { ShareButton } from '@/components/ShareButton';
import { PlaceBidDialog } from '@/components/item/PlaceBidDialog';
import { 
  generateCardSlug, 
  parseSlug, 
  normalizeCategory,
  normalizeSlug 
} from '@/lib/seoSlug';

const CardPage = () => {
  const { category, slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);

  // Get variant params from query string (not path)
  const gradeParam = searchParams.get('grade')?.toUpperCase() || 'RAW';
  const languageParam = searchParams.get('language');
  const conditionParam = searchParams.get('condition');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // Parse slug to extract search components
  const { searchTerms, possibleYear, possibleCardNumber } = parseSlug(slug || '');

  // Fetch item by slug resolution - prioritize exact matches
  const { data: item, isLoading, isError } = useQuery({
    queryKey: ['card-page-seo', category, slug],
    queryFn: async () => {
      const normalizedCategory = normalizeCategory(category || '');
      
      // First: Try to find by external_id if we have a card number
      if (possibleCardNumber) {
        const { data: exactMatch } = await supabase
          .from('market_items')
          .select('*')
          .eq('category', normalizedCategory)
          .ilike('external_id', `%${possibleCardNumber}%`)
          .ilike('name', `%${searchTerms.split(' ')[0]}%`)
          .limit(1)
          .maybeSingle();
        
        if (exactMatch) return exactMatch;
      }

      // Second: Search by name similarity
      const { data, error } = await supabase
        .from('market_items')
        .select('*')
        .eq('category', normalizedCategory)
        .ilike('name', `%${searchTerms}%`)
        .limit(10);
      
      if (error) throw error;
      if (!data || data.length === 0) return null;

      // If multiple matches, try to find best match using year/set
      if (data.length > 1 && possibleYear) {
        const yearMatch = data.find(d => 
          d.series?.includes(possibleYear) || 
          d.set_name?.includes(possibleYear)
        );
        if (yearMatch) return yearMatch;
      }

      return data[0];
    },
    enabled: !!category && !!slug,
  });

  // Handle canonical URL redirect
  useEffect(() => {
    if (item && !isLoading) {
      const canonicalSlug = generateCardSlug(item);
      const canonicalCategory = normalizeCategory(item.category);
      const currentPath = location.pathname;
      const canonicalPath = `/cards/${canonicalCategory}/${canonicalSlug}`;
      
      // Check if current URL matches canonical - redirect if not
      if (currentPath !== canonicalPath && !currentPath.startsWith('/item/')) {
        // 301 redirect to canonical URL (browser handles as client-side)
        navigate(canonicalPath + location.search, { replace: true });
      }
    }
  }, [item, isLoading, location.pathname, location.search, navigate]);

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
    queryKey: ['card-listings', item?.id, searchTerms],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .ilike('title', `%${searchTerms}%`)
        .eq('status', 'active')
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!searchTerms,
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

  // SEO data
  const cardName = item?.name || searchTerms;
  const setName = item?.set_name || '';
  const year = possibleYear || '';
  
  const pageTitle = `${cardName}${setName ? ` - ${setName}` : ''}${year ? ` (${year})` : ''} | CardBoom`;
  
  const pageDescription = item
    ? `${item.name} price guide. Current market value: ${formatPrice(item.current_price || 0)}. Track prices, view listings, and analyze market trends on CardBoom.`
    : `Find ${cardName} prices, values, and market data. Track your collection with CardBoom.`;

  const canonicalCategory = normalizeCategory(category || '');
  const canonicalSlug = item ? generateCardSlug(item) : normalizeSlug(slug || '');
  const canonicalUrl = `https://cardboom.com/cards/${canonicalCategory}/${canonicalSlug}`;

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
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": cardName,
            "description": pageDescription,
            "image": item?.image_url,
            "brand": {
              "@type": "Brand",
              "name": item?.category || category
            },
            "offers": {
              "@type": "AggregateOffer",
              "priceCurrency": "USD",
              "lowPrice": activeListings?.length ? Math.min(...activeListings.map(l => l.price)) : item?.current_price,
              "highPrice": activeListings?.length ? Math.max(...activeListings.map(l => l.price)) : item?.current_price,
              "offerCount": activeListings?.length || 0,
              "availability": activeListings?.length ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
            },
            "aggregateRating": item?.sales_count_30d ? {
              "@type": "AggregateRating",
              "ratingValue": "4.5",
              "reviewCount": item.sales_count_30d
            } : undefined
          })}
        </script>
      </Helmet>

      <Header cartCount={0} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb with structured data */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link to="/markets" className="hover:text-foreground">Markets</Link>
          <span>/</span>
          <Link to={`/explorer?category=${canonicalCategory}`} className="hover:text-foreground capitalize">
            {canonicalCategory}
          </Link>
          <span>/</span>
          <span className="text-foreground">{cardName}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Image & Quick Actions */}
          <div className="lg:col-span-1 space-y-4">
            <div className="glass rounded-2xl p-4 aspect-square sticky top-24">
              <img 
                src={item?.image_url || '/placeholder.svg'} 
                alt={`${cardName}${setName ? ` from ${setName}` : ''}`}
                className="w-full h-full object-contain rounded-xl"
                loading="eager"
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
            <header>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="capitalize">{canonicalCategory}</Badge>
                {item?.is_trending && (
                  <Badge className="bg-accent text-accent-foreground">🔥 Trending</Badge>
                )}
                {item?.rarity && <Badge variant="outline">{item.rarity}</Badge>}
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                {cardName}
              </h1>
              {(setName || year) && (
                <p className="text-muted-foreground text-lg">
                  {setName}{setName && year ? ' • ' : ''}{year}
                </p>
              )}
            </header>

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
                title={cardName}
                text={`Check out ${cardName} on CardBoom`}
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
                                loading="lazy"
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
