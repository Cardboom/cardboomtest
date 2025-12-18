import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  BadgeCheck, Users, Target, TrendingUp, TrendingDown, 
  Eye, Calendar, ExternalLink, Share2, Clock, BarChart3,
  Bookmark, AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { MarketCallCard } from '@/components/creator/MarketCallCard';
import { CreatorWatchlistCard } from '@/components/creator/CreatorWatchlistCard';
import { FollowCreatorButton } from '@/components/creator/FollowCreatorButton';
import { ShareCreatorDialog } from '@/components/creator/ShareCreatorDialog';
import { cn } from '@/lib/utils';

const CreatorPage = () => {
  const { username } = useParams<{ username: string }>();
  const [cartCount] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);

  // Fetch creator profile by username
  const { data: creator, isLoading: creatorLoading, error } = useQuery({
    queryKey: ['creator-public', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('username', username)
        .eq('is_public', true)
        .single();

      if (error) throw error;
      
      // Fetch user profile separately
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('avatar_url, display_name')
        .eq('id', data.user_id)
        .single();
      
      return { ...data, userProfile };
    },
    enabled: !!username
  });

  // Fetch market calls
  const { data: marketCalls } = useQuery({
    queryKey: ['creator-calls', creator?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_market_calls')
        .select(`
          *,
          market_item:market_items (
            id, name, current_price, change_24h, image_url, category, liquidity
          )
        `)
        .eq('creator_id', creator!.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!creator?.id
  });

  // Fetch watchlists
  const { data: watchlists } = useQuery({
    queryKey: ['creator-watchlists', creator?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_watchlists')
        .select(`
          *,
          items:creator_watchlist_items (
            id,
            market_item:market_items (
              id, name, current_price, change_24h, image_url
            ),
            price_when_added,
            added_at,
            is_active
          )
        `)
        .eq('creator_id', creator!.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!creator?.id
  });

  // Fetch follower count
  const { data: followerCount } = useQuery({
    queryKey: ['creator-followers-count', creator?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('creator_followers')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creator!.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!creator?.id
  });

  // Calculate accuracy stats
  const accuracyStats = marketCalls ? {
    total: marketCalls.length,
    accurate: marketCalls.filter(c => 
      (c.call_type === 'buy' && (c.price_change_percent || 0) > 10) ||
      (c.call_type === 'sell' && (c.price_change_percent || 0) < -10)
    ).length,
    rate: marketCalls.length > 0 
      ? Math.round((marketCalls.filter(c => 
          (c.call_type === 'buy' && (c.price_change_percent || 0) > 10) ||
          (c.call_type === 'sell' && (c.price_change_percent || 0) < -10)
        ).length / marketCalls.length) * 100)
      : 0
  } : { total: 0, accurate: 0, rate: 0 };

  if (creatorLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        <main className="container mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Creator Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The creator @{username} doesn't exist or their profile is private.
          </p>
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </main>
      </div>
    );
  }

  const platformIcons: Record<string, string> = {
    youtube: '🎬',
    twitch: '🎮',
    twitter: '𝕏',
    tiktok: '🎵',
    instagram: '📸',
    other: '🌐'
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{creator.creator_name} (@{username}) | CardBoom Creator</title>
        <meta name="description" content={`${creator.creator_name}'s market calls and watchlists on CardBoom. Track record: ${accuracyStats.rate}% accuracy over ${accuracyStats.total} calls.`} />
        <meta property="og:title" content={`${creator.creator_name} (@{username}) | CardBoom Creator`} />
        <meta property="og:description" content={creator.bio || `Follow ${creator.creator_name}'s TCG market insights`} />
        <link rel="canonical" href={`https://cardboom.app/@${username}`} />
      </Helmet>

      <Header cartCount={cartCount} onCartClick={() => {}} />

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Creator Header */}
        <Card className="mb-6 overflow-hidden">
          {/* Cover Image */}
          <div className="h-32 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20" />
          
          <CardContent className="pt-0 relative">
            {/* Avatar */}
            <div className="absolute -top-12 left-6">
              <Avatar className="h-24 w-24 border-4 border-background">
                <AvatarImage src={creator.avatar_url || creator.userProfile?.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {creator.creator_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
              <FollowCreatorButton creatorId={creator.id} />
            </div>

            {/* Info */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">{creator.creator_name}</h1>
                {creator.is_verified && (
                  <BadgeCheck className="h-6 w-6 text-primary fill-primary/20" />
                )}
              </div>
              <p className="text-muted-foreground mb-2">@{username}</p>
              
              {creator.bio && (
                <p className="text-foreground/80 mb-4">{creator.bio}</p>
              )}

              {/* Platform & Stats */}
              <div className="flex flex-wrap gap-4 text-sm">
                {creator.platform && (
                  <div className="flex items-center gap-1">
                    <span>{platformIcons[creator.platform] || '🌐'}</span>
                    <span className="capitalize">{creator.platform}</span>
                    {creator.platform_handle && (
                      <span className="text-muted-foreground">
                        {creator.platform_handle}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{followerCount?.toLocaleString() || 0} followers</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span>{accuracyStats.total} calls</span>
                </div>
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="font-medium text-primary">{accuracyStats.rate}% accuracy</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accuracy Banner */}
        {accuracyStats.total >= 5 && (
          <Card className="mb-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-semibold">Track Record</h3>
                  <p className="text-sm text-muted-foreground">
                    Based on {accuracyStats.total} public market calls
                  </p>
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{accuracyStats.rate}%</div>
                    <div className="text-xs text-muted-foreground">Accuracy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gain">{accuracyStats.accurate}</div>
                    <div className="text-xs text-muted-foreground">Accurate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{accuracyStats.total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Tabs */}
        <Tabs defaultValue="calls" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calls" className="gap-2">
              <Target className="h-4 w-4" />
              Market Calls ({marketCalls?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="watchlists" className="gap-2">
              <Bookmark className="h-4 w-4" />
              Watchlists ({watchlists?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Market Calls Tab */}
          <TabsContent value="calls" className="space-y-4">
            {marketCalls && marketCalls.length > 0 ? (
              marketCalls.map((call) => (
                <MarketCallCard key={call.id} call={call} creatorUsername={username!} />
              ))
            ) : (
              <Card className="py-12 text-center">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No public market calls yet</p>
              </Card>
            )}
          </TabsContent>

          {/* Watchlists Tab */}
          <TabsContent value="watchlists" className="space-y-4">
            {watchlists && watchlists.length > 0 ? (
              watchlists.map((watchlist) => (
                <CreatorWatchlistCard 
                  key={watchlist.id} 
                  watchlist={watchlist} 
                  creatorUsername={username!}
                />
              ))
            ) : (
              <Card className="py-12 text-center">
                <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No public watchlists yet</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />

      <ShareCreatorDialog 
        open={shareOpen} 
        onOpenChange={setShareOpen}
        creator={creator}
        username={username!}
      />
    </div>
  );
};

export default CreatorPage;
