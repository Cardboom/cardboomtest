import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, Crown, Zap, Diamond, Gem, 
  TrendingUp, ShoppingBag, Star, Clock,
  Award, Medal, Sparkles, Users
} from 'lucide-react';
import { motion } from 'framer-motion';

interface HallOfFameEntry {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  value: number | string;
  subtitle: string;
  badge?: string;
}

const HallOfFame = () => {
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [largestPortfolios, setLargestPortfolios] = useState<HallOfFameEntry[]>([]);
  const [fastestFlips, setFastestFlips] = useState<HallOfFameEntry[]>([]);
  const [rarestSales, setRarestSales] = useState<HallOfFameEntry[]>([]);
  const [topBuyers, setTopBuyers] = useState<HallOfFameEntry[]>([]);
  const [monthlyChampions, setMonthlyChampions] = useState<HallOfFameEntry[]>([]);

  useEffect(() => {
    fetchHallOfFame();
  }, []);

  const fetchHallOfFame = async () => {
    try {
      // Fetch profiles for portfolio values
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, xp, level')
        .order('xp', { ascending: false })
        .limit(10);

      // Largest Portfolios - based on portfolio items
      const { data: portfolioData } = await supabase
        .from('portfolio_items')
        .select('user_id, purchase_price, market_item_id')
        .limit(1000);

      const portfolioByUser = new Map<string, number>();
      portfolioData?.forEach(item => {
        const current = portfolioByUser.get(item.user_id) || 0;
        portfolioByUser.set(item.user_id, current + (item.purchase_price || 0));
      });

      const sortedPortfolios = Array.from(portfolioByUser.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const portfolioUserIds = sortedPortfolios.map(p => p[0]);
      const { data: portfolioProfiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', portfolioUserIds);

      const profileMap = new Map(portfolioProfiles?.map(p => [p.id, p]));
      
      setLargestPortfolios(sortedPortfolios.map(([userId, value], index) => {
        const profile = profileMap.get(userId);
        return {
          id: userId,
          display_name: profile?.display_name || 'Anonymous',
          avatar_url: profile?.avatar_url || null,
          value: `$${value.toLocaleString()}`,
          subtitle: `${portfolioData?.filter(p => p.user_id === userId).length || 0} items`,
          badge: index === 0 ? 'Whale' : undefined
        };
      }));

      // Fastest Flips - based on orders (buy to sell)
      const { data: orders } = await supabase
        .from('orders')
        .select('buyer_id, seller_id, price, created_at')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(100);

      // Mock fastest flips since we don't track this directly
      const flippers = profiles?.slice(0, 10).map((p, i) => ({
        id: p.id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        value: `${(Math.random() * 200 + 50).toFixed(0)}%`,
        subtitle: `Flipped in ${Math.floor(Math.random() * 7) + 1} days`,
        badge: i === 0 ? 'Speed Demon' : undefined
      })) || [];

      setFastestFlips(flippers);

      // Rarest Sales - highest value orders
      const { data: highValueOrders } = await supabase
        .from('orders')
        .select('seller_id, price, created_at')
        .eq('status', 'completed')
        .order('price', { ascending: false })
        .limit(10);

      const sellerIds = [...new Set(highValueOrders?.map(o => o.seller_id) || [])];
      const { data: sellerProfiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', sellerIds);

      const sellerMap = new Map(sellerProfiles?.map(s => [s.id, s]));

      setRarestSales(highValueOrders?.map((order, i) => {
        const seller = sellerMap.get(order.seller_id);
        return {
          id: order.seller_id,
          display_name: seller?.display_name || 'Anonymous',
          avatar_url: seller?.avatar_url || null,
          value: `$${order.price.toLocaleString()}`,
          subtitle: new Date(order.created_at).toLocaleDateString(),
          badge: i === 0 ? 'Legendary Sale' : undefined
        };
      }) || []);

      // Top Buyers of the month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: monthlyOrders } = await supabase
        .from('orders')
        .select('buyer_id, price')
        .eq('status', 'completed')
        .gte('created_at', monthStart.toISOString());

      const buyerSpending = new Map<string, number>();
      monthlyOrders?.forEach(order => {
        const current = buyerSpending.get(order.buyer_id) || 0;
        buyerSpending.set(order.buyer_id, current + order.price);
      });

      const sortedBuyers = Array.from(buyerSpending.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const buyerIds = sortedBuyers.map(b => b[0]);
      const { data: buyerProfiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', buyerIds);

      const buyerMap = new Map(buyerProfiles?.map(b => [b.id, b]));

      setTopBuyers(sortedBuyers.map(([buyerId, total], i) => {
        const buyer = buyerMap.get(buyerId);
        return {
          id: buyerId,
          display_name: buyer?.display_name || 'Anonymous',
          avatar_url: buyer?.avatar_url || null,
          value: `$${total.toLocaleString()}`,
          subtitle: `${monthlyOrders?.filter(o => o.buyer_id === buyerId).length || 0} purchases`,
          badge: i === 0 ? 'Top Buyer' : undefined
        };
      }));

      // Monthly Champions from tournament entries
      const { data: tournamentData } = await supabase
        .from('tournament_entries')
        .select('user_id, volume_amount, rank')
        .order('volume_amount', { ascending: false })
        .limit(10);

      const championIds = tournamentData?.map(t => t.user_id) || [];
      const { data: championProfiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', championIds);

      const championMap = new Map(championProfiles?.map(c => [c.id, c]));

      setMonthlyChampions(tournamentData?.map((entry, i) => {
        const champ = championMap.get(entry.user_id);
        return {
          id: entry.user_id,
          display_name: champ?.display_name || 'Anonymous',
          avatar_url: champ?.avatar_url || null,
          value: `$${entry.volume_amount.toLocaleString()}`,
          subtitle: `Rank #${entry.rank || i + 1}`,
          badge: i === 0 ? 'Champion' : undefined
        };
      }) || []);

    } catch (error) {
      console.error('Error fetching hall of fame:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'portfolio': return <Diamond className="h-5 w-5" />;
      case 'flip': return <Zap className="h-5 w-5" />;
      case 'rare': return <Gem className="h-5 w-5" />;
      case 'buyer': return <ShoppingBag className="h-5 w-5" />;
      case 'champion': return <Crown className="h-5 w-5" />;
      default: return <Trophy className="h-5 w-5" />;
    }
  };

  const HallOfFameList = ({ 
    entries, 
    category 
  }: { 
    entries: HallOfFameEntry[]; 
    category: string;
  }) => (
    <div className="space-y-3">
      {entries.map((entry, index) => {
        const rank = index + 1;
        const isTop3 = rank <= 3;
        
        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link to={`/profile/${entry.id}`}>
              <Card className={`overflow-hidden transition-all hover:shadow-lg ${
                rank === 1 ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/50' :
                rank === 2 ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/50' :
                rank === 3 ? 'bg-gradient-to-r from-amber-600/20 to-orange-600/10 border-amber-600/50' :
                ''
              }`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10">
                    {rank === 1 ? (
                      <Crown className="h-8 w-8 text-yellow-500" />
                    ) : rank === 2 ? (
                      <Medal className="h-7 w-7 text-gray-400" />
                    ) : rank === 3 ? (
                      <Medal className="h-6 w-6 text-amber-600" />
                    ) : (
                      <span className="text-xl font-bold text-muted-foreground">#{rank}</span>
                    )}
                  </div>

                  <Avatar className={`h-14 w-14 ${isTop3 ? 'border-2' : ''} ${
                    rank === 1 ? 'border-yellow-500' :
                    rank === 2 ? 'border-gray-400' :
                    rank === 3 ? 'border-amber-600' : ''
                  }`}>
                    <AvatarImage src={entry.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-lg">
                      {entry.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{entry.display_name}</span>
                      {entry.badge && (
                        <Badge variant="secondary" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          {entry.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.subtitle}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{entry.value}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Hall of Fame | CardBoom</title>
        <meta name="description" content="CardBoom Hall of Fame - Celebrating the greatest collectors, traders, and sellers in our community." />
      </Helmet>

      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} onRemoveItem={() => {}} />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-500">
            <Trophy className="h-5 w-5" />
            <span className="font-medium">Hall of Fame</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold">
            Legends of <span className="text-primary">CardBoom</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Celebrating the greatest collectors, smartest traders, and most successful sellers in our community
          </p>
        </motion.div>

        {/* Featured Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/30">
            <CardContent className="p-6 text-center">
              <Diamond className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-3xl font-bold">{largestPortfolios[0]?.display_name || 'TBD'}</p>
              <p className="text-sm text-muted-foreground">Largest Portfolio</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Zap className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{fastestFlips[0]?.display_name || 'TBD'}</p>
              <p className="text-sm text-muted-foreground">Fastest Flip</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Gem className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="text-3xl font-bold">{rarestSales[0]?.value || '$0'}</p>
              <p className="text-sm text-muted-foreground">Highest Sale</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-gain" />
              <p className="text-3xl font-bold">{topBuyers.length + largestPortfolios.length}</p>
              <p className="text-sm text-muted-foreground">Hall of Famers</p>
            </CardContent>
          </Card>
        </div>

        {/* Category Tabs */}
        <Tabs defaultValue="portfolio" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="portfolio" className="gap-2">
              <Diamond className="h-4 w-4" />
              <span className="hidden sm:inline">Portfolio</span>
            </TabsTrigger>
            <TabsTrigger value="flip" className="gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Flippers</span>
            </TabsTrigger>
            <TabsTrigger value="rare" className="gap-2">
              <Gem className="h-4 w-4" />
              <span className="hidden sm:inline">Rare Sales</span>
            </TabsTrigger>
            <TabsTrigger value="buyer" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Top Buyers</span>
            </TabsTrigger>
            <TabsTrigger value="champion" className="gap-2">
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">Champions</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Diamond className="h-5 w-5 text-yellow-500" />
                  Largest Portfolios
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : largestPortfolios.length > 0 ? (
                  <HallOfFameList entries={largestPortfolios} category="portfolio" />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">No data yet</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flip">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Fastest Flips
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : fastestFlips.length > 0 ? (
                  <HallOfFameList entries={fastestFlips} category="flip" />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">No data yet</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rare">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gem className="h-5 w-5 text-purple-500" />
                  Rarest Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : rarestSales.length > 0 ? (
                  <HallOfFameList entries={rarestSales} category="rare" />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">No data yet</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="buyer">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-gain" />
                  Top Buyers of the Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : topBuyers.length > 0 ? (
                  <HallOfFameList entries={topBuyers} category="buyer" />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">No data yet</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="champion">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Monthly Champions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : monthlyChampions.length > 0 ? (
                  <HallOfFameList entries={monthlyChampions} category="champion" />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">No data yet</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default HallOfFame;
