import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Globe, Crown, Medal, TrendingUp, Users, Eye, EyeOff,
  Trophy, Wallet, BarChart3, Lock, Unlock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface RankingEntry {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  rank: number;
  value: number;
  change: number; // rank change from last period
  isPrivate: boolean;
}

export const GlobalRankings = () => {
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isProfilePublic, setIsProfilePublic] = useState(true);
  const [collectors, setCollectors] = useState<RankingEntry[]>([]);
  const [traders, setTraders] = useState<RankingEntry[]>([]);
  const [portfolios, setPortfolios] = useState<RankingEntry[]>([]);
  const [userRankings, setUserRankings] = useState<{
    collector: number | null;
    trader: number | null;
    portfolio: number | null;
  }>({ collector: null, trader: null, portfolio: null });

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Fetch top collectors by XP
      const { data: collectorsData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, xp')
        .order('xp', { ascending: false })
        .limit(100);

      setCollectors(collectorsData?.map((p, i) => ({
        id: p.id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        rank: i + 1,
        value: p.xp || 0,
        change: Math.floor(Math.random() * 10) - 5, // Mock change
        isPrivate: false
      })) || []);

      // Find user's collector rank
      if (user) {
        const userCollectorRank = collectorsData?.findIndex(p => p.id === user.id);
        if (userCollectorRank !== undefined && userCollectorRank !== -1) {
          setUserRankings(prev => ({ ...prev, collector: userCollectorRank + 1 }));
        }
      }

      // Fetch top traders by order volume
      const { data: ordersData } = await supabase
        .from('orders')
        .select('seller_id, price')
        .eq('status', 'completed');

      const sellerVolume = new Map<string, number>();
      ordersData?.forEach(order => {
        const current = sellerVolume.get(order.seller_id) || 0;
        sellerVolume.set(order.seller_id, current + order.price);
      });

      const sortedTraders = Array.from(sellerVolume.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100);

      const traderIds = sortedTraders.map(t => t[0]);
      const { data: traderProfiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', traderIds);

      const traderMap = new Map(traderProfiles?.map(t => [t.id, t]));

      setTraders(sortedTraders.map(([id, volume], i) => {
        const profile = traderMap.get(id);
        return {
          id,
          display_name: profile?.display_name || 'Anonymous',
          avatar_url: profile?.avatar_url || null,
          rank: i + 1,
          value: volume,
          change: Math.floor(Math.random() * 10) - 5,
          isPrivate: false
        };
      }));

      // Find user's trader rank
      if (user) {
        const userTraderRank = sortedTraders.findIndex(([id]) => id === user.id);
        if (userTraderRank !== -1) {
          setUserRankings(prev => ({ ...prev, trader: userTraderRank + 1 }));
        }
      }

      // Fetch top portfolios by value
      const { data: portfolioData } = await supabase
        .from('portfolio_items')
        .select('user_id, purchase_price');

      const portfolioValues = new Map<string, number>();
      portfolioData?.forEach(item => {
        const current = portfolioValues.get(item.user_id) || 0;
        portfolioValues.set(item.user_id, current + (item.purchase_price || 0));
      });

      const sortedPortfolios = Array.from(portfolioValues.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100);

      const portfolioIds = sortedPortfolios.map(p => p[0]);
      const { data: portfolioProfiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', portfolioIds);

      const portfolioMap = new Map(portfolioProfiles?.map(p => [p.id, p]));

      setPortfolios(sortedPortfolios.map(([id, value], i) => {
        const profile = portfolioMap.get(id);
        return {
          id,
          display_name: profile?.display_name || 'Anonymous',
          avatar_url: profile?.avatar_url || null,
          rank: i + 1,
          value,
          change: Math.floor(Math.random() * 10) - 5,
          isPrivate: false
        };
      }));

      // Find user's portfolio rank
      if (user) {
        const userPortfolioRank = sortedPortfolios.findIndex(([id]) => id === user.id);
        if (userPortfolioRank !== -1) {
          setUserRankings(prev => ({ ...prev, portfolio: userPortfolioRank + 1 }));
        }
      }

    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async () => {
    setIsProfilePublic(!isProfilePublic);
    toast.success(isProfilePublic 
      ? 'Your rankings are now private' 
      : 'Your rankings are now public'
    );
  };

  const formatValue = (value: number, type: 'xp' | 'volume' | 'portfolio') => {
    if (type === 'xp') return `${value.toLocaleString()} XP`;
    return `$${value.toLocaleString()}`;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/50';
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/50';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600/20 to-orange-600/10 border-amber-600/50';
    return '';
  };

  const RankingList = ({ 
    entries, 
    type 
  }: { 
    entries: RankingEntry[]; 
    type: 'xp' | 'volume' | 'portfolio';
  }) => (
    <div className="space-y-2">
      {entries.slice(0, 20).map((entry, index) => {
        const isCurrentUser = entry.id === currentUserId;
        
        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Link to={`/profile/${entry.id}`}>
              <div className={`flex items-center gap-4 p-3 rounded-xl border transition-all hover:shadow-md ${getRankBg(entry.rank)} ${isCurrentUser ? 'ring-2 ring-primary' : ''}`}>
                <div className="w-10 flex justify-center">
                  {getRankIcon(entry.rank)}
                </div>

                <Avatar className="h-10 w-10">
                  <AvatarImage src={entry.avatar_url || undefined} />
                  <AvatarFallback>
                    {entry.display_name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {entry.isPrivate ? 'Hidden' : entry.display_name || 'Anonymous'}
                    </span>
                    {isCurrentUser && (
                      <Badge variant="outline" className="text-xs">You</Badge>
                    )}
                  </div>
                  {entry.change !== 0 && (
                    <div className={`text-xs flex items-center gap-1 ${entry.change > 0 ? 'text-gain' : 'text-loss'}`}>
                      <TrendingUp className={`h-3 w-3 ${entry.change < 0 ? 'rotate-180' : ''}`} />
                      {Math.abs(entry.change)} positions
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <p className="font-bold">{formatValue(entry.value, type)}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* User's Rankings Summary */}
      {currentUserId && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Your Global Rankings
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="visibility" className="text-sm text-muted-foreground">
                  {isProfilePublic ? 'Public' : 'Private'}
                </Label>
                <Switch
                  id="visibility"
                  checked={isProfilePublic}
                  onCheckedChange={toggleVisibility}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-background/50">
                <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">
                  {userRankings.collector ? `#${userRankings.collector}` : '-'}
                </p>
                <p className="text-xs text-muted-foreground">Collector</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <BarChart3 className="h-5 w-5 mx-auto mb-1 text-gain" />
                <p className="text-2xl font-bold">
                  {userRankings.trader ? `#${userRankings.trader}` : '-'}
                </p>
                <p className="text-xs text-muted-foreground">Trader</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <Wallet className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                <p className="text-2xl font-bold">
                  {userRankings.portfolio ? `#${userRankings.portfolio}` : '-'}
                </p>
                <p className="text-xs text-muted-foreground">Portfolio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rankings Tabs */}
      <Tabs defaultValue="collectors">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="collectors" className="gap-2">
            <Trophy className="h-4 w-4" />
            Collectors
          </TabsTrigger>
          <TabsTrigger value="traders" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Traders
          </TabsTrigger>
          <TabsTrigger value="portfolios" className="gap-2">
            <Wallet className="h-4 w-4" />
            Portfolios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="collectors" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Top Collectors
                </span>
                <Badge variant="secondary">{collectors.length} ranked</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <RankingList entries={collectors} type="xp" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traders" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gain" />
                  Top Traders
                </span>
                <Badge variant="secondary">{traders.length} ranked</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <RankingList entries={traders} type="volume" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolios" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-yellow-500" />
                  Top Portfolios
                </span>
                <Badge variant="secondary">{portfolios.length} ranked</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <RankingList entries={portfolios} type="portfolio" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
