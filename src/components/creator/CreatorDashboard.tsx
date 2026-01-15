import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Youtube, Twitch, Twitter, Instagram, 
  TrendingUp, TrendingDown, Eye, Users, Plus, Star, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const PLATFORM_ICONS: Record<string, any> = {
  youtube: Youtube,
  twitch: Twitch,
  twitter: Twitter,
  instagram: Instagram,
  tiktok: () => <span className="text-lg font-semibold">TT</span>,
  other: Star
};

interface CreatorDashboardProps {
  userId?: string;
}

export function CreatorDashboard({ userId }: CreatorDashboardProps) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProfile, setNewProfile] = useState({
    creator_name: '',
    platform: 'youtube',
    platform_handle: '',
    bio: ''
  });

  // Fetch creator profile
  const { data: creatorProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['creator-profile', userId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  // Fetch creator picks
  const { data: creatorPicks } = useQuery({
    queryKey: ['creator-picks', creatorProfile?.id],
    queryFn: async () => {
      if (!creatorProfile?.id) return [];

      const { data, error } = await supabase
        .from('creator_picks')
        .select(`
          *,
          market_item:market_items (
            id, name, current_price, change_24h, image_url, category
          )
        `)
        .eq('creator_id', creatorProfile.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!creatorProfile?.id
  });

  // Create profile mutation
  const createProfileMutation = useMutation({
    mutationFn: async (profile: typeof newProfile) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('creator_profiles')
        .insert({
          user_id: user.id,
          ...profile
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Creator profile created!');
      queryClient.invalidateQueries({ queryKey: ['creator-profile'] });
      setShowCreateDialog(false);
    },
    onError: (error) => {
      toast.error('Failed to create profile');
      console.error(error);
    }
  });

  // Add pick mutation
  const addPickMutation = useMutation({
    mutationFn: async ({ marketItemId, pickType, note }: { marketItemId: string; pickType: string; note?: string }) => {
      if (!creatorProfile?.id) throw new Error('No creator profile');

      const { data: item } = await supabase
        .from('market_items')
        .select('current_price')
        .eq('id', marketItemId)
        .single();

      const { error } = await supabase
        .from('creator_picks')
        .upsert({
          creator_id: creatorProfile.id,
          market_item_id: marketItemId,
          pick_type: pickType,
          note,
          price_at_pick: item?.current_price
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pick added!');
      queryClient.invalidateQueries({ queryKey: ['creator-picks'] });
    }
  });

  const PlatformIcon = PLATFORM_ICONS[creatorProfile?.platform || 'other'];

  if (!creatorProfile && !profileLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-bold text-lg mb-2">Become a Creator</h3>
          <p className="text-muted-foreground mb-4">
            Share your portfolio, picks, and insights with your audience. No payouts required — just influence.
          </p>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Creator Profile
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Creator Profile</DialogTitle>
                <DialogDescription>
                  Set up your public creator dashboard
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Creator Name</Label>
                  <Input
                    value={newProfile.creator_name}
                    onChange={(e) => setNewProfile(prev => ({ ...prev, creator_name: e.target.value }))}
                    placeholder="Your public name"
                  />
                </div>
                <div>
                  <Label>Platform</Label>
                  <Select
                    value={newProfile.platform}
                    onValueChange={(v) => setNewProfile(prev => ({ ...prev, platform: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="twitch">Twitch</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Handle</Label>
                  <Input
                    value={newProfile.platform_handle}
                    onChange={(e) => setNewProfile(prev => ({ ...prev, platform_handle: e.target.value }))}
                    placeholder="@yourhandle"
                  />
                </div>
                <div>
                  <Label>Bio</Label>
                  <Textarea
                    value={newProfile.bio}
                    onChange={(e) => setNewProfile(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell people what you collect..."
                  />
                </div>
                <Button
                  onClick={() => createProfileMutation.mutate(newProfile)}
                  disabled={!newProfile.creator_name || createProfileMutation.isPending}
                  className="w-full"
                >
                  Create Profile
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Creator Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-2xl">
                {creatorProfile?.creator_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">{creatorProfile?.creator_name}</h2>
                {creatorProfile?.is_verified && (
                  <CheckCircle className="h-5 w-5 text-primary fill-primary" />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <PlatformIcon className="h-4 w-4" />
                <span>{creatorProfile?.platform_handle}</span>
                {creatorProfile?.follower_count > 0 && (
                  <>
                    <span>•</span>
                    <span>{creatorProfile.follower_count.toLocaleString()} followers</span>
                  </>
                )}
              </div>
              {creatorProfile?.bio && (
                <p className="text-sm text-muted-foreground">{creatorProfile.bio}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards I'm Watching */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Cards I'm Watching
          </CardTitle>
        </CardHeader>
        <CardContent>
          {creatorPicks?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No public picks yet
            </div>
          ) : (
            <div className="grid gap-3">
              {creatorPicks?.map((pick: any) => (
                <motion.div
                  key={pick.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                >
                  <img
                    src={pick.market_item?.image_url || '/placeholder.svg'}
                    alt={pick.market_item?.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{pick.market_item?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {pick.note || `Added at $${pick.price_at_pick?.toFixed(2)}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={cn(
                      "mb-1",
                      pick.pick_type === 'bullish' && "bg-green-500/20 text-green-500",
                      pick.pick_type === 'bearish' && "bg-red-500/20 text-red-500",
                      pick.pick_type === 'watching' && "bg-blue-500/20 text-blue-500",
                      pick.pick_type === 'holding' && "bg-purple-500/20 text-purple-500"
                    )}>
                      {pick.pick_type}
                    </Badge>
                    <div className="text-sm font-medium">
                      ${pick.market_item?.current_price?.toFixed(2)}
                    </div>
                    {pick.market_item?.change_24h && (
                      <div className={cn(
                        "text-xs flex items-center justify-end gap-1",
                        pick.market_item.change_24h >= 0 ? "text-green-500" : "text-red-500"
                      )}>
                        {pick.market_item.change_24h >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(pick.market_item.change_24h).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
