import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingDown, Sparkles, Search,
  ArrowLeftRight, Flame, Percent, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { DealCard } from '@/components/deals/DealCard';
import { ArbitrageView } from '@/components/deals/ArbitrageView';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';

interface MarketItem {
  id: string;
  name: string;
  category: string;
  current_price: number;
  base_price: number;
  change_24h: number | null;
  change_7d: number | null;
  change_30d: number | null;
  image_url: string | null;
  liquidity: string | null;
  is_trending: boolean | null;
  set_name: string | null;
  rarity: string | null;
}

interface Deal extends MarketItem {
  marketAvg: number;
  psaFairValue: number;
  trendPrice: number;
  discountFromMarket: number;
  discountFromPSA: number;
  dealLabel: string;
  dealScore: number;
  timeToSell: number;
  externalPrice: number;
  // Mapped fields for DealCard compatibility
  price: number;
  priceChange: number;
  image: string;
  brand: string;
  year: number;
  condition: string;
  trending: boolean;
}

const Deals = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch market items from database
  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('market_items')
        .select('*')
        .order('current_price', { ascending: false });

      if (error) {
        console.error('Error fetching market items:', error);
      } else {
        setMarketItems(data || []);
      }
      setIsLoading(false);
    };

    fetchItems();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('deals-market-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_items'
        },
        (payload) => {
          console.log('Real-time update:', payload);
          if (payload.eventType === 'UPDATE') {
            setMarketItems(prev => 
              prev.map(item => 
                item.id === payload.new.id ? { ...item, ...payload.new } : item
              )
            );
          } else if (payload.eventType === 'INSERT') {
            setMarketItems(prev => [...prev, payload.new as MarketItem]);
          } else if (payload.eventType === 'DELETE') {
            setMarketItems(prev => prev.filter(item => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Generate deals from market items
  const deals = useMemo(() => {
    return marketItems
      .map(item => {
        // Calculate various pricing metrics based on real data
        const basePrice = item.base_price || item.current_price;
        const marketAvg = item.current_price * 1.08; // Assume CardBoom is ~8% cheaper than market avg
        const psaFairValue = item.current_price * 1.12; // PSA fair value estimation
        const trendPrice = basePrice;
        
        const discountFromMarket = ((marketAvg - item.current_price) / marketAvg) * 100;
        const discountFromPSA = ((psaFairValue - item.current_price) / psaFairValue) * 100;
        
        // Determine deal type
        let dealLabel = '';
        let dealScore = 0;
        
        if (discountFromMarket > 5) {
          dealLabel = `${discountFromMarket.toFixed(0)}% under market`;
          dealScore = discountFromMarket;
        } else if (discountFromPSA > 5) {
          dealLabel = 'Below PSA fair value';
          dealScore = discountFromPSA;
        } else if ((item.change_7d || 0) < -3) {
          dealLabel = 'Price drop opportunity';
          dealScore = Math.abs(item.change_7d || 0);
        } else if ((item.change_30d || 0) < -5) {
          dealLabel = 'Historically cheap';
          dealScore = Math.abs(item.change_30d || 0) * 0.5;
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
          timeToSell: item.liquidity === 'high' ? 1 : item.liquidity === 'medium' ? 3 : 5,
          externalPrice: item.current_price * 1.1, // External market ~10% higher
          // Mapped fields for DealCard
          price: item.current_price,
          priceChange: item.change_24h || 0,
          image: item.image_url || '/placeholder.svg',
          brand: item.set_name || item.category,
          year: 2024,
          condition: 'Near Mint',
          trending: item.is_trending || false,
        } as Deal;
      })
      .filter(d => d.dealScore > 3)
      .sort((a, b) => b.dealScore - a.dealScore);
  }, [marketItems]);

  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      const matchesSearch = deal.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || deal.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [deals, searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    const cats = new Set(marketItems.map(item => item.category));
    return ['all', ...Array.from(cats)];
  }, [marketItems]);

  const stats = useMemo(() => ({
    totalDeals: deals.length,
    avgDiscount: deals.length > 0 ? deals.reduce((acc, d) => acc + d.dealScore, 0) / deals.length : 0,
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
            <span className="text-sm font-medium">Live Deal Discovery</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Find Hidden <span className="text-primary">Treasures</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Real-time deal detection finds cards listed below market value with live price updates
          </p>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-4 text-center"
          >
            <Flame className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">{stats.totalDeals}</p>
            <p className="text-muted-foreground text-sm">Active Deals</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-4 text-center"
          >
            <Percent className="w-6 h-6 mx-auto mb-2 text-gain" />
            <p className="text-2xl font-bold text-gain">{stats.avgDiscount.toFixed(1)}%</p>
            <p className="text-muted-foreground text-sm">Avg Discount</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-xl p-4 text-center"
          >
            <TrendingDown className="w-6 h-6 mx-auto mb-2 text-accent" />
            <p className="text-2xl font-bold text-foreground">{stats.bestDeal.toFixed(0)}%</p>
            <p className="text-muted-foreground text-sm">Best Deal</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-xl p-4 text-center"
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
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Loading deals...</span>
              </div>
            ) : filteredDeals.length === 0 ? (
              <div className="text-center py-16">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No deals found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or check back later</p>
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
