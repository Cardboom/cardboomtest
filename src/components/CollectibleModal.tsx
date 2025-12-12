import { X, TrendingUp, TrendingDown, ShoppingCart, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collectible } from '@/types/collectible';
import { PriceChart } from './PriceChart';
import { cn } from '@/lib/utils';
import { ShareButton } from './ShareButton';

interface CollectibleModalProps {
  collectible: Collectible | null;
  onClose: () => void;
  onAddToCart: (collectible: Collectible) => void;
}

export const CollectibleModal = ({ collectible, onClose, onAddToCart }: CollectibleModalProps) => {
  if (!collectible) return null;

  const isPositive = collectible.priceChange >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-auto glass rounded-2xl animate-scale-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary/50">
              <img
                src={collectible.image}
                alt={collectible.name}
                className="w-full h-full object-cover"
              />
              
              {/* Rarity Badge */}
              <div className={cn(
                'absolute top-4 left-4 px-3 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wider backdrop-blur-sm',
                collectible.rarity === 'grail' && 'bg-gold/20 text-gold border border-gold/30',
                collectible.rarity === 'legendary' && 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
                collectible.rarity === 'rare' && 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
                collectible.rarity === 'common' && 'bg-platinum/20 text-platinum border border-platinum/30'
              )}>
                {collectible.rarity}
              </div>
            </div>

            {/* Price Chart */}
            <PriceChart title={`${collectible.name.slice(0, 20)}... Price History`} />
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
                {collectible.name}
              </h2>
              <p className="text-muted-foreground">
                Sold by <span className="text-primary font-medium">{collectible.seller}</span>
              </p>
            </div>

            {/* Price */}
            <div className="glass rounded-xl p-4">
              <div className="text-sm text-muted-foreground mb-1">Current Price</div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold font-display text-foreground">
                  ${collectible.price.toLocaleString()}
                </span>
                <span className={cn(
                  'flex items-center gap-1 text-lg font-medium',
                  isPositive ? 'text-gain' : 'text-loss'
                )}>
                  {isPositive ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <TrendingDown className="w-5 h-5" />
                  )}
                  {isPositive ? '+' : ''}{collectible.priceChange.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Brand</div>
                <div className="font-medium text-foreground">{collectible.brand}</div>
              </div>
              <div className="glass rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Year</div>
                <div className="font-medium text-foreground">{collectible.year}</div>
              </div>
              <div className="glass rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Condition</div>
                <div className="font-medium text-foreground">{collectible.condition}</div>
              </div>
              <div className="glass rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Category</div>
                <div className="font-medium text-foreground capitalize">{collectible.category}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="hero"
                size="lg"
                className="flex-1"
                onClick={() => onAddToCart(collectible)}
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </Button>
              <Button variant="glass" size="lg">
                <Heart className="w-5 h-5" />
              </Button>
              <ShareButton 
                title={collectible.name}
                text={`Check out ${collectible.name} on CardBoom - $${collectible.price.toLocaleString()}`}
              />
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 bg-primary rounded-full" />
                Authenticated
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 bg-primary rounded-full" />
                Secure Payment
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 bg-primary rounded-full" />
                Insured Shipping
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
