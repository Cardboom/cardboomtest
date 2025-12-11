import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mockCollectibles } from '@/data/mockData';
import { cn } from '@/lib/utils';

export const TrendingSection = () => {
  const trending = mockCollectibles.filter(item => item.trending).slice(0, 5);

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground">
            Trending Now 🔥
          </h2>
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {trending.map((item, index) => {
              const isPositive = item.priceChange >= 0;
              return (
                <div
                  key={item.id}
                  className="glass rounded-xl p-4 w-72 hover:border-primary/50 transition-all duration-300 animate-fade-in cursor-pointer hover:scale-[1.02]"
                  style={{ animationDelay: `${index * 100}ms` }}
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
                      <p className="text-xs text-muted-foreground">{item.brand}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <span className="font-bold text-foreground">
                      ${item.price.toLocaleString()}
                    </span>
                    <span className={cn(
                      'flex items-center gap-1 text-sm font-medium',
                      isPositive ? 'text-gain' : 'text-loss'
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
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
