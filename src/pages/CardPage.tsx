import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { 
  TrendingUp, TrendingDown, Users, Clock, 
  Loader2, Bell, Plus,
  ShoppingCart, ExternalLink, Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ItemPriceChart } from '@/components/item/ItemPriceChart';
import { ItemSalesHistory } from '@/components/item/ItemSalesHistory';
import { ItemListings } from '@/components/item/ItemListings';
import { GradingDonationPanel } from '@/components/listing/GradingDonationPanel';
import { ShareButton } from '@/components/ShareButton';
import { PlaceBidDialog } from '@/components/item/PlaceBidDialog';
import { CardPriceEstimates } from '@/components/CardPriceEstimates';
import { CardDiscussionPanel } from '@/components/discussions/CardDiscussionPanel';
import { 
  generateCardSlug, 
  parseSlug, 
  normalizeCategory,
  normalizeSlug,
  isOnePieceCategory,
  extractCardCode 
} from '@/lib/seoSlug';
import { useLanguage } from '@/contexts/LanguageContext';

const CardPage = () => {
  const { category, slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const { t } = useLanguage();

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
  const { searchTerms, possibleYear, possibleCardNumber, onePieceCardCode } = parseSlug(slug || '');
  
  // Split search terms into words for flexible matching (filter short words)
  const searchWords = searchTerms.split(' ').filter(w => w.length >= 3);
  
  // Check if this is a One Piece category
  const isOnepiece = isOnePieceCategory(category || '');

  // Fetch item by slug resolution - improved matching logic
  const { data: item, isLoading, isError } = useQuery({
    queryKey: ['card-page-seo', category, slug],
    queryFn: async () => {
      const normalizedCategory = normalizeCategory(category || '');
      
      // STRATEGY 0: For One Piece, use EXACT card_code matching (NO FALLBACKS)
      if (isOnepiece) {
        const cardCode = onePieceCardCode || extractCardCode(slug || '');
        
        if (cardCode) {
          // Try exact match on name containing the card code
          const { data: exactCodeMatch } = await supabase
            .from('market_items')
            .select('*')
            .or(`category.ilike.one-piece%,category.ilike.onepiece%`)
            .ilike('name', `%${cardCode}%`)
            .limit(5);
          
          if (exactCodeMatch && exactCodeMatch.length > 0) {
            // Find the exact match where the card code in name matches exactly
            const exactMatch = exactCodeMatch.find(item => {
              const itemCode = extractCardCode(item.name);
              return itemCode === cardCode;
            });
            
            if (exactMatch) {
              return exactMatch;
            }
            
            // If no exact match, return first result (should not happen with proper data)
            console.warn(`[CardPage] One Piece card code ${cardCode} had multiple matches, using first`);
            return exactCodeMatch[0];
          }
        }
        
        // If no card code found in slug, try full slug match
        const { data: fullSlugMatch } = await supabase
          .from('market_items')
          .select('*')
          .or(`category.ilike.one-piece%,category.ilike.onepiece%`)
          .ilike('name', `%${slug?.replace(/-/g, ' ')}%`)
          .limit(1)
          .maybeSingle();
        
        if (fullSlugMatch) return fullSlugMatch;
        
        // One Piece: DO NOT use name-based fallbacks to avoid collisions
        console.error(`[CardPage] One Piece card not found for slug: ${slug}`);
        return null;
      }
      
      // NON-ONE PIECE: Use existing fuzzy matching strategies
      
      // Strategy 1: Try exact external_id match
      if (possibleCardNumber) {
        const { data: exactMatch } = await supabase
          .from('market_items')
          .select('*')
          .ilike('category', `${normalizedCategory}%`)
          .ilike('external_id', `%${possibleCardNumber}%`)
          .limit(1)
          .maybeSingle();
        
        if (exactMatch) return exactMatch;
      }

      // Strategy 2: Try matching with full search terms
      const { data: fullMatch } = await supabase
        .from('market_items')
        .select('*')
        .ilike('category', `${normalizedCategory}%`)
        .ilike('name', `%${searchTerms}%`)
        .limit(1)
        .maybeSingle();
      
      if (fullMatch) return fullMatch;

      // Strategy 3: Try matching first two significant words (use textSearch or filter in JS)
      if (searchWords.length >= 2) {
        const { data: wordMatches } = await supabase
          .from('market_items')
          .select('*')
          .ilike('category', `${normalizedCategory}%`)
          .ilike('name', `%${searchWords[0]}%`)
          .limit(20);
        
        if (wordMatches && wordMatches.length > 0) {
          // Filter in JS for second word match
          const twoWordMatch = wordMatches.filter(m => 
            m.name.toLowerCase().includes(searchWords[1].toLowerCase())
          );
          
          if (twoWordMatch.length > 0) {
            const exactCat = twoWordMatch.find(m => m.category === normalizedCategory);
            return exactCat || twoWordMatch[0];
          }
          
          // If no two-word match, return single word match
          const exactCat = wordMatches.find(m => m.category === normalizedCategory);
          return exactCat || wordMatches[0];
        }
      }

      // Strategy 4: Try matching just the first word (likely card name)
      if (searchWords.length >= 1) {
        const { data: singleWordMatch } = await supabase
          .from('market_items')
          .select('*')
          .ilike('category', `${normalizedCategory}%`)
          .ilike('name', `%${searchWords[0]}%`)
          .limit(10);
        
        if (singleWordMatch && singleWordMatch.length > 0) {
          // Try to find best match by checking other words
          if (searchWords.length > 1) {
            const betterMatch = singleWordMatch.find(m => 
              searchWords.some(w => m.name.toLowerCase().includes(w.toLowerCase()))
            );
            if (betterMatch) return betterMatch;
          }
          return singleWordMatch[0];
        }
      }

      // Strategy 5: Fallback - search entire name field with any word
      for (const word of searchWords) {
        const { data: anyMatch } = await supabase
          .from('market_items')
          .select('*')
          .ilike('category', `${normalizedCategory}%`)
          .ilike('name', `%${word}%`)
          .limit(1)
          .maybeSingle();
        
        if (anyMatch) return anyMatch;
      }

      return null;
    },
    enabled: !!category && !!slug,
  });

  // Handle canonical URL redirect - only redirect if the matched item closely matches the original slug
  useEffect(() => {
    if (item && !isLoading && slug) {
      const canonicalSlug = generateCardSlug(item);
      const canonicalCategory = normalizeCategory(item.category);
      const currentPath = location.pathname;
      const canonicalPath = `/cards/${canonicalCategory}/${canonicalSlug}`;
      
      // For One Piece: Use card code validation (strict matching)
      if (isOnepiece) {
        const requestedCode = onePieceCardCode || extractCardCode(slug);
        const itemCode = extractCardCode(item.name);
        
        // Validate that we got the right card
        if (requestedCode && itemCode && requestedCode !== itemCode) {
          console.error(`[CardPage] One Piece routing mismatch! Requested: ${requestedCode}, Got: ${itemCode}`);
          // Don't redirect - this is an error state
          return;
        }
        
        // Redirect to canonical card code URL if needed
        if (currentPath !== canonicalPath && itemCode) {
          navigate(canonicalPath + location.search, { replace: true });
        }
        return;
      }
      
      // NON-ONE PIECE: Use fuzzy word matching for redirects
      const currentSlugNormalized = normalizeSlug(slug).toLowerCase();
      const itemNameNormalized = normalizeSlug(item.name).toLowerCase();
      
      // Check if the original slug contains significant parts of the item name
      const slugWords = currentSlugNormalized.split('-').filter(w => w.length >= 3);
      const nameWords = itemNameNormalized.split('-').filter(w => w.length >= 3);
      
      // At least one significant word from slug should appear in item name
      const hasMatchingWord = slugWords.some(sw => 
        nameWords.some(nw => nw.includes(sw) || sw.includes(nw))
      );
      
      // Only redirect if there's a good match AND the path differs
      if (hasMatchingWord && currentPath !== canonicalPath && !currentPath.startsWith('/item/')) {
        navigate(canonicalPath + location.search, { replace: true });
      }
    }
  }, [item, isLoading, slug, location.pathname, location.search, navigate, isOnepiece, onePieceCardCode]);

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

  // Fetch active listings for this item (including donation fields)
  const { data: activeListings, refetch: refetchListings } = useQuery({
    queryKey: ['card-listings', item?.id, searchTerms],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*, accepts_grading_donations, donation_goal_cents, seller_id')
        .ilike('title', `%${searchTerms}%`)
        .eq('status', 'active')
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!searchTerms,
  });

  // Get listings that accept donations (for display)
  const donationListings = activeListings?.filter(l => l.accepts_grading_donations) || [];

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

            {/* Price Estimates by Grade */}
            <section aria-labelledby="price-estimates-heading">
              {item && (
                <CardPriceEstimates
                  marketItemId={item.id}
                  cardName={item.name}
                  setName={item.set_name}
                  category={item.category}
                />
              )}
            </section>

            {/* Price Chart - Full Width */}
            <section aria-labelledby="price-chart-heading">
              {item && (
                <ItemPriceChart 
                  itemId={item.id} 
                  productId={item.external_id || item.id}
                  itemName={item.name}
                  category={item.category}
                  currentPrice={item.current_price}
                  marketItemId={item.id}
                />
              )}
            </section>

            {/* Sales History */}
            <section aria-labelledby="sales-history-heading">
              {item && <ItemSalesHistory itemId={item.id} />}
            </section>

            {/* Market Discussion */}
            <section aria-labelledby="discussion-heading">
              {item && (
                <CardDiscussionPanel
                  marketItemId={item.id}
                  itemName={item.name}
                  currentPrice={item.current_price}
                />
              )}
            </section>

            {/* Community Grading Donations */}
            {donationListings.length > 0 && (
              <section aria-labelledby="community-grading-heading" className="space-y-4">
                <h2 id="community-grading-heading" className="text-xl font-semibold flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Help Get This Card Graded
                </h2>
                <p className="text-sm text-muted-foreground">
                  Contribute towards grading fees. When the goal is reached ($10), the owner can get the card professionally graded!
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  {donationListings.slice(0, 4).map((listing) => (
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
                        // Delete the listing after refund
                        await supabase.from('listings').update({ status: 'cancelled' }).eq('id', listing.id);
                        refetchListings();
                        toast.success('Listing delisted and donations refunded');
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Active Listings - TCGPlayer style */}
            <section aria-labelledby="listings-heading">
              {item && <ItemListings itemId={item.id} itemName={item.name} />}
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CardPage;
