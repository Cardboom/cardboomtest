import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  TrendingUp, TrendingDown, Trophy, Star, Share2, Copy,
  Loader2, ExternalLink, Twitter, Instagram, MessageCircle, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { FollowButton } from '@/components/FollowButton';
import { ProfileTrustReviews } from '@/components/profile/ProfileTrustReviews';

const PublicProfile = () => {
  const { username } = useParams();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });
  }, []);

  // Fetch profile by username or ID
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: async () => {
      // Try to find by display_name first, then by ID
      let { data, error } = await supabase
        .from('public_profiles')
        .select('*')
        .ilike('display_name', username || '')
        .maybeSingle();

      if (!data && username) {
        // Try by ID
        const { data: byId, error: idError } = await supabase
          .from('public_profiles')
          .select('*')
          .eq('id', username)
          .maybeSingle();
        
        if (byId) data = byId;
      }

      if (error) throw error;
      return data;
    },
    enabled: !!username,
  });

  // Fetch portfolio summary
  const { data: portfolioStats } = useQuery({
    queryKey: ['public-portfolio-stats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const { data: items, error } = await supabase
        .from('portfolio_items')
        .select(`
          id,
          purchase_price,
          quantity,
          market_item_id,
          market_items (current_price, change_24h)
        `)
        .eq('user_id', profile.id);

      if (error) throw error;

      const totalValue = items?.reduce((sum, item) => {
        const price = (item.market_items as any)?.current_price || item.purchase_price || 0;
        return sum + (price * (item.quantity || 1));
      }, 0) || 0;

      const totalCost = items?.reduce((sum, item) => {
        return sum + ((item.purchase_price || 0) * (item.quantity || 1));
      }, 0) || 0;

      const pnl = totalValue - totalCost;
      const pnlPercent = totalCost > 0 ? ((pnl / totalCost) * 100) : 0;

      return {
        totalItems: items?.length || 0,
        totalValue,
        pnl,
        pnlPercent,
      };
    },
    enabled: !!profile?.id,
  });

  // Fetch top cards (showcase items)
  const { data: topCards } = useQuery({
    queryKey: ['public-top-cards', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('portfolio_items')
        .select(`
          id,
          custom_name,
          grade,
          market_items (id, name, image_url, current_price, category)
        `)
        .eq('user_id', profile.id)
        .order('purchase_price', { ascending: false })
        .limit(6);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch follower count
  const { data: followerCount } = useQuery({
    queryKey: ['follower-count', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { count } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', profile.id);
      return count || 0;
    },
    enabled: !!profile?.id,
  });

  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
  };

  const shareProfile = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${profile?.display_name}'s Portfolio | CardBoom`,
          text: `Check out ${profile?.display_name}'s collectibles portfolio on CardBoom`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Profile link copied!');
      }
    } catch (error) {
      // User cancelled share
    }
  };

  const shareToTwitter = () => {
    const text = `Check out my collectibles portfolio on @cardboom! 📈 Portfolio Value: ${formatValue(portfolioStats?.totalValue || 0)}`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">User Not Found</h1>
          <p className="text-muted-foreground mb-8">This profile doesn't exist or is private.</p>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const pageTitle = `${profile.display_name}'s Portfolio | CardBoom`;
  const pageDescription = `View ${profile.display_name}'s collectibles portfolio. ${portfolioStats?.totalItems || 0} items worth ${formatValue(portfolioStats?.totalValue || 0)}.`;
  const canonicalUrl = `https://cardboom.com/u/${profile.display_name || profile.id}`;

  const badges = (profile.badges as any[]) || [];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="profile" />
        {profile.avatar_url && <meta property="og:image" content={profile.avatar_url} />}
      </Helmet>

      <Header cartCount={0} onCartClick={() => {}} />

      <main className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div 
          className="rounded-2xl p-8 mb-8 relative overflow-hidden"
          style={{ 
            background: profile.profile_background || 'linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--accent)/0.2))' 
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-4xl font-bold bg-primary text-primary-foreground">
                {(profile.display_name || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="text-center md:text-left flex-1">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                <h1 className="font-display text-3xl font-bold text-foreground">
                  {profile.display_name || 'Collector'}
                </h1>
                {profile.is_id_verified && (
                  <Badge className="bg-primary">Verified</Badge>
                )}
              </div>
              
              {profile.title && (
                <p className="text-primary font-medium mb-2">{profile.title}</p>
              )}
              
              {profile.bio && (
                <p className="text-muted-foreground max-w-lg mb-4">{profile.bio}</p>
              )}

              {/* Badges */}
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                  {badges.slice(0, 5).map((badge: any, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {badge.icon} {badge.name}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 justify-center md:justify-start text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-gold" />
                  Level {profile.level || 1}
                </span>
                <span>{followerCount} followers</span>
                {(profile.trust_review_count || 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <Shield className="w-4 h-4 text-primary" />
                    {(profile.trust_rating || 0).toFixed(1)} trust ({profile.trust_review_count} reviews)
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {currentUser && currentUser.id !== profile.id && (
                <FollowButton userId={profile.id} />
              )}
              <Button variant="outline" size="sm" onClick={shareProfile} className="gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button variant="ghost" size="sm" onClick={shareToTwitter} className="gap-2">
                <Twitter className="w-4 h-4" />
                Tweet
              </Button>
            </div>
          </div>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass">
            <CardContent className="p-6 text-center">
              <Trophy className="w-6 h-6 mx-auto mb-2 text-gold" />
              <p className="text-3xl font-bold font-display">{portfolioStats?.totalItems || 0}</p>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold font-display">
                {formatValue(portfolioStats?.totalValue || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Portfolio Value</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-6 text-center">
              <div className={cn(
                "w-6 h-6 mx-auto mb-2",
                (portfolioStats?.pnl || 0) >= 0 ? "text-gain" : "text-loss"
              )}>
                {(portfolioStats?.pnl || 0) >= 0 ? <TrendingUp /> : <TrendingDown />}
              </div>
              <p className={cn(
                "text-3xl font-bold font-display",
                (portfolioStats?.pnl || 0) >= 0 ? "text-gain" : "text-loss"
              )}>
                {(portfolioStats?.pnl || 0) >= 0 ? '+' : ''}{formatValue(portfolioStats?.pnl || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total P&L</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-6 text-center">
              <Star className="w-6 h-6 mx-auto mb-2 text-accent" />
              <p className={cn(
                "text-3xl font-bold font-display",
                (portfolioStats?.pnlPercent || 0) >= 0 ? "text-gain" : "text-loss"
              )}>
                {(portfolioStats?.pnlPercent || 0) >= 0 ? '+' : ''}{(portfolioStats?.pnlPercent || 0).toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Growth</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Cards */}
        {topCards && topCards.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-gold" />
              Top Collection Items
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {topCards.map((item) => {
                const marketItem = item.market_items as any;
                return (
                  <Card key={item.id} className="glass overflow-hidden group hover:border-primary/30 transition-colors">
                    <div className="aspect-square relative">
                      <img
                        src={marketItem?.image_url || '/placeholder.svg'}
                        alt={marketItem?.name || item.custom_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {item.grade && (
                        <Badge className="absolute top-2 right-2 text-xs">
                          {item.grade.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <p className="font-semibold text-sm truncate">
                        {marketItem?.name || item.custom_name}
                      </p>
                      {marketItem?.current_price && (
                        <p className="text-primary font-bold">
                          ${marketItem.current_price.toLocaleString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Trust & Reviews Section */}
        <div className="mb-8">
          <ProfileTrustReviews
            profileId={profile.id}
            trustRating={profile.trust_rating || 0}
            reviewCount={profile.trust_review_count || 0}
            currentUserId={currentUser?.id}
          />
        </div>

        {/* CTA for non-users */}
        {!currentUser && (
          <Card className="glass border-primary/30 bg-primary/5">
            <CardContent className="p-8 text-center">
              <Trophy className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="font-display text-2xl font-bold mb-2">
                Start Building Your Portfolio
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Track your collection, see real-time valuations, and share your portfolio with the community.
              </p>
              <Button asChild size="lg">
                <Link to="/auth">Get Started Free</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default PublicProfile;