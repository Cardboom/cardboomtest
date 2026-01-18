import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Heart, 
  MessageCircle, 
  TrendingUp, 
  Coins,
  Calendar,
  Gift
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface CreatorInsightsPanelProps {
  creatorId: string;
}

export function CreatorInsightsPanel({ creatorId }: CreatorInsightsPanelProps) {
  // Fetch aggregated view stats
  const { data: viewStats } = useQuery({
    queryKey: ['creator-view-stats', creatorId],
    queryFn: async () => {
      const now = new Date();
      const last30Days = subDays(now, 30);
      const last7Days = subDays(now, 7);
      
      // Get total views
      const { count: totalViews } = await supabase
        .from('creator_content_views')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creatorId);

      // Get unique viewer views (real users only)
      const { count: uniqueViewerViews } = await supabase
        .from('creator_content_views')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creatorId)
        .not('viewer_user_id', 'is', null);

      // Get 7-day views
      const { count: views7d } = await supabase
        .from('creator_content_views')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creatorId)
        .gte('viewed_at', last7Days.toISOString());

      // Get 30-day views
      const { count: views30d } = await supabase
        .from('creator_content_views')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creatorId)
        .gte('viewed_at', last30Days.toISOString());

      return {
        totalViews: totalViews || 0,
        uniqueViewerViews: uniqueViewerViews || 0,
        views7d: views7d || 0,
        views30d: views30d || 0
      };
    },
    enabled: !!creatorId
  });

  // Fetch creator profile for likes/comments
  const { data: creatorProfile } = useQuery({
    queryKey: ['creator-profile-stats', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('total_views, total_likes, total_comments, pending_earnings_cents, total_earnings_cents')
        .eq('id', creatorId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!creatorId
  });

  // Fetch pending rewards
  const { data: pendingRewards } = useQuery({
    queryKey: ['creator-pending-rewards', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_view_rewards')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!creatorId
  });

  // Calculate potential rewards: $0.50 (50 gems) per 1000 real views
  const realUserViews = viewStats?.uniqueViewerViews || 0;
  const potentialRewardGems = Math.floor(realUserViews / 1000) * 50;
  const pendingRewardGems = pendingRewards?.reduce((sum, r) => sum + r.reward_gems, 0) || 0;

  const stats = [
    {
      label: 'Total Views',
      value: viewStats?.totalViews || creatorProfile?.total_views || 0,
      icon: Eye,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Real User Views',
      value: realUserViews,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      subtitle: 'Eligible for rewards'
    },
    {
      label: 'Total Likes',
      value: creatorProfile?.total_likes || 0,
      icon: Heart,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10'
    },
    {
      label: 'Total Comments',
      value: creatorProfile?.total_comments || 0,
      icon: MessageCircle,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    {stat.subtitle && (
                      <p className="text-xs text-muted-foreground/70">{stat.subtitle}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Time Period Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            View Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Last 7 Days</p>
              <p className="text-2xl font-bold">{(viewStats?.views7d || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">views</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Last 30 Days</p>
              <p className="text-2xl font-bold">{(viewStats?.views30d || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">views</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rewards Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Creator Rewards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-background/50">
            <div>
              <p className="font-medium">Reward Rate</p>
              <p className="text-sm text-muted-foreground">
                Earn <span className="text-primary font-semibold">50 Boom Coins ($0.50)</span> per 1,000 real user views
              </p>
            </div>
            <Coins className="w-8 h-8 text-primary" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-background/50">
              <p className="text-sm text-muted-foreground mb-1">Eligible Views</p>
              <p className="text-xl font-bold">{realUserViews.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">from real users</p>
            </div>
            <div className="p-4 rounded-lg bg-background/50">
              <p className="text-sm text-muted-foreground mb-1">Potential Earnings</p>
              <p className="text-xl font-bold text-primary">{potentialRewardGems} 💎</p>
              <p className="text-xs text-muted-foreground">≈ ${(potentialRewardGems / 100).toFixed(2)}</p>
            </div>
          </div>

          {pendingRewardGems > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                  Pending
                </Badge>
                <span className="text-sm">Reward payout under review</span>
              </div>
              <span className="font-bold text-yellow-500">{pendingRewardGems} 💎</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Rewards are calculated weekly and paid out after verification. Only views from authenticated users count.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
