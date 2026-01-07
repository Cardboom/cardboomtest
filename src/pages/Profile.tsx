import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileShowcase } from '@/components/profile/ProfileShowcase';
import { ProfileCollectionStats } from '@/components/profile/ProfileCollectionStats';
import { FeaturedCardPreview } from '@/components/profile/FeaturedCardPreview';
import { FeaturedCardSelector } from '@/components/profile/FeaturedCardSelector';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, Package, Star, Clock, ShoppingBag, MessageSquare, Heart, Eye, ArrowUpRight, ArrowDownRight, Trophy, Store, Wallet, Award } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCurrency } from '@/contexts/CurrencyContext';
import { AchievementsShowcase } from '@/components/achievements/AchievementsShowcase';
import { AppRatingReward } from '@/components/rewards/AppRatingReward';

const Profile = () => {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [featuredSelectorOpen, setFeaturedSelectorOpen] = useState(false);
  const { profile, backgrounds, unlockedBackgrounds, loading, updateProfile, unlockBackground } = useProfile(userId);

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  const isOwnProfile = !userId || userId === currentUserId;

  const { data: reviews } = useQuery({
    queryKey: ['user-reviews', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles!reviews_reviewer_id_fkey(display_name, avatar_url)')
        .eq('reviewed_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch user activity
  const { data: activity } = useQuery({
    queryKey: ['user-activity', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('xp_history')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ['user-stats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const [ordersRes, listingsRes, reviewsRes] = await Promise.all([
        supabase.from('orders').select('price', { count: 'exact' }).or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`),
        supabase.from('listings').select('id', { count: 'exact' }).eq('seller_id', profile.id),
        supabase.from('reviews').select('rating').eq('reviewed_id', profile.id),
      ]);
      const totalVolume = ordersRes.data?.reduce((sum, o) => sum + Number(o.price), 0) || 0;
      const avgRating = reviewsRes.data?.length ? reviewsRes.data.reduce((sum, r) => sum + r.rating, 0) / reviewsRes.data.length : 0;
      return {
        totalOrders: ordersRes.count || 0,
        totalListings: listingsRes.count || 0,
        totalVolume,
        avgRating,
        reviewCount: reviewsRes.data?.length || 0,
      };
    },
    enabled: !!profile?.id,
  });

  // Fetch user's active listings
  const { data: userListings } = useQuery({
    queryKey: ['user-listings', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('seller_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch user's orders (bought and sold)
  const { data: userOrders } = useQuery({
    queryKey: ['user-orders', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return { bought: [], sold: [] };
      const [boughtRes, soldRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, listing:listings(*)')
          .eq('buyer_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('*, listing:listings(*)')
          .eq('seller_id', profile.id)
          .order('created_at', { ascending: false }),
      ]);
      return {
        bought: boughtRes.data || [],
        sold: soldRes.data || [],
      };
    },
    enabled: !!profile?.id,
  });

  // Fetch user's portfolio items and stats
  const { data: portfolioData, refetch: refetchPortfolio } = useQuery({
    queryKey: ['user-portfolio-full', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return { items: [], listings: [], stats: { totalItems: 0, totalValue: 0, totalCost: 0, pnl: 0, pnlPercent: 0 } };
      
      // Fetch portfolio items
      const { data: portfolioItems, error: portfolioError } = await supabase
        .from('portfolio_items')
        .select('*, market_item:market_items(*)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (portfolioError) throw portfolioError;
      
      // Also fetch card instances for complete count
      const { data: cardInstancesData, error: instancesError } = await supabase
        .from('card_instances')
        .select('id, current_value, acquisition_price')
        .eq('owner_user_id', profile.id)
        .eq('is_active', true);
      if (instancesError) throw instancesError;
      
      // Fetch active listings (cards listed for sale should show in portfolio)
      const { data: userListings, error: listingsError } = await supabase
        .from('listings')
        .select('id, title, image_url, price, category, condition, status, created_at')
        .eq('seller_id', profile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (listingsError) console.error('Error fetching listings:', listingsError);
      
      const items = portfolioItems || [];
      const instances = cardInstancesData || [];
      const listings = userListings || [];
      
      // Calculate totals from portfolio items
      const portfolioValue = items.reduce((sum, item) => {
        const price = item.market_item?.current_price || item.purchase_price || 0;
        return sum + (price * (item.quantity || 1));
      }, 0);
      const portfolioCost = items.reduce((sum, item) => {
        return sum + ((item.purchase_price || 0) * (item.quantity || 1));
      }, 0);
      
      // Add card instances values
      const instancesValue = instances.reduce((sum, inst) => sum + (inst.current_value || 0), 0);
      const instancesCost = instances.reduce((sum, inst) => sum + (inst.acquisition_price || 0), 0);
      
      // Add listings values (price is both current value and cost basis for listings)
      const listingsValue = listings.reduce((sum, listing) => sum + (listing.price || 0), 0);
      
      const totalValue = portfolioValue + instancesValue + listingsValue;
      const totalCost = portfolioCost + instancesCost + listingsValue; // Use listing price as cost basis
      const pnl = totalValue - totalCost;
      const pnlPercent = totalCost > 0 ? ((pnl / totalCost) * 100) : 0;
      
      return {
        items,
        listings,
        stats: {
          totalItems: items.length + instances.length + listings.length,
          totalValue,
          totalCost,
          pnl,
          pnlPercent,
        }
      };
    },
    enabled: !!profile?.id,
    refetchOnWindowFocus: true,
  });

  // Fetch user's card instances (graded cards and inventory)
  const { data: cardInstances } = useQuery({
    queryKey: ['user-card-instances', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('card_instances')
        .select('*')
        .eq('owner_user_id', profile.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch featured card data - check both portfolio_items and listings
  const { data: featuredCard } = useQuery({
    queryKey: ['featured-card', profile?.featured_card_id],
    queryFn: async () => {
      if (!profile?.featured_card_id) return null;
      
      // Try portfolio_items first
      const { data: portfolioData } = await supabase
        .from('portfolio_items')
        .select('id, custom_name, grade, image_url, market_items(id, name, image_url, current_price, category)')
        .eq('id', profile.featured_card_id)
        .maybeSingle();
      
      if (portfolioData) {
        const marketItem = portfolioData.market_items as any;
        return {
          id: portfolioData.id,
          name: portfolioData.custom_name || marketItem?.name || 'Unknown Card',
          image_url: portfolioData.image_url || marketItem?.image_url || '/placeholder.svg',
          grade: portfolioData.grade,
          current_price: marketItem?.current_price,
          category: marketItem?.category,
        };
      }
      
      // Try listings if not found in portfolio
      const { data: listingData } = await supabase
        .from('listings')
        .select('id, title, image_url, price, category')
        .eq('id', profile.featured_card_id)
        .maybeSingle();
      
      if (listingData) {
        return {
          id: listingData.id,
          name: listingData.title || 'Unknown Card',
          image_url: listingData.image_url || '/placeholder.svg',
          grade: null,
          current_price: listingData.price,
          category: listingData.category,
        };
      }
      
      return null;
    },
    enabled: !!profile?.featured_card_id,
  });

  const portfolioItems = portfolioData?.items || [];
  const portfolioStats = portfolioData?.stats || { totalItems: 0, totalValue: 0, pnl: 0, pnlPercent: 0 };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-64 bg-muted rounded-xl" />
            <div className="h-32 bg-muted rounded-xl" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-16 text-center">
              <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
              <p className="text-muted-foreground mb-6">
                {isOwnProfile 
                  ? 'Please sign in to view your profile.'
                  : 'This user profile does not exist.'}
              </p>
              {isOwnProfile && (
                <Button onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
              )}
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const handleUpdateShowcase = async (items: string[]) => {
    return await updateProfile({ showcase_items: items });
  };

  const handleUpdateFeaturedCard = async (cardId: string | null) => {
    return await updateProfile({ featured_card_id: cardId });
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{profile.display_name || 'Profile'} | CardBoom</title>
        <meta name="description" content={`View ${profile.display_name}'s collection and profile on CardBoom.`} />
      </Helmet>

      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} onRemoveItem={() => {}} />

      <main className="container mx-auto px-4 py-8 space-y-8">
        <ProfileHeader
          profile={profile}
          backgrounds={backgrounds}
          unlockedBackgrounds={unlockedBackgrounds}
          isOwnProfile={isOwnProfile}
          onUpdate={updateProfile}
          onUnlockBackground={unlockBackground}
        />

        {/* Collection Stats */}
        <ProfileCollectionStats
          totalItems={portfolioStats.totalItems}
          totalValue={portfolioStats.totalValue}
          pnl={portfolioStats.pnl}
          pnlPercent={portfolioStats.pnlPercent}
          showCollectionCount={profile.show_collection_count}
          showPortfolioValue={profile.show_portfolio_value}
          isOwnProfile={isOwnProfile}
        />

        {/* Featured Card + Showcase Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <FeaturedCardPreview
              card={featuredCard || null}
              isOwnProfile={isOwnProfile}
              onSelectCard={() => setFeaturedSelectorOpen(true)}
            />
          </div>
          <div className="md:col-span-2">
            <ProfileShowcase
              userId={profile.id}
              showcaseItems={profile.showcase_items}
              isOwnProfile={isOwnProfile}
              onUpdateShowcase={handleUpdateShowcase}
            />
          </div>
        </div>

        {/* Featured Card Selector Dialog */}
        {isOwnProfile && (
          <FeaturedCardSelector
            open={featuredSelectorOpen}
            onOpenChange={setFeaturedSelectorOpen}
            currentFeaturedId={profile.featured_card_id}
            userId={profile.id}
            onSelect={handleUpdateFeaturedCard}
          />
        )}

        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-7">
            <TabsTrigger value="listings" className="gap-2">
              <Store className="h-4 w-4" />
              <span className="hidden md:inline">Listings</span>
            </TabsTrigger>
            <TabsTrigger value="collection" className="gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden md:inline">Collection</span>
            </TabsTrigger>
            <TabsTrigger value="bought" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden md:inline">Bought</span>
            </TabsTrigger>
            <TabsTrigger value="sold" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden md:inline">Sold</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden md:inline">Achievements</span>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="h-4 w-4" />
              <span className="hidden md:inline">Reviews</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden md:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Active Listings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userListings && userListings.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userListings.map((listing: any) => (
                      <div 
                        key={listing.id} 
                        className="p-4 rounded-lg bg-muted/50 hover:bg-muted/70 cursor-pointer transition-colors"
                        onClick={() => navigate(`/listing/${listing.id}`)}
                      >
                        {listing.image_url && (
                          <img src={listing.image_url} alt={listing.title} className="w-full h-32 object-cover rounded-lg mb-3" />
                        )}
                        <h4 className="font-medium text-sm truncate">{listing.title}</h4>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-primary font-bold">{formatPrice(listing.price)}</span>
                          <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>
                            {listing.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground">No active listings</p>
                    {isOwnProfile && (
                      <Button variant="outline" className="mt-4" onClick={() => navigate('/sell')}>
                        Create Listing
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collection">
            {isOwnProfile ? (
              <div className="space-y-6">
                {/* Graded Cards Section */}
                {cardInstances && cardInstances.length > 0 && (
                  <Card className="border-primary/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        Graded Cards
                        <Badge variant="secondary" className="ml-2">{cardInstances.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {cardInstances.map((card: any) => (
                          <div 
                            key={card.id} 
                            className="group relative p-3 rounded-xl bg-gradient-to-b from-muted/50 to-muted/30 border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer"
                            onClick={() => card.source_grading_order_id && navigate(`/grading/orders/${card.source_grading_order_id}`)}
                          >
                            {/* Grade Badge */}
                            {card.grade && (
                              <div className="absolute -top-2 -right-2 z-10">
                                <div className="bg-gradient-to-r from-primary to-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                                  {card.grade}
                                </div>
                              </div>
                            )}
                            
                            {/* Card Image with CBI Graded overlay */}
                            <div className="aspect-[2.5/3.5] rounded-lg overflow-hidden bg-muted mb-3 relative">
                              {card.image_url ? (
                                <img 
                                  src={card.image_url} 
                                  alt={card.title} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Award className="w-8 h-8 text-muted-foreground/30" />
                                </div>
                              )}
                              {/* CBI Graded overlay badge */}
                              {card.grading_company === 'CardBoom' && (
                                <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-2">
                                  <div className="flex items-center gap-1.5">
                                    <Award className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-[10px] font-bold text-white/90 tracking-wider uppercase">CBI Graded</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Card Info */}
                            <h4 className="font-medium text-sm truncate">{card.title}</h4>
                            <div className="flex items-center justify-between mt-2">
                              <Badge variant="outline" className="text-xs">
                                {card.grading_company || 'CardBoom'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {card.condition}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Active Listings in Portfolio Section */}
                {portfolioData?.listings && portfolioData.listings.length > 0 && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Store className="h-5 w-5 text-primary" />
                        Listed for Sale
                        <Badge variant="secondary" className="ml-2">{portfolioData.listings.length}</Badge>
                        <Badge variant="outline" className="ml-1 text-xs">Included in Portfolio</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {portfolioData.listings.map((listing: any) => (
                          <div 
                            key={listing.id} 
                            className="p-4 rounded-lg bg-primary/5 border border-primary/20 hover:border-primary/40 cursor-pointer transition-colors relative"
                            onClick={() => navigate(`/listing/${listing.id}`)}
                          >
                            <Badge className="absolute top-2 right-2 text-xs bg-primary/90">For Sale</Badge>
                            {listing.image_url ? (
                              <img 
                                src={listing.image_url} 
                                alt={listing.title} 
                                className="w-full h-32 object-cover rounded-lg mb-3" 
                              />
                            ) : (
                              <div className="w-full h-32 bg-muted rounded-lg mb-3 flex items-center justify-center">
                                <Store className="w-8 h-8 text-muted-foreground/30" />
                              </div>
                            )}
                            <h4 className="font-medium text-sm truncate">{listing.title}</h4>
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-bold text-primary">
                                {formatPrice(listing.price)}
                              </span>
                              {listing.condition && (
                                <Badge variant="outline" className="text-xs">{listing.condition}</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Portfolio Items Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Portfolio Items
                      {portfolioItems && portfolioItems.length > 0 && (
                        <Badge variant="secondary" className="ml-2">{portfolioItems.length}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {portfolioItems && portfolioItems.length > 0 ? (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {portfolioItems.map((item: any) => (
                          <div 
                            key={item.id} 
                            className="p-4 rounded-lg bg-muted/50 hover:bg-muted/70 cursor-pointer transition-colors"
                            onClick={() => item.market_item_id && navigate(`/item/${item.market_item_id}`)}
                          >
                            {(item.image_url || item.market_item?.image_url) && (
                              <img 
                                src={item.image_url || item.market_item?.image_url} 
                                alt={item.custom_name || item.market_item?.name} 
                                className="w-full h-32 object-cover rounded-lg mb-3" 
                              />
                            )}
                            <h4 className="font-medium text-sm truncate">
                              {item.custom_name || item.market_item?.name || 'Unknown Item'}
                            </h4>
                            <div className="flex items-center justify-between mt-2">
                              {item.purchase_price && (
                                <span className="text-muted-foreground text-sm">
                                  Paid: {formatPrice(item.purchase_price)}
                                </span>
                              )}
                              {item.grade && (
                                <Badge variant="outline">{item.grade}</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (!cardInstances || cardInstances.length === 0) && (!portfolioData?.listings || portfolioData.listings.length === 0) ? (
                      <div className="text-center py-8">
                        <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground">No items in collection</p>
                        <div className="flex justify-center gap-3 mt-4">
                          <Button variant="outline" onClick={() => navigate('/markets')}>
                            Browse Markets
                          </Button>
                          <Button variant="outline" onClick={() => navigate('/grading/new')}>
                            Grade a Card
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">No portfolio items yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Collection is private</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bought">
            {isOwnProfile ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    Purchased Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userOrders?.bought && userOrders.bought.length > 0 ? (
                    <div className="space-y-3">
                      {userOrders.bought.map((order: any) => (
                        <div key={order.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                          {order.listing?.image_url && (
                            <img src={order.listing.image_url} alt={order.listing.title} className="w-16 h-16 object-cover rounded-lg" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{order.listing?.title || 'Unknown Item'}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">{formatPrice(order.price)}</p>
                            <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                      <p className="text-muted-foreground">No purchases yet</p>
                      <Button variant="outline" className="mt-4" onClick={() => navigate('/markets')}>
                        Start Shopping
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Purchase history is private</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sold">
            {isOwnProfile ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Sold Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userOrders?.sold && userOrders.sold.length > 0 ? (
                    <div className="space-y-3">
                      {userOrders.sold.map((order: any) => (
                        <div key={order.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                          {order.listing?.image_url && (
                            <img src={order.listing.image_url} alt={order.listing.title} className="w-16 h-16 object-cover rounded-lg" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{order.listing?.title || 'Unknown Item'}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gain">{formatPrice(order.price)}</p>
                            <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                      <p className="text-muted-foreground">No sales yet</p>
                      <Button variant="outline" className="mt-4" onClick={() => navigate('/sell')}>
                        Start Selling
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Sales history is private</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="achievements">
            <div className="space-y-6">
              {isOwnProfile && <AppRatingReward />}
              <AchievementsShowcase userId={profile.id} showAll />
            </div>
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Level</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{profile.level}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total XP</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{profile.xp.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Member Since</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-medium">
                    {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Badges</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{profile.badges.length + (profile.is_beta_tester ? 1 : 0)}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Reviews</span>
                  {userStats && userStats.reviewCount > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${star <= Math.round(userStats.avgRating) ? 'text-gold fill-gold' : 'text-muted'}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {userStats.avgRating.toFixed(1)} ({userStats.reviewCount} reviews)
                      </span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviews && reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review: any) => (
                      <div key={review.id} className="flex gap-4 p-4 rounded-lg bg-muted/50">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={review.reviewer?.avatar_url} />
                          <AvatarFallback>{review.reviewer?.display_name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{review.reviewer?.display_name || 'Anonymous'}</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${star <= review.rating ? 'text-gold fill-gold' : 'text-muted'}`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{review.comment || 'Great transaction!'}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground">No reviews yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isOwnProfile ? 'Complete transactions to receive reviews from other users.' : 'This user hasn\'t received any reviews yet.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {activity && activity.length > 0 ? (
                  <div className="space-y-3">
                    {activity.map((item: any) => {
                      const actionIcons: Record<string, any> = {
                        purchase: { icon: ShoppingBag, color: 'text-gain', label: 'Made a purchase' },
                        sale: { icon: TrendingUp, color: 'text-gain', label: 'Completed a sale' },
                        listing: { icon: Package, color: 'text-primary', label: 'Created a listing' },
                        referral: { icon: Heart, color: 'text-pink-500', label: 'Earned referral bonus' },
                        daily_login: { icon: Clock, color: 'text-gold', label: 'Daily login streak' },
                        review: { icon: Star, color: 'text-gold', label: 'Wrote a review' },
                        first_purchase: { icon: ShoppingBag, color: 'text-primary', label: 'First purchase!' },
                        streak_bonus: { icon: TrendingUp, color: 'text-gold', label: 'Streak bonus earned' },
                      };
                      const actionInfo = actionIcons[item.action] || { icon: Eye, color: 'text-muted-foreground', label: item.action };
                      const ActionIcon = actionInfo.icon;
                      
                      return (
                        <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className={`w-10 h-10 rounded-lg bg-background flex items-center justify-center ${actionInfo.color}`}>
                            <ActionIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{actionInfo.label}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="text-xs">+{item.xp_earned} XP</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground">No recent activity</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isOwnProfile ? 'Start trading to build your activity history!' : 'This user hasn\'t been active recently.'}
                    </p>
                    {isOwnProfile && (
                      <Button variant="outline" className="mt-4" onClick={() => navigate('/markets')}>
                        Explore Markets
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Early Access Benefits */}
        {profile.is_beta_tester && (
          <Card className="border-purple-500/50 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-400">
                🎉 Early Access Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <strong>2x XP Bonus</strong> - Earn double XP on all actions
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <strong>Beta Tester Badge</strong> - Exclusive profile badge
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <strong>Early Access</strong> - First access to new features
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <strong>Reduced Fees</strong> - Lower platform fees during beta
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />

      <style>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};

export default Profile;
