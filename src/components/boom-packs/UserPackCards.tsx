import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Clock, Package, Warehouse } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BoomPackCard as BoomPackCardType } from '@/hooks/useBoomPacks';
import { formatDistanceToNow, isPast } from 'date-fns';

interface UserPackCardsProps {
  cards: BoomPackCardType[];
  onRequestShipping?: (cardId: string) => void;
  onStoreInVault?: (cardId: string) => void;
}

const rarityColors: Record<string, string> = {
  common: 'from-slate-400 to-slate-600',
  uncommon: 'from-emerald-400 to-emerald-600',
  rare: 'from-blue-400 to-blue-600',
  ultra_rare: 'from-amber-400 via-yellow-300 to-amber-500'
};

export const UserPackCards: React.FC<UserPackCardsProps> = ({
  cards,
  onRequestShipping,
  onStoreInVault
}) => {
  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No cards from Boom Packs yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Open some packs to add cards to your collection!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const isCooldownActive = !isPast(new Date(card.cooldown_until));
        const cooldownRemaining = isCooldownActive 
          ? formatDistanceToNow(new Date(card.cooldown_until), { addSuffix: false })
          : null;

        return (
          <motion.div
            key={card.id}
            whileHover={{ y: -4 }}
            className="relative group"
          >
            <div className={`
              relative overflow-hidden rounded-xl border border-border shadow-md
              bg-gradient-to-br ${rarityColors[card.rarity] || rarityColors.common}
            `}>
              {/* Boom Pack Origin Badge */}
              <div className="absolute top-2 left-2 z-10">
                <Badge variant="secondary" className="text-[10px] bg-black/50 text-white">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Boom Pack
                </Badge>
              </div>

              {/* Cooldown Badge */}
              {isCooldownActive && (
                <div className="absolute top-2 right-2 z-10">
                  <Badge variant="destructive" className="text-[10px]">
                    <Clock className="w-3 h-3 mr-1" />
                    {cooldownRemaining}
                  </Badge>
                </div>
              )}

              {/* Card Image */}
              <div className="h-36 flex items-center justify-center p-3">
                {card.card_image_url ? (
                  <img 
                    src={card.card_image_url} 
                    alt={card.card_name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <Sparkles className="w-10 h-10 mx-auto mb-2 text-white/70" />
                    <p className="text-xs text-white/90 font-medium px-2 leading-tight">
                      {card.card_name}
                    </p>
                  </div>
                )}
              </div>

              {/* Card Info */}
              <div className="p-3 bg-card/90 backdrop-blur-sm space-y-2">
                <h4 className="font-semibold text-xs text-foreground truncate">
                  {card.card_name}
                </h4>
                
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="outline" 
                    className="text-[10px] capitalize"
                  >
                    {card.rarity.replace('_', ' ')}
                  </Badge>
                  
                  {card.is_in_vault && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Warehouse className="w-3 h-3 mr-1" />
                      Vault
                    </Badge>
                  )}
                </div>

                {/* Actions - Only show when not in cooldown */}
                {!isCooldownActive && !card.is_shipped && !card.is_in_vault && (
                  <div className="flex gap-2 pt-2">
                    {onStoreInVault && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-7"
                        onClick={() => onStoreInVault(card.id)}
                      >
                        <Warehouse className="w-3 h-3 mr-1" />
                        Vault
                      </Button>
                    )}
                    {onRequestShipping && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-7"
                        onClick={() => onRequestShipping(card.id)}
                      >
                        <Package className="w-3 h-3 mr-1" />
                        Ship
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Ultra Rare Shimmer */}
              {card.rarity === 'ultra_rare' && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    repeatDelay: 1 
                  }}
                />
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default UserPackCards;
