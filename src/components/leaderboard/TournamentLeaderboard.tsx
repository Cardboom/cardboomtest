import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Medal, Trophy, TrendingUp, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TournamentEntry {
  user_id: string;
  volume_amount: number;
  cards_sold: number;
  rank: number;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    is_beta_tester: boolean;
  };
}

export const TournamentLeaderboard = () => {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: entries, isLoading } = useQuery({
    queryKey: ['tournament-entries', currentMonth],
    queryFn: async () => {
      // Fetch tournament entries
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournament_entries')
        .select('*')
        .eq('tournament_month', currentMonth)
        .order('volume_amount', { ascending: false })
        .limit(25);

      if (tournamentError) throw tournamentError;
      if (!tournamentData || tournamentData.length === 0) return [];

      // Fetch profiles for users
      const userIds = tournamentData.map((e) => e.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, is_beta_tester')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]));

      return tournamentData.map((entry, index) => ({
        ...entry,
        rank: index + 1,
        profile: profileMap.get(entry.user_id),
      }));
    },
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-muted-foreground font-bold w-6 text-center">{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50';
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/50';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/50';
    return 'bg-card';
  };

  const getPrize = (rank: number) => {
    if (rank === 1) return '₺50,000';
    if (rank === 2) return '₺25,000';
    if (rank === 3) return '₺10,000';
    if (rank <= 5) return '₺5,000';
    if (rank <= 10) return '₺2,500';
    return null;
  };

  const formatVolume = (amount: number) => {
    if (amount >= 1000000) return `₺${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `₺${(amount / 1000).toFixed(1)}K`;
    return `₺${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Tournament Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Tournament Rankings
          <Badge variant="outline" className="ml-auto">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries && entries.length > 0 ? (
          <div className="space-y-2">
            {entries.map((entry: TournamentEntry) => {
              const prize = getPrize(entry.rank);
              
              return (
                <Link
                  key={entry.user_id}
                  to={`/profile/${entry.user_id}`}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.01] ${getRankBg(entry.rank)}`}
                >
                  <div className="flex items-center justify-center w-8">
                    {getRankIcon(entry.rank)}
                  </div>

                  <Avatar className="h-12 w-12 border-2 border-border">
                    <AvatarImage src={entry.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60">
                      {entry.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">
                        {entry.profile?.display_name || 'Anonymous'}
                      </span>
                      {entry.profile?.is_beta_tester && (
                        <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-400">
                          Beta
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {entry.cards_sold} cards
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-gain" />
                      <span className="font-bold text-lg text-foreground">
                        {formatVolume(entry.volume_amount)}
                      </span>
                    </div>
                    {prize && (
                      <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">
                        Prize: {prize}
                      </Badge>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Tournament Starting Soon!
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Start selling cards to climb the leaderboard and win up to ₺50,000 in prizes!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
