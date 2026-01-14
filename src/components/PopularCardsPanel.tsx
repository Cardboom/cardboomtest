import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, Eye, DollarSign, Flame, ShoppingBag, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { generateCardSlug, normalizeCategory } from '@/lib/seoSlug';
import { Badge } from '@/components/ui/badge';
import { formatCategoryName } from '@/lib/categoryFormatter';

interface ListingItem {
  id: string;
  title: string;
  category: string;
  image_url: string | null;
  price: number;
  condition: string | null;
  seller_username: string | null;
  created_at: string;
  cbgi_score: number | null;
  grade: string | null;
}

interface PopularCard {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  current_price: number;
  psa10_price: number | null;
  psa9_price: number | null;
  change_24h: number | null;
  views_24h: number | null;
  sales_count_30d: number | null;
}

export function PopularCardsPanel() {
  // Fetch user listings first - prioritize real seller listings
  const { data: userListings, isLoading: listingsLoading } = useQuery({
    queryKey: ['user-listings-panel'],
    queryFn: async () => {
      // Use simple query for reliability, then fetch seller names separately
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, category, image_url, price, condition, created_at, cbgi_score, grade, seller_id')
        .eq('status', 'active')
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(12);
      
      if (error) {
        console.error('Error fetching listings:', error);
        return [];
      }
      
      // Fetch seller names for listings
      const sellerIds = [...new Set((data || []).map(l => l.seller_id).filter(Boolean))];
      let sellerMap: Record<string, string> = {};
      
      if (sellerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', sellerIds);
        
        sellerMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.display_name || 'Seller';
          return acc;
        }, {} as Record<string, string>);
      }
      
      return (data || []).map((item: any) => ({
        ...item,
        seller_username: sellerMap[item.seller_id] || 'Seller'
      })) as ListingItem[];
    },
    staleTime: 30000,
  });

  // Fetch popular market items as fallback/supplement
  const { data: popularCards, isLoading: cardsLoading } = useQuery({
    queryKey: ['popular-cards-panel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_items')
        .select('id, name, category, image_url, current_price, psa10_price, psa9_price, change_24h, views_24h, sales_count_30d')
        .gt('current_price', 0)
        .not('category', 'in', '("gamepoints","gaming")')
        .not('image_url', 'is', null)
        .order('psa10_price', { ascending: false, nullsFirst: false })
        .order('views_24h', { ascending: false, nullsFirst: false })
        .limit(12);
      
      if (error) throw error;
      const withPsa10 = (data || []).filter((c: PopularCard) => c.psa10_price && c.image_url);
      const withImages = (data || []).filter((c: PopularCard) => !c.psa10_price && c.image_url);
      return [...withPsa10.slice(0, 6), ...withImages.slice(0, 6)] as PopularCard[];
    },
    staleTime: 60000,
  });

  const isLoading = listingsLoading || cardsLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="rounded-xl bg-card/50 border border-border/50 p-4 animate-pulse">
            <div className="aspect-square bg-muted/50 rounded-lg mb-3" />
            <div className="h-4 bg-muted/50 rounded mb-2" />
            <div className="h-3 bg-muted/50 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toFixed(0)}`;
  };

  // Prioritize user listings, then fill with market items
  const listingsCount = userListings?.length || 0;
  const marketItemsToShow = Math.max(0, 8 - listingsCount);
  const displayItems = [
    ...(userListings || []).map(listing => ({
      id: listing.id,
      type: 'listing' as const,
      name: listing.title,
      category: listing.category,
      image_url: listing.image_url,
      price: listing.price,
      seller: listing.seller_username,
      condition: listing.condition,
      cbgi_score: listing.cbgi_score,
      grade: listing.grade,
    })),
    ...(popularCards || []).slice(0, marketItemsToShow).map(card => ({
      id: card.id,
      type: 'market' as const,
      name: card.name,
      category: card.category,
      image_url: card.image_url,
      price: card.psa10_price || card.current_price,
      change_24h: card.change_24h,
      views_24h: card.views_24h,
      psa10_price: card.psa10_price,
    })),
  ];

  return (
    <div className="space-y-4">
      {/* Header showing listings priority */}
      {listingsCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShoppingBag className="w-4 h-4 text-primary" />
          <span>{listingsCount} active listings from sellers</span>
        </div>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayItems.map((item, index) => {
          const isListing = item.type === 'listing';
          const linkPath = isListing 
            ? `/listing/${item.id}`
            : `/cards/${normalizeCategory(item.category)}/${generateCardSlug({ name: item.name, category: item.category })}`;
          
          return (
            <motion.div
              key={`${item.type}-${item.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={linkPath}
                className="group block rounded-xl bg-card/60 border border-border/50 hover:border-primary/30 transition-all overflow-hidden"
              >
                {/* Card Image */}
                <div className="aspect-square relative overflow-hidden bg-muted/20">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No Image
                    </div>
                  )}
                  
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {isListing && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-primary/90 text-primary-foreground">
                        For Sale
                      </Badge>
                    )}
                    {isListing && (item as any).cbgi_score && (
                      <Badge className="text-[10px] px-1.5 py-0.5 bg-[#0ABAB5]/90 text-white">
                        CBG {(item as any).cbgi_score.toFixed(1)}
                      </Badge>
                    )}
                    {!isListing && item.psa10_price && (
                      <Badge className="text-[10px] px-1.5 py-0.5 bg-blue-600/90 text-white">
                        PSA 10
                      </Badge>
                    )}
                  </div>
                  
                  {/* Price change for market items */}
                  {!isListing && item.change_24h !== null && item.change_24h !== 0 && (
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                      item.change_24h > 0 
                        ? 'bg-gain/90 text-white' 
                        : 'bg-loss/90 text-white'
                    }`}>
                      {item.change_24h > 0 ? '+' : ''}{item.change_24h.toFixed(1)}%
                    </div>
                  )}
                </div>
                
                {/* Card Info */}
                <div className="p-3">
                  <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                  
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <div className="shrink-0">
                      <span className="text-lg font-bold text-foreground">
                        {formatPrice(item.price)}
                      </span>
                      {isListing && item.condition && (
                        <span className="block text-xs text-muted-foreground">
                          {item.condition}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                      {isListing && item.seller && (
                        <span className="flex items-center gap-0.5">
                          <User className="w-3 h-3" />
                          {item.seller.substring(0, 8)}
                        </span>
                      )}
                      {!isListing && (item.views_24h || 0) > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Eye className="w-3 h-3" />
                          {item.views_24h}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {formatCategoryName(item.category)}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}