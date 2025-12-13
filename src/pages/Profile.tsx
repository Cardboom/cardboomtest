import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileShowcase } from '@/components/profile/ProfileShowcase';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, Package, Star, Clock, ShoppingBag, MessageSquare, Heart, Eye, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCurrency } from '@/contexts/CurrencyContext';

const Profile = () => {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const { profile, backgrounds, unlockedBackgrounds, loading, updateProfile, unlockBackground } = useProfile(userId);

  // Fetch user reviews
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

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  const isOwnProfile = !userId || userId === currentUserId;

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

        <Tabs defaultValue="showcase" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="showcase" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden md:inline">Showcase</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden md:inline">Stats</span>
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

          <TabsContent value="showcase">
            <ProfileShowcase
              userId={profile.id}
              showcaseItems={profile.showcase_items}
              isOwnProfile={isOwnProfile}
              onUpdateShowcase={handleUpdateShowcase}
            />
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
                  <span className="text-green-400">✓</span>
                  <strong>2x XP Bonus</strong> - Earn double XP on all actions
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>Beta Tester Badge</strong> - Exclusive profile badge
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>Early Access</strong> - First access to new features
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
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
