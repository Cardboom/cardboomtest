import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Trophy, Medal, Crown, Users, TrendingUp, 
  Star, Flame, Copy, Share2, ArrowUpRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalReferrals: number;
  totalVolume: number;
  tier: string;
  isCurrentUser?: boolean;
}

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  bronze: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
  silver: { bg: 'bg-slate-400/10', text: 'text-slate-400', border: 'border-slate-400/30' },
  gold: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' },
  platinum: { bg: 'bg-cyan-400/10', text: 'text-cyan-400', border: 'border-cyan-400/30' },
  diamond: { bg: 'bg-purple-400/10', text: 'text-purple-400', border: 'border-purple-400/30' }
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="w-5 h-5 text-yellow-500" />;
    case 2:
      return <Medal className="w-5 h-5 text-slate-400" />;
    case 3:
      return <Medal className="w-5 h-5 text-amber-600" />;
    default:
      return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
  }
};

export const ViralReferralLeaderboard = () => {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all_time'>('weekly');
  const { formatPrice } = useCurrency();

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['referral-leaderboard', period],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get referral data with profile info
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select(`
          referrer_id,
          status,
          commission_earned,
          created_at
        `)
        .eq('status', 'completed');

      if (error) throw error;

      // Calculate period filter
      const now = new Date();
      let periodStart: Date;
      
      if (period === 'weekly') {
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === 'monthly') {
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        periodStart = new Date(0); // All time
      }

      // Filter by period
      const filteredReferrals = referrals?.filter(r => 
        new Date(r.created_at) >= periodStart
      ) || [];

      // Aggregate by referrer
      const aggregated = filteredReferrals.reduce((acc, ref) => {
        if (!acc[ref.referrer_id]) {
          acc[ref.referrer_id] = { count: 0, volume: 0 };
        }
        acc[ref.referrer_id].count++;
        acc[ref.referrer_id].volume += Number(ref.commission_earned || 0) * 10; // Estimate volume
        return acc;
      }, {} as Record<string, { count: number; volume: number }>);

      // Get profile info for top referrers
      const referrerIds = Object.keys(aggregated).slice(0, 20);
      
      if (referrerIds.length === 0) {
        return [];
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', referrerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Build leaderboard
      const entries: LeaderboardEntry[] = Object.entries(aggregated)
        .map(([userId, data]) => {
          const profile = profileMap.get(userId);
          const tier = data.volume >= 50000 ? 'diamond' : 
                      data.volume >= 20000 ? 'platinum' :
                      data.volume >= 5000 ? 'gold' :
                      data.volume >= 1000 ? 'silver' : 'bronze';
          
          return {
            rank: 0,
            userId,
            displayName: profile?.display_name || 'Anonymous',
            avatarUrl: profile?.avatar_url,
            totalReferrals: data.count,
            totalVolume: data.volume,
            tier,
            isCurrentUser: userId === user?.id
          };
        })
        .sort((a, b) => b.totalReferrals - a.totalReferrals)
        .slice(0, 10)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      return entries;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const { data: myReferralCode } = useQuery({
    queryKey: ['my-referral-code'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();
      
      return data?.referral_code;
    }
  });

  const copyReferralLink = () => {
    if (!myReferralCode) return;
    navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${myReferralCode}`);
    toast.success('Referral link copied!');
  };

  const shareReferralLink = async () => {
    if (!myReferralCode) return;
    const url = `${window.location.origin}/auth?ref=${myReferralCode}`;
    
    if (navigator.share) {
      await navigator.share({
        title: 'Join CardBoom!',
        text: 'Trade collectible cards with me on CardBoom!',
        url
      });
    } else {
      copyReferralLink();
    }
  };

  return (
    <Card className="bg-card border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-primary" />
            Top Ambassadors
          </CardTitle>
          <Badge variant="outline" className="gap-1 text-primary border-primary/30">
            <Flame className="w-3 h-3" />
            Live
          </Badge>
        </div>

        {/* Period tabs */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="weekly" className="text-xs">This Week</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs">This Month</TabsTrigger>
            <TabsTrigger value="all_time" className="text-xs">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : leaderboard && leaderboard.length > 0 ? (
          <>
            {/* Leaderboard entries */}
            <div className="space-y-2">
              {leaderboard.map((entry, index) => {
                const tierColors = TIER_COLORS[entry.tier] || TIER_COLORS.bronze;
                
                return (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      entry.isCurrentUser 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'bg-muted/30 hover:bg-muted/50'
                    } ${entry.rank <= 3 ? 'ring-1 ring-yellow-500/20' : ''}`}
                  >
                    {/* Rank */}
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      {getRankIcon(entry.rank)}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-10 h-10 border-2 border-background">
                      <AvatarImage src={entry.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {entry.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {entry.displayName}
                        </span>
                        {entry.isCurrentUser && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{entry.totalReferrals} referrals</span>
                        <span>•</span>
                        <TrendingUp className="w-3 h-3" />
                        <span>{formatPrice(entry.totalVolume)}</span>
                      </div>
                    </div>

                    {/* Tier badge */}
                    <Badge 
                      variant="outline" 
                      className={`${tierColors.bg} ${tierColors.text} ${tierColors.border} capitalize text-xs`}
                    >
                      <Star className="w-3 h-3 mr-1" />
                      {entry.tier}
                    </Badge>
                  </motion.div>
                );
              })}
            </div>

            {/* CTA */}
            {myReferralCode && (
              <div className="pt-3 border-t border-border/50 space-y-2">
                <p className="text-xs text-center text-muted-foreground">
                  Climb the leaderboard! Share your referral link:
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 gap-2"
                    onClick={copyReferralLink}
                  >
                    <Copy className="w-3 h-3" />
                    Copy Link
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 gap-2"
                    onClick={shareReferralLink}
                  >
                    <Share2 className="w-3 h-3" />
                    Share
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No referrals yet this {period.replace('_', ' ')}</p>
            <p className="text-xs mt-1">Be the first to top the leaderboard!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
