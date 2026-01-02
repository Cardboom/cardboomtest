import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, Eye, DollarSign, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { generateCardSlug, normalizeCategory } from '@/lib/seoSlug';

interface PopularCard {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  current_price: number;
  change_24h: number | null;
  views_24h: number | null;
  sales_count_30d: number | null;
}

export function PopularCardsPanel() {
  const { data: popularCards, isLoading } = useQuery({
    queryKey: ['popular-cards-panel'],
    queryFn: async () => {
      // Get cards with highest views/sales, with images
      const { data, error } = await supabase
        .from('market_items')
        .select('id, name, category, image_url, current_price, change_24h, views_24h, sales_count_30d')
        .gt('current_price', 0)
        .not('image_url', 'is', null)
        .order('views_24h', { ascending: false, nullsFirst: false })
        .limit(12);
      
      if (error) throw error;
      return data as PopularCard[];
    },
    staleTime: 60000,
  });

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
    return `$${price.toFixed(2)}`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {popularCards?.map((card, index) => {
        const slug = generateCardSlug({ name: card.name, category: card.category });
        
        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              to={`/cards/${normalizeCategory(card.category)}/${slug}`}
              className="group block rounded-xl bg-card/60 border border-border/50 hover:border-primary/30 transition-all overflow-hidden"
            >
              {/* Card Image */}
              <div className="aspect-square relative overflow-hidden bg-muted/20">
                {card.image_url ? (
                  <img
                    src={card.image_url}
                    alt={card.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No Image
                  </div>
                )}
                
                {/* Hot badge */}
                {(card.views_24h || 0) > 10 && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/90 text-white text-xs font-medium">
                    <Flame className="w-3 h-3" />
                    Hot
                  </div>
                )}
                
                {/* Price change badge */}
                {card.change_24h !== null && card.change_24h !== 0 && (
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                    card.change_24h > 0 
                      ? 'bg-emerald-500/90 text-white' 
                      : 'bg-red-500/90 text-white'
                  }`}>
                    {card.change_24h > 0 ? '+' : ''}{card.change_24h.toFixed(1)}%
                  </div>
                )}
              </div>
              
              {/* Card Info */}
              <div className="p-3">
                <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {card.name}
                </h3>
                
                <div className="flex items-center justify-between gap-2 mt-2">
                  <span className="text-lg font-bold text-foreground shrink-0">
                    {formatPrice(card.current_price)}
                  </span>
                  
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                    {(card.views_24h || 0) > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Eye className="w-3 h-3" />
                        {card.views_24h}
                      </span>
                    )}
                    {(card.sales_count_30d || 0) > 0 && (
                      <span className="flex items-center gap-0.5">
                        <DollarSign className="w-3 h-3" />
                        {card.sales_count_30d}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                    {card.category}
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
