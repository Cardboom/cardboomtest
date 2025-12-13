import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { mockCollectibles } from '@/data/mockData';
import { useLivePrices } from '@/hooks/useLivePrices';
import { 
  TrendingUp, TrendingDown, Clock, RefreshCw, Search, 
  Flame, Zap, Users, BarChart3, Star, ExternalLink,
  ArrowUpDown, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/contexts/CurrencyContext';
import { MiniSparkline } from '@/components/market/MiniSparkline';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MarketTab = 'trending' | 'gainers' | 'losers' | 'new' | 'watchlist';
type TimeInterval = '1h' | '4h' | '24h' | '7d' | '30d';
type SortField = 'rank' | 'price' | 'change' | 'volume' | 'liquidity' | 'holders';

const Markets = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<MarketTab>('trending');
  const [timeInterval, setTimeInterval] = useState<TimeInterval>('24h');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const productIds = useMemo(() => mockCollectibles.map(c => c.priceId), []);
  const { prices, lastUpdated, isLoading, refetch } = useLivePrices({ productIds, refreshInterval: 15000 });

  // Generate mock data for enhanced display
  const collectiblesWithPrices = useMemo(() => {
    return mockCollectibles.map((collectible, idx) => {
      const livePrice = prices[collectible.priceId];
      const basePrice = livePrice?.price ?? collectible.price;
      const change = livePrice?.change ?? collectible.priceChange;
      
      // Generate random but consistent mock data
      const seed = collectible.id.charCodeAt(0) + idx;
      const liquidity = Math.floor((seed * 12345) % 500000) + 50000;
      const holders = Math.floor((seed * 789) % 5000) + 100;
      const volume24h = Math.floor((seed * 4567) % 100000) + 5000;
      const txns = Math.floor((seed * 234) % 500) + 10;
      const age = Math.floor((seed * 56) % 365) + 1;
      
      // Generate sparkline data
      const sparklineData = Array.from({ length: 12 }, (_, i) => 
        basePrice * (1 + (Math.sin(seed + i) * 0.1))
      );

      return {
        ...collectible,
        price: basePrice,
        priceChange: change,
        change1h: change * (0.3 + Math.random() * 0.4),
        change7d: change * (1.5 + Math.random()),
        change30d: change * (2 + Math.random() * 2),
        liquidity,
        holders,
        volume24h,
        txns,
        age,
        sparklineData,
        isNew: age < 30,
        isVerified: seed % 3 === 0,
      };
    });
  }, [prices]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(mockCollectibles.map(c => c.category))];
    return ['all', ...cats];
  }, []);

  // Filter and sort collectibles
  const filteredCollectibles = useMemo(() => {
    let items = [...collectiblesWithPrices];
    
    // Category filter
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.category === selectedCategory);
    }
    
    // Search filter
    if (searchQuery) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Tab filter
    switch (activeTab) {
      case 'trending':
        items = items.filter(c => c.trending);
        break;
      case 'gainers':
        items = items.filter(c => c.priceChange > 0).sort((a, b) => b.priceChange - a.priceChange);
        break;
      case 'losers':
        items = items.filter(c => c.priceChange < 0).sort((a, b) => a.priceChange - b.priceChange);
        break;
      case 'new':
        items = items.filter(c => c.isNew).sort((a, b) => a.age - b.age);
        break;
    }

    // Sort
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'price':
        items.sort((a, b) => (a.price - b.price) * dir);
        break;
      case 'change':
        items.sort((a, b) => (a.priceChange - b.priceChange) * dir);
        break;
      case 'volume':
        items.sort((a, b) => (a.volume24h - b.volume24h) * dir);
        break;
      case 'liquidity':
        items.sort((a, b) => (a.liquidity - b.liquidity) * dir);
        break;
      case 'holders':
        items.sort((a, b) => (a.holders - b.holders) * dir);
        break;
    }

    return items;
  }, [collectiblesWithPrices, searchQuery, activeTab, sortField, sortDir, selectedCategory]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const getChangeValue = (item: typeof filteredCollectibles[0]) => {
    switch (timeInterval) {
      case '1h': return item.change1h;
      case '4h': return item.priceChange * 0.5;
      case '24h': return item.priceChange;
      case '7d': return item.change7d;
      case '30d': return item.change30d;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={cartItems.length} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-6">
        {/* Header with Stats Bar */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="font-display text-2xl font-bold text-foreground">Markets</h1>
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Clock className="w-3 h-3" />
                {lastUpdated ? (
                  <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                ) : (
                  <span className="animate-pulse">Syncing...</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 bg-secondary/30 border-border/50 h-9"
                />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetch()}
                className={cn("h-9", isLoading && 'animate-spin')}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-6 text-sm overflow-x-auto pb-2">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-muted-foreground">Market Cap:</span>
              <span className="font-semibold text-foreground">$847.2M</span>
              <span className="text-gain text-xs">+2.34%</span>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-muted-foreground">24h Vol:</span>
              <span className="font-semibold text-foreground">$5.2M</span>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-muted-foreground">Active Traders:</span>
              <span className="font-semibold text-foreground">50.2K</span>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-muted-foreground">Assets:</span>
              <span className="font-semibold text-foreground">{mockCollectibles.length}</span>
            </div>
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MarketTab)}>
            <TabsList className="bg-secondary/30 p-1 h-auto gap-1">
              <TabsTrigger 
                value="trending" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5"
              >
                <Flame className="w-4 h-4" />
                Trending
              </TabsTrigger>
              <TabsTrigger 
                value="gainers" 
                className="data-[state=active]:bg-gain/20 data-[state=active]:text-gain gap-1.5"
              >
                <TrendingUp className="w-4 h-4" />
                Gainers
              </TabsTrigger>
              <TabsTrigger 
                value="losers" 
                className="data-[state=active]:bg-loss/20 data-[state=active]:text-loss gap-1.5"
              >
                <TrendingDown className="w-4 h-4" />
                Losers
              </TabsTrigger>
              <TabsTrigger 
                value="new" 
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5"
              >
                <Zap className="w-4 h-4" />
                New
              </TabsTrigger>
              <TabsTrigger 
                value="watchlist" 
                className="data-[state=active]:bg-gold/20 data-[state=active]:text-gold gap-1.5"
              >
                <Star className="w-4 h-4" />
                Watchlist
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            {/* Category Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                  <BarChart3 className="w-4 h-4" />
                  {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {categories.map((cat) => (
                  <DropdownMenuItem 
                    key={cat} 
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(selectedCategory === cat && "bg-accent")}
                  >
                    {cat === 'all' ? 'All Categories' : cat}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Time Interval Selector */}
            <div className="flex items-center bg-secondary/30 rounded-lg p-0.5">
              {(['1h', '4h', '24h', '7d', '30d'] as TimeInterval[]).map((interval) => (
                <button
                  key={interval}
                  onClick={() => setTimeInterval(interval)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    timeInterval === interval 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {interval}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Market Table */}
        <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="min-w-[200px]">Asset</TableHead>
                <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('liquidity')}>
                  <div className="flex items-center justify-end gap-1">
                    Liquidity
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('holders')}>
                  <div className="flex items-center justify-end gap-1">
                    Holders
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('price')}>
                  <div className="flex items-center justify-end gap-1">
                    Price
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('change')}>
                  <div className="flex items-center justify-end gap-1">
                    {timeInterval} %
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead className="text-right hidden lg:table-cell cursor-pointer hover:text-foreground" onClick={() => handleSort('volume')}>
                  <div className="flex items-center justify-end gap-1">
                    {timeInterval} Vol
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead className="text-right hidden lg:table-cell">Txns</TableHead>
                <TableHead className="text-center hidden md:table-cell w-20">{timeInterval} Chart</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCollectibles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    No assets found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredCollectibles.map((item, i) => {
                  const changeValue = getChangeValue(item);
                  const isPositive = changeValue >= 0;
                  
                  return (
                    <TableRow 
                      key={item.id}
                      onClick={() => navigate(`/item/${item.id}`)}
                      className="cursor-pointer hover:bg-secondary/50"
                    >
                      <TableCell className="text-center text-muted-foreground text-sm font-medium">
                        {i + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            {item.isVerified && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                <span className="text-[8px] text-primary-foreground">✓</span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-foreground font-medium text-sm truncate max-w-[140px]">
                                {item.name}
                              </p>
                              {item.isNew && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-accent/50">
                                  NEW
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{item.category}</span>
                              <span className="text-border">•</span>
                              <span>{item.age}d</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-foreground font-medium">
                          ${formatNumber(item.liquidity)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span className="text-foreground">{formatNumber(item.holders)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-foreground font-semibold">
                          {formatPrice(item.price)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium",
                          isPositive ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
                        )}>
                          {isPositive ? '+' : ''}{changeValue.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell text-muted-foreground">
                        ${formatNumber(item.volume24h)}
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell text-muted-foreground">
                        {item.txns}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex justify-center">
                          <MiniSparkline 
                            data={item.sparklineData} 
                            positive={isPositive}
                            width={50}
                            height={20}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Add to watchlist logic
                          }}
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination / Load More */}
        <div className="flex items-center justify-center mt-6">
          <Button variant="outline" className="gap-2">
            Load More Assets
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Markets;
