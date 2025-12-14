import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Eye, Clock, Droplets, Heart, Star, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarketFilters, SortOption } from '@/pages/Explorer';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';

interface MarketItem {
  id: string;
  name: string;
  set_name: string | null;
  series: string | null;
  category: string;
  rarity: string | null;
  current_price: number;
  change_24h: number | null;
  change_7d: number | null;
  change_30d: number | null;
  last_sale_price: number | null;
  liquidity: string | null;
  views_24h: number | null;
  views_7d: number | null;
  watchlist_count: number | null;
  is_trending: boolean | null;
  image_url: string | null;
}

interface MarketExplorerTableProps {
  filters: MarketFilters;
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc';
  filterType: 'all' | 'graded' | 'figures' | 'trending' | 'gainers' | 'losers';
}

export const MarketExplorerTable = ({ filters, sortBy, sortOrder, filterType }: MarketExplorerTableProps) => {
  const navigate = useNavigate();
  const { formatPrice: formatCurrency } = useCurrency();
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch market items from database
  useEffect(() => {
    const fetchMarketItems = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('market_items')
          .select('*')
          .order('is_trending', { ascending: false })
          .order('current_price', { ascending: false })
          .limit(100);

        if (error) throw error;
        setMarketItems(data || []);
      } catch (error) {
        console.error('Error fetching market items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketItems();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('market-items-explorer')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'market_items' },
        () => fetchMarketItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const filteredData = useMemo(() => {
    let data = [...marketItems];

    // Apply filter type
    switch (filterType) {
      case 'figures':
        data = data.filter(item => item.category === 'figures');
        break;
      case 'trending':
        data = data.filter(item => item.is_trending);
        break;
      case 'gainers':
        data = data.filter(item => (item.change_24h ?? 0) > 0);
        break;
      case 'losers':
        data = data.filter(item => (item.change_24h ?? 0) < 0);
        break;
    }

    // Apply category filter
    if (filters.category) {
      data = data.filter(item => item.category === filters.category);
    }

    // Apply search
    if (filters.search) {
      const search = filters.search.toLowerCase();
      data = data.filter(item => 
        item.name.toLowerCase().includes(search) ||
        (item.set_name?.toLowerCase() || '').includes(search) ||
        item.category.toLowerCase().includes(search)
      );
    }

    // Apply price range
    if (filters.priceMin !== null) {
      data = data.filter(item => item.current_price >= filters.priceMin!);
    }
    if (filters.priceMax !== null) {
      data = data.filter(item => item.current_price <= filters.priceMax!);
    }

    // Apply liquidity filter
    if (filters.liquidityLevel) {
      data = data.filter(item => item.liquidity === filters.liquidityLevel);
    }

    // Apply sorting
    data.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortBy) {
        case 'change_24h':
          aVal = a.change_24h ?? 0;
          bVal = b.change_24h ?? 0;
          break;
        case 'change_7d':
          aVal = a.change_7d ?? 0;
          bVal = b.change_7d ?? 0;
          break;
        case 'change_30d':
          aVal = a.change_30d ?? 0;
          bVal = b.change_30d ?? 0;
          break;
        case 'price':
          aVal = a.current_price;
          bVal = b.current_price;
          break;
        case 'views':
          aVal = a.views_24h ?? 0;
          bVal = b.views_24h ?? 0;
          break;
        default:
          aVal = a.change_24h ?? 0;
          bVal = b.change_24h ?? 0;
      }
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return data;
  }, [filters, sortBy, sortOrder, filterType, marketItems]);

  const toggleWatchlist = async (itemId: string) => {
    if (!user) {
      toast.error('Please sign in to add to watchlist');
      return;
    }

    const newWatchlist = new Set(watchlist);
    if (newWatchlist.has(itemId)) {
      newWatchlist.delete(itemId);
      toast.success('Removed from watchlist');
    } else {
      newWatchlist.add(itemId);
      toast.success('Added to watchlist');
    }
    setWatchlist(newWatchlist);
  };

  const formatPrice = (price: number) => {
    return formatCurrency(price);
  };

  const getLiquidityColor = (liquidity: string) => {
    switch (liquidity) {
      case 'high': return 'text-gain bg-gain/10';
      case 'medium': return 'text-accent bg-accent/10';
      case 'low': return 'text-loss bg-loss/10';
      default: return 'text-muted-foreground bg-secondary';
    }
  };


  if (isLoading) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
        <p className="text-muted-foreground">Loading market data...</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Table Header */}
      <div className="hidden lg:grid grid-cols-12 gap-4 p-3 bg-secondary/50 text-muted-foreground text-sm font-medium border-b border-border/50">
        <div className="col-span-1">#</div>
        <div className="col-span-4">Name / Set</div>
        <div className="col-span-1 text-right">Price</div>
        <div className="col-span-1 text-right">24h</div>
        <div className="col-span-1 text-right">7d</div>
        <div className="col-span-1 text-right">30d</div>
        <div className="col-span-1 text-center">Liquidity</div>
        <div className="col-span-1 text-center">Views</div>
        <div className="col-span-1"></div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border/30">
        {filteredData.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No items found. Try fetching from eBay in the Trending section.
          </div>
        ) : (
          filteredData.map((item, index) => (
            <div
              key={item.id}
              onClick={() => navigate(`/item/${item.id}`)}
              className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-secondary/30 cursor-pointer transition-colors"
            >
              {/* Rank */}
              <div className="col-span-1 text-muted-foreground text-sm font-medium">
                {index + 1}
              </div>

              {/* Name & Set */}
              <div className="col-span-12 lg:col-span-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                  <img src={item.image_url || '/placeholder.svg'} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-foreground font-medium text-sm truncate">{item.name}</p>
                    {item.is_trending && <span className="text-xs">🔥</span>}
                  </div>
                  <p className="text-muted-foreground text-xs truncate">
                    {item.set_name || item.category} {item.series && `• ${item.series}`}
                  </p>
                  <p className="text-muted-foreground text-xs capitalize">{item.category.replace('-', ' ')}</p>
                </div>
              </div>

              {/* Price */}
              <div className="hidden lg:block col-span-1 text-right">
                <p className="text-foreground font-semibold">{formatPrice(item.current_price)}</p>
                <p className="text-muted-foreground text-xs">Last: {formatPrice(item.last_sale_price)}</p>
              </div>

              {/* 24h Change */}
              <div className="hidden lg:block col-span-1 text-right">
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium",
                  (item.change_24h ?? 0) >= 0 ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
                )}>
                  {(item.change_24h ?? 0) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {(item.change_24h ?? 0) >= 0 ? '+' : ''}{(item.change_24h ?? 0).toFixed(1)}%
                </span>
              </div>

              {/* 7d Change */}
              <div className="hidden lg:block col-span-1 text-right">
                <span className={cn(
                  "text-sm font-medium",
                  (item.change_7d ?? 0) >= 0 ? "text-gain" : "text-loss"
                )}>
                  {(item.change_7d ?? 0) >= 0 ? '+' : ''}{(item.change_7d ?? 0).toFixed(1)}%
                </span>
              </div>

              {/* 30d Change */}
              <div className="hidden lg:block col-span-1 text-right">
                <span className={cn(
                  "text-sm font-medium",
                  (item.change_30d ?? 0) >= 0 ? "text-gain" : "text-loss"
                )}>
                  {(item.change_30d ?? 0) >= 0 ? '+' : ''}{(item.change_30d ?? 0).toFixed(1)}%
                </span>
              </div>

              {/* Liquidity */}
              <div className="hidden lg:flex col-span-1 justify-center">
                <span className={cn("px-2 py-1 rounded text-xs font-medium capitalize", getLiquidityColor(item.liquidity))}>
                  {item.liquidity}
                </span>
              </div>

              {/* Views */}
              <div className="hidden lg:block col-span-1 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm">
                  <Eye className="w-3 h-3" />
                  {(item.views_24h ?? 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.watchlist_count ?? 0} watching
                </p>
              </div>

              {/* Actions */}
              <div className="hidden lg:flex col-span-1 justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWatchlist(item.id);
                  }}
                  className={cn(
                    "h-8 w-8",
                    watchlist.has(item.id) && "text-red-500"
                  )}
                >
                  <Heart className={cn("w-4 h-4", watchlist.has(item.id) && "fill-current")} />
                </Button>
              </div>

              {/* Mobile Price & Change */}
              <div className="col-span-12 lg:hidden flex items-center justify-between mt-2">
                <div>
                  <span className="text-foreground font-semibold">{formatPrice(item.current_price)}</span>
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium",
                  (item.change_24h ?? 0) >= 0 ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
                )}>
                  {(item.change_24h ?? 0) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {(item.change_24h ?? 0) >= 0 ? '+' : ''}{(item.change_24h ?? 0).toFixed(1)}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};