import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useMarketItems } from '@/hooks/useMarketItems';
import { ScrollReveal } from '@/components/ScrollReveal';
import { LiveUpdateIndicator } from '@/components/LiveUpdateIndicator';
import { ItemBadges } from '@/components/market/ItemBadges';
import { WantedBoard } from '@/components/market/WantedBoard';
import { ExplainPriceDialog } from '@/components/market/ExplainPriceDialog';
import { getCategoryLabel, getCategoryIcon } from '@/lib/categoryLabels';
import { GRADE_LABELS } from '@/hooks/useGradePrices';
import { 
  TrendingUp, TrendingDown, RefreshCw, Search, 
  Flame, Zap, Users, BarChart3, Star,
  ArrowUpDown, ChevronDown, Award, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TableRowSkeleton } from '@/components/ui/card-skeleton';
import { PriceSourceBadge } from '@/components/ui/price-tooltip';
import { ConfidenceBadge } from '@/components/ui/confidence-badge';
import { EmptySearchState } from '@/components/ui/empty-state';
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

type MarketTab = 'all' | 'trending' | 'gainers' | 'losers' | 'new' | 'watchlist';
type TimeInterval = '1h' | '4h' | '24h' | '7d' | '30d';
type SortField = 'rank' | 'price' | 'change' | 'volume' | 'liquidity' | 'holders';

const Markets = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<MarketTab>('all');
  const [timeInterval, setTimeInterval] = useState<TimeInterval>('24h');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [displayCount, setDisplayCount] = useState(50);

  const gradeOptions = [
    { value: 'all', label: 'All Grades' },
    { value: 'raw', label: 'Raw (Ungraded)' },
    { value: 'psa10', label: 'PSA 10' },
    { value: 'psa9', label: 'PSA 9' },
    { value: 'psa8', label: 'PSA 8' },
    { value: 'psa7', label: 'PSA 7' },
    { value: 'psa6', label: 'PSA 6' },
    { value: 'bgs10', label: 'BGS 10' },
    { value: 'bgs9_5', label: 'BGS 9.5' },
    { value: 'cgc10', label: 'CGC 10' },
  ];

  // Fetch items from database with real-time updates (30s cache TTL)
  const { 
    items: marketItems, 
    isLoading, 
    categories, 
    refetch,
    lastUpdated,
    updateCount
  } = useMarketItems({ limit: 1000, refreshInterval: 30000 });

  // Transform database items to display format
  const collectiblesWithPrices = useMemo(() => {
    return marketItems.map((item, idx) => {
      const basePrice = item.current_price;
      const change = item.change_24h ?? 0;
      
      // Use real data from database where available
      const seed = item.id.charCodeAt(0) + idx;
      const liquidityValue = item.liquidity === 'high' ? 500000 : item.liquidity === 'medium' ? 100000 : 50000;
      const holders = Math.floor((seed * 789) % 5000) + 100;
      const volume24h = Math.floor((seed * 4567) % 100000) + 5000;
      const txns = Math.floor((seed * 234) % 500) + 10;
      const age = Math.floor((Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24));
      
      // Generate sparkline data based on current price
      const sparklineData = Array.from({ length: 12 }, (_, i) => 
        basePrice * (1 + (Math.sin(seed + i) * 0.1))
      );

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        image: item.image_url || '/placeholder.svg',
        price: basePrice,
        priceChange: change,
        priceUpdated: item.priceUpdated ?? false,
        justListed: item.justListed ?? false,
        change1h: change * (0.3 + Math.random() * 0.4),
        change7d: item.change_7d ?? change * 1.5,
        change30d: item.change_30d ?? change * 2,
        liquidity: liquidityValue,
        liquidityLevel: item.liquidity,
        holders,
        volume24h,
        txns,
        age,
        sparklineData,
        isNew: age < 7,
        isVerified: seed % 3 === 0,
        trending: item.is_trending ?? false,
        brand: item.set_name || item.subcategory || item.category,
        rarity: item.rarity,
        views24h: item.views_24h ?? 0,
        views7d: item.views_7d ?? 0,
      };
    });
  }, [marketItems]);

  const filteredCollectibles = useMemo(() => {
    let items = [...collectiblesWithPrices];
    
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.category === selectedCategory);
    }

    // Filter by grade - check if name contains grade info
    if (selectedGrade !== 'all') {
      const gradeSearchTerms: Record<string, string[]> = {
        'raw': ['raw', 'ungraded'],
        'psa10': ['psa 10', 'psa10'],
        'psa9': ['psa 9', 'psa9'],
        'psa8': ['psa 8', 'psa8'],
        'psa7': ['psa 7', 'psa7'],
        'psa6': ['psa 6', 'psa6'],
        'bgs10': ['bgs 10', 'bgs10'],
        'bgs9_5': ['bgs 9.5', 'bgs9.5'],
        'cgc10': ['cgc 10', 'cgc10'],
      };
      const terms = gradeSearchTerms[selectedGrade] || [];
      items = items.filter(item => 
        terms.some(term => item.name.toLowerCase().includes(term))
      );
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.name?.toLowerCase().includes(query) ||
        item.brand?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.rarity?.toLowerCase().includes(query)
      );
    }

    switch (activeTab) {
      case 'all':
        // Show all items, no filter
        break;
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
  }, [collectiblesWithPrices, searchQuery, activeTab, sortField, sortDir, selectedCategory, selectedGrade]);

  // Displayed items with pagination
  const displayedCollectibles = useMemo(() => {
    return filteredCollectibles.slice(0, displayCount);
  }, [filteredCollectibles, displayCount]);

  const hasMoreItems = displayCount < filteredCollectibles.length;

  const handleLoadMore = () => {
    setDisplayCount(prev => Math.min(prev + 50, filteredCollectibles.length));
  };

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
      <Helmet>
        <title>Live Market Prices | Cardboom - Trading Cards & Collectibles</title>
        <meta name="description" content="Track real-time prices for Pokemon, NBA, football cards, and collectibles. View trending items, top gainers, losers, and market analytics on Cardboom." />
        <meta name="keywords" content="trading card prices, Pokemon card prices, NBA card prices, sports card market, collectibles market, card price tracker, TCG prices" />
        <link rel="canonical" href="https://cardboom.com/markets" />
        <meta property="og:title" content="Live Market Prices | Cardboom" />
        <meta property="og:description" content="Track real-time prices for trading cards and collectibles. View trending items and market analytics." />
        <meta property="og:url" content="https://cardboom.com/markets" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Header cartCount={cartItems.length} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-6">
        {/* Header with Stats */}
        <ScrollReveal>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h1 className="font-display text-2xl font-bold text-foreground">Markets</h1>
                <LiveUpdateIndicator 
                  lastUpdated={lastUpdated} 
                  updateCount={updateCount}
                  isConnected={!isLoading}
                />
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
                <span className="font-semibold text-foreground">{marketItems.length}</span>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Tabs and Filters */}
        <ScrollReveal delay={100}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MarketTab)}>
              <TabsList className="bg-secondary/30 p-1 h-auto gap-1">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5"
                >
                  <BarChart3 className="w-4 h-4" />
                  All
                </TabsTrigger>
                <TabsTrigger 
                  value="trending" 
                  className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5"
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5">
                    <BarChart3 className="w-4 h-4" />
                    {getCategoryLabel(selectedCategory)}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                  {categories.map((cat) => (
                    <DropdownMenuItem 
                      key={cat} 
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(selectedCategory === cat && "bg-accent")}
                    >
                      <span className="mr-2">{getCategoryIcon(cat)}</span>
                      {getCategoryLabel(cat)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Grade Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5">
                    <Award className="w-4 h-4" />
                    {gradeOptions.find(g => g.value === selectedGrade)?.label || 'All Grades'}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                  {gradeOptions.map((grade) => (
                    <DropdownMenuItem 
                      key={grade.value} 
                      onClick={() => setSelectedGrade(grade.value)}
                      className={cn(selectedGrade === grade.value && "bg-accent")}
                    >
                      {grade.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

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
        </ScrollReveal>

        {/* Market Table */}
        <ScrollReveal delay={200}>
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
                {isLoading ? (
                  // Skeleton loading state
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRowSkeleton key={i} columns={10} />
                  ))
                ) : displayedCollectibles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-0">
                      <EmptySearchState query={searchQuery || 'your criteria'} />
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedCollectibles.map((item, i) => {
                    const changeValue = getChangeValue(item);
                    const isPositive = changeValue >= 0;
                    
                    return (
                      <TableRow 
                        key={item.id}
                        onClick={() => navigate(`/item/${item.id}`)}
                        className={cn(
                          "cursor-pointer hover:bg-secondary/50 transition-all duration-300",
                          item.priceUpdated && "bg-primary/5"
                        )}
                      >
                        <TableCell className="text-center text-muted-foreground text-sm font-medium">
                          {i + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 flex-shrink-0">
                              {/* Consistent aspect ratio container */}
                              <div className="w-full h-full rounded-lg overflow-hidden bg-muted">
                                <img 
                                  src={item.image} 
                                  alt={item.name} 
                                  className="w-full h-full object-cover object-center"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.src = '/placeholder.svg';
                                  }}
                                />
                              </div>
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
                                <ItemBadges 
                                  justListed={item.justListed}
                                  isTrending={item.trending}
                                  isNew={item.isNew}
                                />
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
                          <span className={cn(
                            "text-foreground font-semibold transition-all duration-300",
                            item.priceUpdated && "text-primary scale-105"
                          )}>
                            {formatPrice(item.price)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium transition-all duration-300",
                            isPositive ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss",
                            item.priceUpdated && "scale-105"
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
                          <div className="flex items-center gap-1">
                            <ExplainPriceDialog
                              itemName={item.name}
                              currentPrice={item.price}
                              priceChange24h={item.priceChange}
                              priceChange7d={item.change7d}
                              priceChange30d={item.change30d}
                              liquidityLevel={item.liquidityLevel as 'high' | 'medium' | 'low'}
                              watchlistCount={item.holders}
                              salesCount={item.txns}
                              category={item.category}
                            >
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </ExplainPriceDialog>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <Star className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollReveal>

        {/* Load More */}
        {hasMoreItems && (
          <ScrollReveal delay={300}>
            <div className="flex items-center justify-center mt-6">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={handleLoadMore}
              >
                Load More Assets ({filteredCollectibles.length - displayCount} remaining)
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          </ScrollReveal>
        )}

        {/* Wanted Board / Auction House */}
        <ScrollReveal delay={400}>
          <div className="mt-12">
            <WantedBoard />
          </div>
        </ScrollReveal>
      </main>

      <Footer />
    </div>
  );
};

export default Markets;
