import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingDown, TrendingUp, Sparkles, Search, Filter,
  ArrowLeftRight, Clock, Flame, BarChart3, Percent
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { mockCollectibles } from '@/data/mockData';
import { DealCard } from '@/components/deals/DealCard';
import { ArbitrageView } from '@/components/deals/ArbitrageView';

// Generate deal data from collectibles
const generateDeals = () => {
  return mockCollectibles
    .filter(c => c.category !== 'gamepoints')
    .map(item => {
      // Calculate various pricing metrics
      const marketAvg = item.price * (1 + (Math.random() * 0.15 - 0.03)); // CardBoom often cheaper
      const psaFairValue = item.price * (1 + (Math.random() * 0.12));
      const trendPrice = item.previousPrice;
      
      const discountFromMarket = ((marketAvg - item.price) / marketAvg) * 100;
      const discountFromPSA = ((psaFairValue - item.price) / psaFairValue) * 100;
      const discountFromTrend = ((trendPrice - item.price) / trendPrice) * 100;
      
      // Determine deal type
      let dealLabel = '';
      let dealScore = 0;
      
      if (discountFromMarket > 5) {
        dealLabel = `${discountFromMarket.toFixed(0)}% under market`;
        dealScore = discountFromMarket;
      } else if (discountFromPSA > 5) {
        dealLabel = 'Below PSA fair value';
        dealScore = discountFromPSA;
      } else if (item.priceChange < -3) {
        dealLabel = 'Historically cheap';
        dealScore = Math.abs(item.priceChange);
      }
      
      return {
        ...item,
        marketAvg,
        psaFairValue,
        trendPrice,
        discountFromMarket,
        discountFromPSA,
        dealLabel,
        dealScore,
        timeToSell: Math.random() * 5 + 0.5, // 0.5-5.5 days
        externalPrice: item.price * (1 + (Math.random() * 0.2 - 0.05)), // External market comparison
      };
    })
    .filter(d => d.dealScore > 3)
    .sort((a, b) => b.dealScore - a.dealScore);
};

const Deals = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const deals = useMemo(() => generateDeals(), []);
  
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      const matchesSearch = deal.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || deal.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [deals, searchQuery, selectedCategory]);

  const categories = ['all', 'pokemon', 'nba', 'football', 'mtg', 'figures', 'onepiece', 'yugioh'];

  const stats = useMemo(() => ({
    totalDeals: deals.length,
    avgDiscount: deals.reduce((acc, d) => acc + d.dealScore, 0) / deals.length,
    bestDeal: deals[0]?.dealScore || 0,
    arbitrageOpps: deals.filter(d => d.externalPrice > d.price * 1.05).length,
  }), [deals]);

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={cartItems.length} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-gain/20 text-gain px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Deal Discovery Engine</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Find Hidden <span className="text-primary">Treasures</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            AI-powered deal detection finds cards listed below market value, PSA fair price, and historical trends
          </p>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-xl p-4 text-center"
          >
            <Flame className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">{stats.totalDeals}</p>
            <p className="text-muted-foreground text-sm">Active Deals</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-xl p-4 text-center"
          >
            <Percent className="w-6 h-6 mx-auto mb-2 text-gain" />
            <p className="text-2xl font-bold text-gain">{stats.avgDiscount.toFixed(1)}%</p>
            <p className="text-muted-foreground text-sm">Avg Discount</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-xl p-4 text-center"
          >
            <TrendingDown className="w-6 h-6 mx-auto mb-2 text-accent" />
            <p className="text-2xl font-bold text-foreground">{stats.bestDeal.toFixed(0)}%</p>
            <p className="text-muted-foreground text-sm">Best Deal</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-xl p-4 text-center"
          >
            <ArrowLeftRight className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">{stats.arbitrageOpps}</p>
            <p className="text-muted-foreground text-sm">Arbitrage Opps</p>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="deals" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <TabsList className="bg-secondary/50 p-1 rounded-xl">
              <TabsTrigger value="deals" className="rounded-lg gap-2">
                <Sparkles className="w-4 h-4" />
                Hot Deals
              </TabsTrigger>
              <TabsTrigger value="arbitrage" className="rounded-lg gap-2">
                <ArrowLeftRight className="w-4 h-4" />
                Arbitrage
              </TabsTrigger>
            </TabsList>

            {/* Search & Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search deals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/30"
                />
              </div>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="capitalize"
              >
                {cat === 'all' ? 'All Categories' : cat.replace('-', ' ')}
              </Button>
            ))}
          </div>

          <TabsContent value="deals" className="space-y-4">
            {filteredDeals.length === 0 ? (
              <div className="text-center py-16">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No deals found</h3>
                <p className="text-muted-foreground">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDeals.map((deal, index) => (
                  <DealCard 
                    key={deal.id} 
                    deal={deal} 
                    index={index}
                    onClick={() => navigate(`/item/${deal.id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="arbitrage">
            <ArbitrageView deals={deals} />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Deals;
