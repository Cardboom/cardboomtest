import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { mockCollectibles } from '@/data/mockData';
import { useLivePrices } from '@/hooks/useLivePrices';
import { TrendingUp, TrendingDown, Clock, RefreshCw, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/contexts/CurrencyContext';

const Markets = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'change' | 'price' | 'volume'>('change');

  const productIds = useMemo(() => mockCollectibles.map(c => c.priceId), []);
  const { prices, lastUpdated, isLoading, refetch } = useLivePrices({ productIds, refreshInterval: 15000 });

  const collectiblesWithPrices = useMemo(() => {
    return mockCollectibles.map(collectible => {
      const livePrice = prices[collectible.priceId];
      if (livePrice) {
        return {
          ...collectible,
          price: livePrice.price,
          priceChange: livePrice.change,
          volume: Math.floor(Math.random() * 100000) + 10000,
        };
      }
      return { ...collectible, volume: Math.floor(Math.random() * 100000) + 10000 };
    });
  }, [prices]);

  const filteredCollectibles = useMemo(() => {
    let items = [...collectiblesWithPrices];
    
    if (searchQuery) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch (sortBy) {
      case 'change':
        items.sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange));
        break;
      case 'price':
        items.sort((a, b) => b.price - a.price);
        break;
      case 'volume':
        items.sort((a, b) => (b.volume || 0) - (a.volume || 0));
        break;
    }

    return items;
  }, [collectiblesWithPrices, searchQuery, sortBy]);

  const gainers = useMemo(() => 
    [...collectiblesWithPrices].filter(c => c.priceChange > 0).sort((a, b) => b.priceChange - a.priceChange).slice(0, 10),
    [collectiblesWithPrices]
  );

  const losers = useMemo(() => 
    [...collectiblesWithPrices].filter(c => c.priceChange < 0).sort((a, b) => a.priceChange - b.priceChange).slice(0, 10),
    [collectiblesWithPrices]
  );

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={cartItems.length} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Markets</h1>
            <div className="flex items-center gap-2 mt-2 text-muted-foreground text-sm">
              <Clock className="w-4 h-4" />
              {lastUpdated ? (
                <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              ) : (
                <span>Loading prices...</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search collectibles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 bg-secondary/50"
              />
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => refetch()}
              className={isLoading ? 'animate-spin' : ''}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-4">
            <p className="text-muted-foreground text-sm mb-1">Total Market Cap</p>
            <p className="text-2xl font-bold font-display text-foreground">$847.2M</p>
            <p className="text-gain text-sm flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +2.34%
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-muted-foreground text-sm mb-1">24h Volume</p>
            <p className="text-2xl font-bold font-display text-foreground">$5.2M</p>
            <p className="text-gain text-sm flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +8.12%
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-muted-foreground text-sm mb-1">Active Listings</p>
            <p className="text-2xl font-bold font-display text-foreground">2.1M</p>
            <p className="text-muted-foreground text-sm">+1,234 today</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-muted-foreground text-sm mb-1">Active Traders</p>
            <p className="text-2xl font-bold font-display text-foreground">50.2K</p>
            <p className="text-gain text-sm flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +5.7%
            </p>
          </div>
        </div>

        {/* Top Movers */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Gainers */}
          <div className="glass rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border/50 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gain" />
              <h3 className="font-display font-semibold text-foreground">Top Gainers</h3>
            </div>
            <div className="divide-y divide-border/30">
              {gainers.slice(0, 5).map((item, i) => (
                <div 
                  key={item.id}
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="flex items-center justify-between p-3 hover:bg-secondary/30 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm w-5">{i + 1}</span>
                    <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                    <div>
                      <p className="text-foreground font-medium text-sm truncate max-w-[150px]">{item.name}</p>
                      <p className="text-muted-foreground text-xs">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground font-semibold">{formatPrice(item.price)}</p>
                    <p className="text-gain text-sm font-medium">+{item.priceChange.toFixed(2)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Losers */}
          <div className="glass rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border/50 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-loss" />
              <h3 className="font-display font-semibold text-foreground">Top Losers</h3>
            </div>
            <div className="divide-y divide-border/30">
              {losers.slice(0, 5).map((item, i) => (
                <div 
                  key={item.id}
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="flex items-center justify-between p-3 hover:bg-secondary/30 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm w-5">{i + 1}</span>
                    <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                    <div>
                      <p className="text-foreground font-medium text-sm truncate max-w-[150px]">{item.name}</p>
                      <p className="text-muted-foreground text-xs">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground font-semibold">{formatPrice(item.price)}</p>
                    <p className="text-loss text-sm font-medium">{item.priceChange.toFixed(2)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* All Assets Table */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-display font-semibold text-foreground">All Assets</h3>
            <div className="flex items-center gap-2">
              <Button 
                variant={sortBy === 'change' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setSortBy('change')}
              >
                % Change
              </Button>
              <Button 
                variant={sortBy === 'price' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setSortBy('price')}
              >
                Price
              </Button>
              <Button 
                variant={sortBy === 'volume' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setSortBy('volume')}
              >
                Volume
              </Button>
            </div>
          </div>
          
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-3 bg-secondary/30 text-muted-foreground text-sm font-medium">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Name</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right">24h %</div>
            <div className="col-span-2 text-right hidden md:block">Volume</div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-border/30">
            {filteredCollectibles.map((item, i) => (
              <div 
                key={item.id}
                onClick={() => navigate(`/item/${item.id}`)}
                className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-secondary/30 cursor-pointer transition-colors"
              >
                <div className="col-span-1 text-muted-foreground text-sm">{i + 1}</div>
                <div className="col-span-4 flex items-center gap-3">
                  <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                  <div>
                    <p className="text-foreground font-medium text-sm truncate max-w-[200px]">{item.name}</p>
                    <p className="text-muted-foreground text-xs">{item.brand}</p>
                  </div>
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-foreground font-semibold">{formatPrice(item.price)}</p>
                </div>
                <div className="col-span-2 text-right">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium",
                    item.priceChange >= 0 ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
                  )}>
                    {item.priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {item.priceChange >= 0 ? '+' : ''}{item.priceChange.toFixed(2)}%
                  </span>
                </div>
                <div className="col-span-2 text-right text-muted-foreground hidden md:block">
                  ${((item.volume || 0) / 1000).toFixed(1)}K
                </div>
                <div className="col-span-1 text-right">
                  <Button variant="ghost" size="sm">
                    <TrendingUp className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Markets;