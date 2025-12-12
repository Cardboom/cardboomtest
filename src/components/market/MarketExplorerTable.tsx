import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Eye, Clock, Droplets, Heart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarketFilters, SortOption } from '@/pages/Explorer';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Mock data for demonstration - in production this comes from market_items table
const MOCK_MARKET_DATA = [
  { id: '1', name: 'Charizard', set_name: 'Base Set', series: '1st Edition', category: 'pokemon', rarity: 'Holo Rare', grade: 'psa10', current_price: 420000, change_24h: 12.3, change_7d: 8.5, change_30d: 25.2, last_sale_price: 415000, liquidity: 'high', views_24h: 1250, views_7d: 8400, watchlist_count: 342, is_trending: true, image_url: '/placeholder.svg' },
  { id: '2', name: 'Pikachu Illustrator', set_name: 'Promo', series: 'CoroCoro', category: 'pokemon', rarity: 'Promo', grade: 'psa9', current_price: 2500000, change_24h: 1.8, change_7d: 3.2, change_30d: 12.5, last_sale_price: 2450000, liquidity: 'low', views_24h: 890, views_7d: 5200, watchlist_count: 156, is_trending: true, image_url: '/placeholder.svg' },
  { id: '3', name: 'Black Lotus', set_name: 'Alpha', series: 'Limited Edition', category: 'mtg', rarity: 'Rare', grade: 'psa9', current_price: 185000, change_24h: 6.5, change_7d: 4.2, change_30d: 15.8, last_sale_price: 180000, liquidity: 'medium', views_24h: 650, views_7d: 4100, watchlist_count: 89, is_trending: false, image_url: '/placeholder.svg' },
  { id: '4', name: 'LeBron James Rookie', set_name: 'Topps Chrome', series: '2003-04', category: 'sports-nba', rarity: 'Refractor', grade: 'psa10', current_price: 245000, change_24h: 5.2, change_7d: 2.8, change_30d: 18.4, last_sale_price: 240000, liquidity: 'high', views_24h: 980, views_7d: 6200, watchlist_count: 215, is_trending: true, image_url: '/placeholder.svg' },
  { id: '5', name: 'Michael Jordan Fleer', set_name: 'Fleer', series: '1986-87', category: 'sports-nba', rarity: 'Base', grade: 'psa10', current_price: 89000, change_24h: 8.4, change_7d: 5.1, change_30d: 22.3, last_sale_price: 87000, liquidity: 'high', views_24h: 1100, views_7d: 7500, watchlist_count: 298, is_trending: true, image_url: '/placeholder.svg' },
  { id: '6', name: 'Luka Dončić Prizm', set_name: 'Prizm', series: '2018-19', category: 'sports-nba', rarity: 'Silver', grade: 'psa10', current_price: 12500, change_24h: -2.1, change_7d: -4.5, change_30d: 8.2, last_sale_price: 12800, liquidity: 'high', views_24h: 560, views_7d: 3800, watchlist_count: 145, is_trending: false, image_url: '/placeholder.svg' },
  { id: '7', name: 'Patrick Mahomes Prizm', set_name: 'Prizm', series: '2017', category: 'sports-nfl', rarity: 'Silver', grade: 'psa10', current_price: 15000, change_24h: 4.2, change_7d: 6.8, change_30d: 14.5, last_sale_price: 14500, liquidity: 'high', views_24h: 720, views_7d: 4900, watchlist_count: 178, is_trending: true, image_url: '/placeholder.svg' },
  { id: '8', name: 'KAWS Companion', set_name: 'Open Edition', series: '2020', category: 'figures', rarity: 'Limited', grade: 'raw', current_price: 45000, change_24h: 7.2, change_7d: 9.1, change_30d: 28.4, last_sale_price: 43000, liquidity: 'medium', views_24h: 340, views_7d: 2100, watchlist_count: 67, is_trending: false, image_url: '/placeholder.svg' },
  { id: '9', name: 'Mewtwo Rainbow', set_name: 'Hidden Fates', series: 'Shiny Vault', category: 'pokemon', rarity: 'Secret Rare', grade: 'psa10', current_price: 28000, change_24h: -0.8, change_7d: 1.2, change_30d: 5.6, last_sale_price: 28200, liquidity: 'medium', views_24h: 420, views_7d: 2800, watchlist_count: 92, is_trending: false, image_url: '/placeholder.svg' },
  { id: '10', name: 'Blue-Eyes White Dragon', set_name: 'Legend of Blue Eyes', series: '1st Edition', category: 'yugioh', rarity: 'Ultra Rare', grade: 'psa10', current_price: 35000, change_24h: 3.5, change_7d: 7.2, change_30d: 15.8, last_sale_price: 34000, liquidity: 'medium', views_24h: 380, views_7d: 2400, watchlist_count: 78, is_trending: false, image_url: '/placeholder.svg' },
  { id: '11', name: 'Monkey D. Luffy', set_name: 'Romance Dawn', series: 'Leader', category: 'one-piece', rarity: 'Leader', grade: 'psa10', current_price: 850, change_24h: 15.2, change_7d: 32.5, change_30d: 85.4, last_sale_price: 750, liquidity: 'high', views_24h: 1850, views_7d: 12400, watchlist_count: 456, is_trending: true, image_url: '/placeholder.svg' },
  { id: '12', name: 'Elsa - Snow Queen', set_name: 'The First Chapter', series: 'Enchanted', category: 'lorcana', rarity: 'Enchanted', grade: 'raw', current_price: 450, change_24h: -5.2, change_7d: -8.4, change_30d: 12.5, last_sale_price: 475, liquidity: 'medium', views_24h: 280, views_7d: 1900, watchlist_count: 45, is_trending: false, image_url: '/placeholder.svg' },
];

interface MarketExplorerTableProps {
  filters: MarketFilters;
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc';
  filterType: 'all' | 'graded' | 'figures' | 'trending' | 'gainers' | 'losers';
}

export const MarketExplorerTable = ({ filters, sortBy, sortOrder, filterType }: MarketExplorerTableProps) => {
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const filteredData = useMemo(() => {
    let data = [...MOCK_MARKET_DATA];

    // Apply filter type
    switch (filterType) {
      case 'graded':
        data = data.filter(item => item.grade !== 'raw');
        break;
      case 'figures':
        data = data.filter(item => item.category === 'figures');
        break;
      case 'trending':
        data = data.filter(item => item.is_trending);
        break;
      case 'gainers':
        data = data.filter(item => item.change_24h > 0);
        break;
      case 'losers':
        data = data.filter(item => item.change_24h < 0);
        break;
    }

    // Apply category filter
    if (filters.category) {
      data = data.filter(item => item.category === filters.category);
    }

    // Apply grade filter
    if (filters.grade) {
      data = data.filter(item => item.grade === filters.grade);
    }

    // Apply search
    if (filters.search) {
      const search = filters.search.toLowerCase();
      data = data.filter(item => 
        item.name.toLowerCase().includes(search) ||
        item.set_name.toLowerCase().includes(search) ||
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
          aVal = a.change_24h;
          bVal = b.change_24h;
          break;
        case 'change_7d':
          aVal = a.change_7d;
          bVal = b.change_7d;
          break;
        case 'change_30d':
          aVal = a.change_30d;
          bVal = b.change_30d;
          break;
        case 'price':
          aVal = a.current_price;
          bVal = b.current_price;
          break;
        case 'views':
          aVal = a.views_24h;
          bVal = b.views_24h;
          break;
        default:
          aVal = a.change_24h;
          bVal = b.change_24h;
      }
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return data;
  }, [filters, sortBy, sortOrder, filterType]);

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
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  const getLiquidityColor = (liquidity: string) => {
    switch (liquidity) {
      case 'high': return 'text-gain bg-gain/10';
      case 'medium': return 'text-accent bg-accent/10';
      case 'low': return 'text-loss bg-loss/10';
      default: return 'text-muted-foreground bg-secondary';
    }
  };

  const getGradeDisplay = (grade: string) => {
    if (grade === 'raw') return 'Raw';
    return grade.toUpperCase().replace('_', ' ');
  };

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Table Header */}
      <div className="hidden lg:grid grid-cols-12 gap-4 p-3 bg-secondary/50 text-muted-foreground text-sm font-medium border-b border-border/50">
        <div className="col-span-1">#</div>
        <div className="col-span-3">Name / Set</div>
        <div className="col-span-1">Grade</div>
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
            No items match your filters
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
              <div className="col-span-12 lg:col-span-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-foreground font-medium text-sm truncate">{item.name}</p>
                    {item.is_trending && <span className="text-xs">🔥</span>}
                  </div>
                  <p className="text-muted-foreground text-xs truncate">
                    {item.set_name} • {item.series}
                  </p>
                  <p className="text-muted-foreground text-xs capitalize">{item.category.replace('-', ' ')}</p>
                </div>
              </div>

              {/* Grade */}
              <div className="hidden lg:block col-span-1">
                <span className={cn(
                  "px-2 py-1 rounded text-xs font-medium",
                  item.grade === 'psa10' && "bg-gold/20 text-gold",
                  item.grade === 'psa9' && "bg-purple-500/20 text-purple-400",
                  item.grade === 'raw' && "bg-secondary text-muted-foreground",
                  !['psa10', 'psa9', 'raw'].includes(item.grade) && "bg-blue-500/20 text-blue-400"
                )}>
                  {getGradeDisplay(item.grade)}
                </span>
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
                  item.change_24h >= 0 ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
                )}>
                  {item.change_24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {item.change_24h >= 0 ? '+' : ''}{item.change_24h.toFixed(1)}%
                </span>
              </div>

              {/* 7d Change */}
              <div className="hidden lg:block col-span-1 text-right">
                <span className={cn(
                  "text-sm font-medium",
                  item.change_7d >= 0 ? "text-gain" : "text-loss"
                )}>
                  {item.change_7d >= 0 ? '+' : ''}{item.change_7d.toFixed(1)}%
                </span>
              </div>

              {/* 30d Change */}
              <div className="hidden lg:block col-span-1 text-right">
                <span className={cn(
                  "text-sm font-medium",
                  item.change_30d >= 0 ? "text-gain" : "text-loss"
                )}>
                  {item.change_30d >= 0 ? '+' : ''}{item.change_30d.toFixed(1)}%
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
                  {item.views_24h.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.watchlist_count} watching
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
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium mr-2",
                    item.grade === 'psa10' && "bg-gold/20 text-gold",
                    item.grade !== 'psa10' && "bg-secondary text-muted-foreground"
                  )}>
                    {getGradeDisplay(item.grade)}
                  </span>
                  <span className="text-foreground font-semibold">{formatPrice(item.current_price)}</span>
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium",
                  item.change_24h >= 0 ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
                )}>
                  {item.change_24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {item.change_24h >= 0 ? '+' : ''}{item.change_24h.toFixed(1)}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};