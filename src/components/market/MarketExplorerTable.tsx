import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Eye, Clock, Droplets, Heart, Star, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarketFilters, SortOption } from '@/pages/Explorer';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';
import { InlinePlaceholder } from './CardPlaceholder';

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
  filterType: 'all' | 'tcg' | 'sports' | 'gamepoints' | 'graded' | 'figures' | 'trending' | 'gainers' | 'losers';
}

export const MarketExplorerTable = ({ filters, sortBy, sortOrder, filterType }: MarketExplorerTableProps) => {
  const navigate = useNavigate();
  const { formatPrice: formatCurrency } = useCurrency();
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  // Fetch market items from database with pagination
  useEffect(() => {
    const fetchMarketItems = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('market_items')
          .select('*', { count: 'exact' })
          .not('image_url', 'is', null)
          .neq('image_url', '')
          .gt('current_price', 0)
          .not('data_source', 'is', null);
        
        // Apply category filter at database level
        if (filters.category && filters.category !== 'all') {
          query = query.eq('category', filters.category);
        }

        // Apply search filter
        if (filters.search) {
          query = query.ilike('name', `%${filters.search}%`);
        }

        // Apply price range
        if (filters.priceMin !== null) {
          query = query.gte('current_price', filters.priceMin);
        }
        if (filters.priceMax !== null) {
          query = query.lte('current_price', filters.priceMax);
        }

        // Apply liquidity filter
        if (filters.liquidityLevel && filters.liquidityLevel !== 'all') {
          query = query.eq('liquidity', filters.liquidityLevel as 'high' | 'medium' | 'low');
        }

        // Apply filter type
        if (filterType === 'trending') {
          query = query.eq('is_trending', true);
        } else if (filterType === 'gainers') {
          query = query.gt('change_24h', 0);
        } else if (filterType === 'losers') {
          query = query.lt('change_24h', 0);
        } else if (filterType === 'figures') {
          query = query.eq('category', 'figures');
        } else if (filterType === 'tcg') {
          query = query.in('category', ['pokemon', 'yugioh', 'mtg', 'lorcana', 'one-piece', 'lol-riftbound']);
        } else if (filterType === 'sports') {
          query = query.in('category', ['sports-nba', 'sports-nfl', 'sports-mlb', 'sports-wnba']);
        } else if (filterType === 'gamepoints') {
          query = query.in('category', ['gamepoints', 'gaming']);
        }

        // Apply sorting
        const sortColumn = sortBy === 'price' ? 'current_price' : sortBy === 'views' ? 'views_24h' : sortBy;
        query = query.order(sortColumn, { ascending: sortOrder === 'asc', nullsFirst: false });

        // Apply pagination
        query = query.range(page * pageSize, (page + 1) * pageSize - 1);

        const { data, error, count } = await query;

        if (error) throw error;
        
        if (page === 0) {
          setMarketItems(data || []);
        } else {
          setMarketItems(prev => [...prev, ...(data || [])]);
        }
        
        setTotalCount(count || 0);
        setHasMore((data?.length || 0) === pageSize);
      } catch (error) {
        console.error('Error fetching market items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketItems();
  }, [filters, sortBy, sortOrder, filterType, page]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(0);
    setMarketItems([]);
  }, [filters.category, filters.search, filters.priceMin, filters.priceMax, filters.liquidityLevel, filterType, sortBy, sortOrder]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // Data is already filtered/sorted at DB level, just use it directly
  const filteredData = marketItems;

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

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


  if (isLoading && page === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
        <p className="text-muted-foreground">Loading market data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {filteredData.length.toLocaleString()} of {totalCount.toLocaleString()} items</span>
      </div>

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
                {item.image_url && !item.image_url.includes('placeholder') ? (
                  <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <InlinePlaceholder category={item.category} className="shrink-0" />
                )}
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

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button 
            onClick={loadMore} 
            disabled={isLoading}
            variant="outline"
            className="min-w-[200px]"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              `Load More (${Math.min(pageSize, totalCount - filteredData.length).toLocaleString()} more)`
            )}
          </Button>
        </div>
      )}
    </div>
  );
};