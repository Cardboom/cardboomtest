import { motion } from 'framer-motion';
import { Clock, X, ArrowRight } from 'lucide-react';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import { generateCardSlug, normalizeSlug } from '@/lib/seoSlug';

export const RecentlyViewedSection = () => {
  const { items, isLoading, clearAll } = useRecentlyViewed();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  if (isLoading || items.length === 0) return null;

  const handleCardClick = (item: typeof items[0]) => {
    const slug = generateCardSlug({
      name: item.name,
      category: item.category,
    });
    navigate(`/card/${slug}`);
  };

  return (
    <section className="py-6 border-t border-border/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Recently Viewed</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {items.slice(0, 10).map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleCardClick(item)}
              className="flex-shrink-0 w-32 cursor-pointer group"
            >
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted mb-2 border border-border/50 group-hover:border-primary/50 transition-colors">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No Image
                  </div>
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                {item.name}
              </p>
              <p className="text-xs text-primary font-semibold">
                {formatPrice(item.current_price)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
