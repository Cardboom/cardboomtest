import { TrendingUp, TrendingDown, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collectible } from '@/types/collectible';
import { rarityColors } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface CollectibleCardProps {
  collectible: Collectible;
  onAddToCart: (collectible: Collectible) => void;
  onClick: (collectible: Collectible) => void;
}

export const CollectibleCard = ({ collectible, onAddToCart, onClick }: CollectibleCardProps) => {
  const isPositive = collectible.priceChange >= 0;

  return (
    <div
      className="group glass rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-500 hover:scale-[1.02] cursor-pointer animate-fade-in"
      onClick={() => onClick(collectible)}
    >
      {/* Image */}
      <div className="relative aspect-square bg-secondary/50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent z-10" />
        <img
          src={collectible.image}
          alt={collectible.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {/* Rarity Badge */}
        <div className={cn(
          'absolute top-3 left-3 z-20 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider backdrop-blur-sm',
          collectible.rarity === 'grail' && 'bg-gold/20 text-gold border border-gold/30',
          collectible.rarity === 'legendary' && 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
          collectible.rarity === 'rare' && 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
          collectible.rarity === 'common' && 'bg-platinum/20 text-platinum border border-platinum/30'
        )}>
          {collectible.rarity}
        </div>

        {/* Trending Badge */}
        {collectible.trending && (
          <div className="absolute top-3 right-3 z-20 px-2 py-1 rounded-md text-xs font-bold bg-primary/20 text-primary border border-primary/30 backdrop-blur-sm flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            HOT
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {collectible.name}
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span>{collectible.brand}</span>
          <span>•</span>
          <span>{collectible.year}</span>
          <span>•</span>
          <span>{collectible.condition}</span>
        </div>

        {/* Price Section */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold text-foreground font-display">
              ${collectible.price.toLocaleString()}
            </div>
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium',
              isPositive ? 'text-gain' : 'text-loss'
            )}>
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {isPositive ? '+' : ''}{collectible.priceChange.toFixed(2)}%
            </div>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(collectible);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ShoppingCart className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
