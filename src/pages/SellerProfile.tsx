import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { getCategoryLabel } from '@/lib/categoryLabels';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Star, TrendingUp, Package, Clock, Shield, Award,
  Share2, MessageCircle, UserPlus, CheckCircle, Copy,
  BarChart3, Calendar, DollarSign, Flame
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { FollowButton } from '@/components/FollowButton';

interface SellerStats {
  totalSales: number;
  totalVolume: number;
  avgResponseTime: string;
  rating: number;
  reviewCount: number;
  completionRate: number;
  joinDate: string;
  weeklyHighlight: string;
}

interface SellerListing {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  category: string;
  condition: string;
  created_at: string;
}

const SellerProfile = () => {
  const { sellerId } = useParams();
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<any>(null);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);

  useEffect(() => {
    if (sellerId) {
      fetchSellerData();
    }
  }, [sellerId]);

  const fetchSellerData = async () => {
    try {
      // Fetch seller profile from public view (excludes PII)
      const { data: profile, error: profileError } = await supabase
        .from('public_profiles')
        .select('*')
        .eq('id', sellerId)
        .single();

      if (profileError) throw profileError;
      setSeller(profile);

      // Fetch seller's active listings
      const { data: sellerListings } = await supabase
        .from('listings')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(12);

      setListings(sellerListings || []);

      // Fetch seller's completed orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('status', 'completed');

      // Fetch reviews
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_id', sellerId)
        .eq('review_type', 'buyer_to_seller');

      const totalSales = orders?.length || 0;
      const totalVolume = orders?.reduce((sum, o) => sum + o.price, 0) || 0;
      const avgRating = reviews?.length 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
        : 0;

      // Generate weekly highlight
      const thisWeekSales = orders?.filter(o => {
        const orderDate = new Date(o.created_at);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return orderDate > weekAgo;
      }).length || 0;

      setStats({
        totalSales,
        totalVolume,
        avgResponseTime: '< 2 hours',
        rating: avgRating,
        reviewCount: reviews?.length || 0,
        completionRate: 98,
        joinDate: profile?.created_at || new Date().toISOString(),
        weeklyHighlight: thisWeekSales > 0 
          ? `Sold ${thisWeekSales} items this week!`
          : 'Active seller'
      });

      // Mock recent sales for display
      setRecentSales(orders?.slice(0, 5) || []);

    } catch (error) {
      console.error('Error fetching seller data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Profile link copied!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getTrustLevel = (rating: number) => {
    if (rating >= 4.8) return { level: 'Elite', color: 'text-yellow-500', bg: 'bg-yellow-500/20' };
    if (rating >= 4.5) return { level: 'Trusted', color: 'text-gain', bg: 'bg-gain/20' };
    if (rating >= 4.0) return { level: 'Verified', color: 'text-primary', bg: 'bg-primary/20' };
    return { level: 'New', color: 'text-muted-foreground', bg: 'bg-muted' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-48 bg-muted rounded-xl" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Seller not found</h1>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const trust = getTrustLevel(stats?.rating || 0);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{seller.display_name || 'Seller'} - CardBoom Seller Profile</title>
        <meta name="description" content={`Shop from ${seller.display_name} on CardBoom. ${stats?.totalSales} sales, ${stats?.rating?.toFixed(1)} rating.`} />
      </Helmet>

      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} onRemoveItem={() => {}} />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-2xl" />
          <Card className="border-0 bg-transparent">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <Avatar className="h-32 w-32 border-4 border-primary/30">
                  <AvatarImage src={seller.avatar_url} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-primary/60">
                    {seller.display_name?.charAt(0)?.toUpperCase() || 'S'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold">{seller.display_name || 'Seller'}</h1>
                        <Badge className={`${trust.bg} ${trust.color} border-0`}>
                          <Shield className="h-3 w-3 mr-1" />
                          {trust.level} Seller
                        </Badge>
                        {seller.is_beta_tester && (
                          <Badge variant="secondary">Beta Tester</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1">
                        Member since {new Date(seller.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={handleShare}>
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <FollowButton userId={sellerId!} variant="default" />
                    </div>
                  </div>

                  {seller.bio && (
                    <p className="text-muted-foreground max-w-2xl">{seller.bio}</p>
                  )}

                  {/* Weekly Highlight */}
                  {stats?.weeklyHighlight && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
                      <Flame className="h-4 w-4" />
                      <span className="text-sm font-medium">{stats.weeklyHighlight}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">{stats?.rating?.toFixed(1) || '0.0'}</p>
              <p className="text-sm text-muted-foreground">{stats?.reviewCount || 0} reviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats?.totalSales || 0}</p>
              <p className="text-sm text-muted-foreground">Total Sales</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-6 w-6 mx-auto mb-2 text-gain" />
              <p className="text-2xl font-bold">{formatPrice(stats?.totalVolume || 0)}</p>
              <p className="text-sm text-muted-foreground">Volume</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">{stats?.avgResponseTime}</p>
              <p className="text-sm text-muted-foreground">Response Time</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Seller Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completion Rate</span>
                <span className="font-medium">{stats?.completionRate}%</span>
              </div>
              <Progress value={stats?.completionRate || 0} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Buyer Satisfaction</span>
                <span className="font-medium">{((stats?.rating || 0) / 5 * 100).toFixed(0)}%</span>
              </div>
              <Progress value={((stats?.rating || 0) / 5) * 100} className="[&>div]:bg-yellow-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Response Rate</span>
                <span className="font-medium">95%</span>
              </div>
              <Progress value={95} className="[&>div]:bg-gain" />
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Listings & Activity */}
        <Tabs defaultValue="listings">
          <TabsList>
            <TabsTrigger value="listings">Active Listings ({listings.length})</TabsTrigger>
            <TabsTrigger value="recent">Recent Sales</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="mt-6">
            {listings.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {listings.map((listing, index) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link to={`/listing/${listing.id}`}>
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
                        <div className="aspect-square bg-secondary/30 p-4">
                          <img
                            src={listing.image_url || '/placeholder.svg'}
                            alt={listing.title}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-medium line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                            {listing.title}
                          </h3>
                          <p className="text-lg font-bold">{formatPrice(listing.price)}</p>
                          <Badge variant="secondary" className="mt-2">
                            {getCategoryLabel(listing.category)}
                          </Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No active listings</h3>
                <p className="text-muted-foreground">This seller hasn't listed any items yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            {recentSales.length > 0 ? (
              <div className="space-y-3">
                {recentSales.map((sale, index) => (
                  <Card key={sale.id}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-gain/20 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-gain" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Sale completed</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(sale.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="font-bold text-gain">{formatPrice(sale.price)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No recent sales</h3>
                <p className="text-muted-foreground">Check back later for activity</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Shareable Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Share This Seller</h3>
                <p className="text-sm text-muted-foreground">
                  Help others discover great sellers
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleShare}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button onClick={() => {
                  const text = `Check out ${seller.display_name} on CardBoom! ⭐ ${stats?.rating?.toFixed(1)} rating • ${stats?.totalSales} sales`;
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
                }}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Tweet
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default SellerProfile;
