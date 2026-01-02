import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Store,
  Package,
  Star,
  Users,
  TrendingUp,
  Play,
  ShoppingCart,
  ExternalLink,
  Share2,
  Award,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SellerTrustScore } from '@/components/seller/SellerTrustScore';
import { FollowCreatorButton } from './FollowCreatorButton';
import { ShareCreatorDialog } from './ShareCreatorDialog';
import { CollectibleCard } from '@/components/CollectibleCard';
import { toast } from 'sonner';

interface CreatorStorefrontProps {
  slug?: string;
}

export const CreatorStorefront = ({ slug: propSlug }: CreatorStorefrontProps) => {
  const params = useParams();
  const slug = propSlug || params.slug;
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Fetch storefront data
  const { data: storefront, isLoading } = useQuery({
    queryKey: ['creator-storefront', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_storefronts')
        .select(`
          *,
          creator:creator_profiles!creator_storefronts_creator_id_fkey(
            id,
            creator_name,
            bio,
            avatar_url,
            platform,
            platform_handle,
            is_verified,
            accuracy_rate,
            total_calls,
            user_id
          )
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch creator's listings
  const { data: listings } = useQuery({
    queryKey: ['storefront-listings', storefront?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          market_item:market_items(id, name, image_url, current_price, category)
        `)
        .eq('seller_id', storefront!.user_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!storefront?.user_id,
  });

  // Fetch creator's reels/videos
  const { data: reels } = useQuery({
    queryKey: ['storefront-reels', storefront?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_reels')
        .select('*')
        .eq('user_id', storefront!.user_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data;
    },
    enabled: !!storefront?.user_id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!storefront) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Store Not Found</h3>
          <p className="text-muted-foreground">
            This creator storefront doesn't exist or is not active.
          </p>
        </CardContent>
      </Card>
    );
  }

  const creator = storefront.creator;

  return (
    <div className="space-y-6">
      {/* Banner & Profile */}
      <div className="relative">
        {/* Banner */}
        <div
          className="h-48 md:h-64 rounded-xl bg-gradient-to-r from-primary/20 to-purple-500/20"
          style={storefront.banner_url ? { 
            backgroundImage: `url(${storefront.banner_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {}}
        />

        {/* Profile Card */}
        <Card className="mx-4 -mt-16 relative z-10">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                <AvatarImage src={storefront.logo_url || creator?.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {storefront.display_name[0]}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold">{storefront.display_name}</h1>
                  {creator?.is_verified && (
                    <Badge className="bg-blue-500">
                      <Award className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                {storefront.tagline && (
                  <p className="text-muted-foreground mt-1">{storefront.tagline}</p>
                )}

                {/* Stats */}
                <div className="flex flex-wrap gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{listings?.length || 0}</span>
                    <span className="text-muted-foreground">Listings</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{storefront.total_sales || 0}</span>
                    <span className="text-muted-foreground">Sales</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{storefront.follower_count || 0}</span>
                    <span className="text-muted-foreground">Followers</span>
                  </div>
                  {creator?.accuracy_rate && creator.accuracy_rate > 0 && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-green-500">
                        {creator.accuracy_rate.toFixed(0)}%
                      </span>
                      <span className="text-muted-foreground">Accuracy</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {creator && (
                  <FollowCreatorButton creatorId={creator.id} />
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShareDialogOpen(true)}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Description */}
            {storefront.description && (
              <p className="text-muted-foreground mt-4 border-t pt-4">
                {storefront.description}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trust Score */}
      {storefront.user_id && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <SellerTrustScore sellerId={storefront.user_id} />
          </div>
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Social Links
              </h3>
              {creator?.platform && creator?.platform_handle && (
                <a
                  href={`https://${creator.platform}.com/${creator.platform_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  {creator.platform}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {storefront.social_links && Object.entries(storefront.social_links as Record<string, string>).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline capitalize"
                >
                  {platform}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for Listings & Videos */}
      <Tabs defaultValue="listings">
        <TabsList>
          <TabsTrigger value="listings" className="gap-2">
            <Package className="w-4 h-4" />
            Listings
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-2">
            <Play className="w-4 h-4" />
            Videos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-4">
          {listings && listings.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {listings.map((listing) => (
                <Link key={listing.id} to={`/listing/${listing.id}`}>
                  <Card className="hover:border-primary/50 transition-colors overflow-hidden">
                    <div className="aspect-square bg-muted relative">
                      {listing.image_url ? (
                        <img
                          src={listing.image_url}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <p className="font-medium truncate text-sm">{listing.title}</p>
                      <p className="text-lg font-bold text-green-500">
                        ${listing.price?.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No active listings</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          {reels && reels.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {reels.map((reel) => (
                <Link key={reel.id} to={`/reels?id=${reel.id}`}>
                  <Card className="hover:border-primary/50 transition-colors overflow-hidden">
                    <div className="aspect-[9/16] bg-muted relative">
                      {reel.thumbnail_url ? (
                        <img
                          src={reel.thumbnail_url}
                          alt={reel.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <p className="font-medium truncate text-sm">{reel.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {reel.view_count || 0} views
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Play className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No videos yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {creator && (
        <ShareCreatorDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          creator={{
            id: creator.id,
            creator_name: storefront.display_name,
            username: storefront.slug,
          }}
        />
      )}
    </div>
  );
};
