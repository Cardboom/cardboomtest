import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Flame, Star, TrendingUp, Medal, Crown, Gamepad2, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TournamentBanner } from '@/components/leaderboard/TournamentBanner';
import { TournamentLeaderboard } from '@/components/leaderboard/TournamentLeaderboard';
import { GlobalRankings } from '@/components/leaderboard/GlobalRankings';

interface LeaderboardEntry {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  is_beta_tester: boolean;
  streak?: number;
}

const Leaderboard = () => {
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [xpLeaders, setXpLeaders] = useState<LeaderboardEntry[]>([]);
  const [streakLeaders, setStreakLeaders] = useState<LeaderboardEntry[]>([]);
  const [gamingLeaders, setGamingLeaders] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchLeaderboards = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);

        // Fetch top XP users
        const { data: xpData } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, xp, level, is_beta_tester')
          .order('xp', { ascending: false })
          .limit(50);

        setXpLeaders(xpData || []);

        // Fetch top streak users
        const { data: streakData } = await supabase
          .from('daily_logins')
          .select('user_id, streak_count')
          .order('streak_count', { ascending: false })
          .limit(50);

        if (streakData) {
          const userIds = [...new Set(streakData.map(s => s.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url, xp, level, is_beta_tester')
            .in('id', userIds);

          const streakMap = new Map(streakData.map(s => [s.user_id, s.streak_count]));
          const mergedStreakLeaders = (profiles || []).map(p => ({
            ...p,
            streak: streakMap.get(p.id) || 0
          })).sort((a, b) => (b.streak || 0) - (a.streak || 0));

          setStreakLeaders(mergedStreakLeaders);
        }

        // Fetch gaming leaderboard
        const { data: gamingData } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, xp, level, is_beta_tester')
          .order('xp', { ascending: false })
          .limit(50);

        setGamingLeaders(gamingData || []);

      } catch (error) {
        console.error('Error fetching leaderboards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboards();
  }, []);

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

  const LeaderboardList = ({ 
    entries, 
    type 
  }: { 
    entries: LeaderboardEntry[]; 
    type: 'xp' | 'streak' | 'gaming'
  }) => (
    <div className="space-y-2">
      {entries.map((entry, index) => {
        const rank = index + 1;
        const isCurrentUser = entry.id === currentUserId;
        
        return (
          <Link 
            key={entry.id} 
            to={`/profile/${entry.id}`}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.01] ${getRankBg(rank)} ${isCurrentUser ? 'ring-2 ring-primary' : ''}`}
          >
            <div className="flex items-center justify-center w-8">
              {getRankIcon(rank)}
            </div>
            
            <Avatar className="h-12 w-12 border-2 border-border">
              <AvatarImage src={entry.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60">
                {entry.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground truncate">
                  {entry.display_name || 'Anonymous'}
                </span>
                {entry.is_beta_tester && (
                  <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-400">
                    Beta
                  </Badge>
                )}
                {isCurrentUser && (
                  <Badge variant="outline" className="text-xs">
                    You
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {t.common.level} {entry.level}
              </div>
            </div>

            <div className="text-right">
              {type === 'xp' ? (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  <span className="font-bold text-lg text-foreground">
                    {entry.xp?.toLocaleString() || 0}
                  </span>
                  <span className="text-sm text-muted-foreground">XP</span>
                </div>
              ) : type === 'streak' ? (
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="font-bold text-lg text-foreground">
                    {entry.streak || 0}
                  </span>
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 text-purple-500" />
                  <span className="font-bold text-lg text-foreground">
                    {entry.xp?.toLocaleString() || 0}
                  </span>
                  <span className="text-sm text-muted-foreground">{t.leaderboard.gamingPoints}</span>
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t.leaderboard.title} | CardBoom</title>
        <meta name="description" content={t.leaderboard.description} />
      </Helmet>

      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} onRemoveItem={() => {}} />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Tournament Banner */}
        <TournamentBanner />

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <Trophy className="h-5 w-5" />
            <span className="font-medium">{t.leaderboard.rankings}</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground">
            {t.leaderboard.title}
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t.leaderboard.description}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/30">
            <CardContent className="p-4 text-center">
              <Crown className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold text-foreground">
                {xpLeaders[0]?.display_name || 'TBD'}
              </p>
              <p className="text-sm text-muted-foreground">{t.leaderboard.topCollector}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-foreground">
                {xpLeaders.reduce((sum, e) => sum + (e.xp || 0), 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">{t.leaderboard.totalXP}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Flame className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold text-foreground">
                {streakLeaders[0]?.streak || 0}
              </p>
              <p className="text-sm text-muted-foreground">{t.leaderboard.topStreak}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-foreground">
                ₺50,000
              </p>
              <p className="text-sm text-muted-foreground">Grand Prize</p>
            </CardContent>
          </Card>
        </div>

        {/* Global Rankings */}
        <GlobalRankings />

        {/* Tournament Leaderboard */}
        <TournamentLeaderboard />

        {/* Regular Leaderboard Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Community Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="xp" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="xp" className="gap-2">
                  <Star className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.leaderboard.xpLeaders}</span>
                  <span className="sm:hidden">XP</span>
                </TabsTrigger>
                <TabsTrigger value="streak" className="gap-2">
                  <Flame className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.leaderboard.streakKings}</span>
                  <span className="sm:hidden">Streak</span>
                </TabsTrigger>
                <TabsTrigger value="gaming" className="gap-2">
                  <Gamepad2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.leaderboard.gamingLeaders}</span>
                  <span className="sm:hidden">Gaming</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="xp">
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : xpLeaders.length > 0 ? (
                  <LeaderboardList entries={xpLeaders} type="xp" />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    {t.leaderboard.noUsers}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="streak">
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : streakLeaders.length > 0 ? (
                  <LeaderboardList entries={streakLeaders} type="streak" />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    {t.leaderboard.noStreaks}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="gaming">
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : gamingLeaders.length > 0 ? (
                  <LeaderboardList entries={gamingLeaders} type="gaming" />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    {t.leaderboard.noGaming}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Leaderboard;
