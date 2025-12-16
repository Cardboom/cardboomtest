import { TrendingUp, TrendingDown, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useMemo, useState } from 'react';
import { ScrollReveal } from '@/components/ScrollReveal';
import { useNavigate } from 'react-router-dom';
import { useEbayProducts } from '@/hooks/useEbayProducts';
import { formatGrade } from '@/hooks/useGradePrices';

export const TrendingSection = () => {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const { products: ebayProducts, isLoading, populateProducts } = useEbayProducts(undefined, 20);
  const [isPopulating, setIsPopulating] = useState(false);
  
  const trending = useMemo(() => {
    // Get trending products from database
    const trendingProducts = ebayProducts
      .filter(p => p.is_trending || (p.change_24h && p.change_24h > 0))
      .sort((a, b) => (b.change_24h || 0) - (a.change_24h || 0))
      .slice(0, 8)
      .map(p => ({
        id: p.id,
        priceId: p.external_id || p.id,
        name: p.name,
        category: p.category,
        image: p.image_url || '/placeholder.svg',
        price: p.current_price,
        previousPrice: p.base_price,
        priceChange: p.change_24h || 0,
        grade: p.subcategory?.toLowerCase().includes('psa') ? p.subcategory : 'raw',
        brand: p.subcategory || p.category,
        trending: true,
        priceUpdated: false,
      }));

    return trendingProducts;
  }, [ebayProducts]);

  const handlePopulate = async () => {
    setIsPopulating(true);
    await populateProducts();
    setIsPopulating(false);
  };

  if (isLoading && trending.length === 0) {
    return (
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-bold text-foreground">
              Trending Now 🔥
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass rounded-xl p-4 w-72 shrink-0 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (trending.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground">
            Trending Now 🔥
          </h2>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handlePopulate}
                disabled={isPopulating}
                className="gap-2"
              >
                <RefreshCw className={cn("w-4 h-4", isPopulating && "animate-spin")} />
                {isPopulating ? 'Loading...' : 'Refresh'}
              </Button>
              <Button 
                variant="ghost" 
                className="text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/markets')}
              >
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {trending.map((item, index) => {
              const isPositive = item.priceChange >= 0;
              return (
                <ScrollReveal key={item.id} delay={index * 100} direction="left">
                  <div
                    className={cn(
                      "glass rounded-xl p-4 w-72 hover:border-primary/50 transition-all duration-300 cursor-pointer hover:scale-[1.02]",
                      item.priceUpdated && "ring-2 ring-primary/50"
                    )}
                    onClick={() => navigate(`/item/${item.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-muted-foreground font-display">
                        #{index + 1}
                      </div>
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary/50 shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground text-sm line-clamp-1">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          {item.grade && (
                            <span className={cn(
                              "text-xs px-1.5 py-0.5 rounded font-semibold",
                              item.grade === 'psa10' && "bg-gold/20 text-gold",
                              item.grade === 'psa9' && "bg-purple-500/20 text-purple-400",
                              item.grade === 'psa8' && "bg-blue-500/20 text-blue-400",
                              item.grade === 'bgs10' && "bg-gold/20 text-gold",
                              item.grade === 'bgs9_5' && "bg-purple-500/20 text-purple-400",
                              !['psa10', 'psa9', 'psa8', 'bgs10', 'bgs9_5'].includes(item.grade) && "bg-secondary text-muted-foreground"
                            )}>
                              {formatGrade(item.grade)}
                            </span>
                          )}
                          <p className="text-xs text-muted-foreground">{item.brand}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                      <span className={cn(
                        "font-bold text-foreground transition-all duration-300",
                        item.priceUpdated && "text-primary scale-105"
                      )}>
                        {formatPrice(item.price)}
                      </span>
                      <span className={cn(
                        'flex items-center gap-1 text-sm font-medium transition-all duration-300',
                        isPositive ? 'text-gain' : 'text-loss',
                        item.priceUpdated && "scale-105"
                      )}>
                        {isPositive ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {isPositive ? '+' : ''}{item.priceChange.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
