import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Package, Gem } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BoomPackType } from '@/hooks/useBoomPacks';

interface BoomPackCardProps {
  packType: BoomPackType;
  balance: number;
  onPurchase: () => void;
  onTopUp: () => void;
  purchasing?: boolean;
}

export const BoomPackCard: React.FC<BoomPackCardProps> = ({
  packType,
  balance,
  onPurchase,
  onTopUp,
  purchasing
}) => {
  const canAfford = balance >= packType.price_gems;
  const stockRemaining = packType.stock_limit ? packType.stock_limit - packType.stock_sold : null;
  const isOutOfStock = stockRemaining !== null && stockRemaining <= 0;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="relative group"
    >
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-lg">
        {/* Featured Badge */}
        {packType.is_featured && (
          <div className="absolute top-3 left-3 z-10">
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold">
              <Sparkles className="w-3 h-3 mr-1" />
              Featured
            </Badge>
          </div>
        )}

        {/* Pack Image */}
        <div className="relative h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden">
          {packType.image_url ? (
            <img 
              src={packType.image_url} 
              alt={packType.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <motion.div
                animate={{ 
                  y: [0, -8, 0],
                  rotate: [0, 2, -2, 0]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Package className="w-20 h-20 text-primary/50" />
              </motion.div>
            </div>
          )}

          {/* Shimmer Effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              repeatDelay: 2,
              ease: "easeInOut"
            }}
          />

          {/* Stock Badge */}
          {stockRemaining !== null && (
            <div className="absolute bottom-3 right-3">
              <Badge variant={isOutOfStock ? "destructive" : "secondary"}>
                {isOutOfStock ? 'Sold Out' : `${stockRemaining} left`}
              </Badge>
            </div>
          )}
        </div>

        {/* Pack Info */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-bold text-lg text-foreground">{packType.name}</h3>
            {packType.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {packType.description}
              </p>
            )}
          </div>

          {/* Pack Details */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package className="w-4 h-4" />
              {packType.cards_count} {packType.cards_count === 1 ? 'card' : 'cards'}
            </span>
            <span className="capitalize">{packType.category}</span>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Gem className="w-5 h-5 text-primary" />
              <span className="text-xl font-bold text-foreground">
                {packType.price_gems.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">Gems</span>
            </div>
          </div>

          {/* Action Button */}
          {canAfford ? (
            <Button
              onClick={onPurchase}
              disabled={purchasing || isOutOfStock}
              className="w-full"
              size="lg"
            >
              {purchasing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Package className="w-5 h-5" />
                </motion.div>
              ) : isOutOfStock ? (
                'Sold Out'
              ) : (
                <>
                  <Package className="w-5 h-5 mr-2" />
                  Get Pack
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={onTopUp}
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              size="lg"
            >
              <Gem className="w-5 h-5 mr-2" />
              Top Up Gems
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default BoomPackCard;
