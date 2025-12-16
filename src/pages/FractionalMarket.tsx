import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Search, PieChart, Users, Shield, TrendingUp, 
  Clock, Filter, ArrowUpDown, ShoppingCart, Layers, Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { FractionalBuyDialog } from '@/components/fractional/FractionalBuyDialog';
import { SellSharesDialog } from '@/components/fractional/SellSharesDialog';
import { BuyShareListingDialog } from '@/components/fractional/BuyShareListingDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FractionalListing = {
  id: string;
  share_price: number;
  total_shares: number;
  available_shares: number;
  min_shares: number;
  status: string;
  daily_verification_required: boolean;
  last_verified_at: string | null;
  owner_id: string;
  created_at: string;
  listing?: {
    title: string;
    image_url: string | null;
    price: number;
    category: string;
  } | null;
  market_item?: {
    name: string;
    image_url: string | null;
    current_price: number;
    category: string;
  } | null;
};

const FractionalMarket = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // Fetch all active fractional listings
  const { data: fractionalListings, isLoading } = useQuery({
    queryKey: ['fractional-market', sortBy, filterCategory],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fractional_listings')
        .select(`
          *,
          listing:listings(title, image_url, price, category),
          market_item:market_items(name, image_url, current_price, category)
        `)
        .eq('status', 'active')
        .gt('available_shares', 0);

      if (error) throw error;
      return data as FractionalListing[];
    },
  });

  // Fetch user's fractional holdings
  const { data: myHoldings } = useQuery({
    queryKey: ['my-fractional-holdings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('fractional_ownership')
        .select(`
          *,
          fractional_listing:fractional_listings(
            *,
            listing:listings(title, image_url, price),
            market_item:market_items(name, image_url, current_price)
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch secondary market listings
  const { data: secondaryListings, isLoading: isLoadingSecondary } = useQuery({
    queryKey: ['secondary-market'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fractional_share_listings')
        .select(`
          *,
          fractional_listing:fractional_listings(
            *,
            listing:listings(title, image_url, price, category),
            market_item:market_items(name, image_url, current_price, category)
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Calculate stats
  const totalListings = fractionalListings?.length || 0;
  const totalVolume = fractionalListings?.reduce((sum, l) => 
    sum + (l.total_shares - l.available_shares) * l.share_price, 0
  ) || 0;
  const myTotalInvested = myHoldings?.reduce((sum, h) => sum + h.total_invested, 0) || 0;

  // Filter and sort listings
  const filteredListings = fractionalListings?.filter(listing => {
    const name = listing.listing?.title || listing.market_item?.name || '';
    const category = listing.listing?.category || listing.market_item?.category || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || category.toLowerCase() === filterCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.share_price - b.share_price;
      case 'price-high':
        return b.share_price - a.share_price;
      case 'popular':
        return (b.total_shares - b.available_shares) - (a.total_shares - a.available_shares);
      default: // newest
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  }) || [];

  const categories = ['all', 'pokemon', 'sports', 'tcg', 'art', 'gaming'];

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={cartItems.length} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
              <PieChart className="h-8 w-8 text-primary" />
              Fractional Market
            </h1>
            <p className="text-muted-foreground">Buy and trade fractional shares of premium collectibles</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalListings}</p>
                  <p className="text-xs text-muted-foreground">Active Listings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gain/10">
                  <TrendingUp className="h-5 w-5 text-gain" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatPrice(totalVolume)}</p>
                  <p className="text-xs text-muted-foreground">Total Volume</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <Users className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{myHoldings?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">My Holdings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <PieChart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatPrice(myTotalInvested)}</p>
                  <p className="text-xs text-muted-foreground">My Invested</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="marketplace" className="space-y-6">
          <TabsList className="glass">
            <TabsTrigger value="marketplace" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Primary Market
            </TabsTrigger>
            <TabsTrigger value="secondary" className="gap-2">
              <Tag className="h-4 w-4" />
              Secondary Market
              {secondaryListings && secondaryListings.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {secondaryListings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="holdings" className="gap-2">
              <PieChart className="h-4 w-4" />
              My Holdings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search fractional listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Listings Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-40 w-full mb-4 rounded-lg" />
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-12">
                <PieChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No fractional listings found</h3>
                <p className="text-muted-foreground">Check back later for new opportunities</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredListings.map((listing) => {
                  const name = listing.listing?.title || listing.market_item?.name || 'Unknown Item';
                  const image = listing.listing?.image_url || listing.market_item?.image_url || '/placeholder.svg';
                  const soldShares = listing.total_shares - listing.available_shares;
                  const soldPercent = (soldShares / listing.total_shares) * 100;
                  const isVerificationOverdue = listing.daily_verification_required && 
                    listing.last_verified_at &&
                    new Date().getTime() - new Date(listing.last_verified_at).getTime() > 24 * 60 * 60 * 1000;

                  return (
                    <Card key={listing.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                      <div className="relative h-40 bg-secondary">
                        <img 
                          src={image} 
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                          {listing.daily_verification_required && (
                            <Badge 
                              variant={isVerificationOverdue ? "destructive" : "secondary"} 
                              className="gap-1"
                            >
                              <Shield className="h-3 w-3" />
                              {isVerificationOverdue ? "Overdue" : "Verified"}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-4 space-y-4">
                        <div>
                          <h3 className="font-semibold text-foreground truncate">{name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {listing.listing?.category || listing.market_item?.category}
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-lg font-bold">{formatPrice(listing.share_price)}</p>
                            <p className="text-xs text-muted-foreground">Per Share</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold">{listing.available_shares}</p>
                            <p className="text-xs text-muted-foreground">Available</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold">{listing.min_shares}</p>
                            <p className="text-xs text-muted-foreground">Min Buy</p>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Funding</span>
                            <span className="font-medium">{soldPercent.toFixed(0)}%</span>
                          </div>
                          <Progress value={soldPercent} className="h-2" />
                        </div>

                        {/* Total Value */}
                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <span className="text-sm text-muted-foreground">Total Value</span>
                          <span className="font-bold text-primary">
                            {formatPrice(listing.share_price * listing.total_shares)}
                          </span>
                        </div>

                        <FractionalBuyDialog fractionalListing={listing} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Secondary Market Tab */}
          <TabsContent value="secondary" className="space-y-4">
            {isLoadingSecondary ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-32 w-full mb-4 rounded-lg" />
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !secondaryListings || secondaryListings.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No shares listed for sale</h3>
                <p className="text-muted-foreground">Check back later or list your own shares</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {secondaryListings.map((listing) => {
                  const fl = listing.fractional_listing;
                  const name = fl?.listing?.title || fl?.market_item?.name || 'Unknown Item';
                  const image = fl?.listing?.image_url || fl?.market_item?.image_url || '/placeholder.svg';
                  const category = fl?.listing?.category || fl?.market_item?.category || '';
                  const isMine = user?.id === listing.seller_id;

                  return (
                    <Card key={listing.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                      <div className="relative h-32 bg-secondary">
                        <img 
                          src={image} 
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                        <Badge className="absolute top-2 right-2 gap-1">
                          <Tag className="h-3 w-3" />
                          {listing.shares_for_sale} shares
                        </Badge>
                        {isMine && (
                          <Badge variant="secondary" className="absolute top-2 left-2">
                            Your Listing
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <h3 className="font-semibold text-foreground truncate">{name}</h3>
                          <p className="text-sm text-muted-foreground">{category}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Price/Share</p>
                            <p className="text-lg font-bold">{formatPrice(listing.price_per_share)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Value</p>
                            <p className="text-lg font-bold text-primary">
                              {formatPrice(listing.shares_for_sale * listing.price_per_share)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Listed {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
                        </div>

                        {!isMine && (
                          <BuyShareListingDialog listing={listing} />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            {!user ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sign in to view your holdings</h3>
                <p className="text-muted-foreground mb-4">Track your fractional investments</p>
                <Button onClick={() => navigate('/auth')}>Sign In</Button>
              </div>
            ) : myHoldings?.length === 0 ? (
              <div className="text-center py-12">
                <PieChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No holdings yet</h3>
                <p className="text-muted-foreground">Start investing in fractional shares above</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myHoldings?.map((holding) => {
                  const fl = holding.fractional_listing;
                  const name = fl?.listing?.title || fl?.market_item?.name || 'Unknown Item';
                  const image = fl?.listing?.image_url || fl?.market_item?.image_url || '/placeholder.svg';
                  const currentValue = holding.shares_owned * (fl?.share_price || 0);
                  const pnl = currentValue - holding.total_invested;
                  const pnlPercent = (pnl / holding.total_invested) * 100;

                  return (
                    <Card key={holding.id} className="overflow-hidden">
                      <div className="relative h-32 bg-secondary">
                        <img 
                          src={image} 
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                        <Badge className="absolute top-2 right-2 gap-1">
                          <PieChart className="h-3 w-3" />
                          {holding.shares_owned} shares
                        </Badge>
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <h3 className="font-semibold text-foreground truncate">{name}</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Invested</p>
                            <p className="font-semibold">{formatPrice(holding.total_invested)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Current Value</p>
                            <p className="font-semibold">{formatPrice(currentValue)}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <span className="text-sm text-muted-foreground">P/L</span>
                          <span className={cn(
                            "font-bold",
                            pnl >= 0 ? "text-gain" : "text-loss"
                          )}>
                            {pnl >= 0 ? '+' : ''}{formatPrice(pnl)} ({pnlPercent.toFixed(1)}%)
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Purchased {formatDistanceToNow(new Date(holding.purchased_at), { addSuffix: true })}
                        </div>

                        <SellSharesDialog holding={holding} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default FractionalMarket;
