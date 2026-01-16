import React from 'react';
import { motion } from 'framer-motion';
import { Package, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BoomPack } from '@/hooks/useBoomPacks';
import { formatDistanceToNow } from 'date-fns';

interface SealedPackCardProps {
  pack: BoomPack;
  onOpen: () => void;
  opening?: boolean;
}

export const SealedPackCard: React.FC<SealedPackCardProps> = ({
  pack,
  onOpen,
  opening
}) => {
  const packType = pack.pack_type;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative"
    >
      <div className="relative overflow-hidden rounded-xl bg-card border border-border shadow-md">
        {/* Pack Visual */}
        <div className="relative h-36 bg-gradient-to-br from-primary/30 via-primary/20 to-background flex items-center justify-center">
          {packType?.image_url ? (
            <img 
              src={packType.image_url} 
              alt={packType.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <motion.div
              animate={{ 
                y: [0, -5, 0],
                rotate: [0, 1, -1, 0]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Package className="w-16 h-16 text-primary" />
            </motion.div>
          )}

          {/* Glow Effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-primary/20 via-transparent to-transparent"
            animate={{ 
              opacity: [0.5, 0.8, 0.5],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Sparkle Effects */}
          <motion.div
            className="absolute top-4 right-4"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              delay: 0.2
            }}
          >
            <Sparkles className="w-5 h-5 text-primary" />
          </motion.div>
        </div>

        {/* Pack Info */}
        <div className="p-3 space-y-2">
          <h4 className="font-semibold text-sm text-foreground truncate">
            {packType?.name || 'Boom Pack'}
          </h4>
          <p className="text-xs text-muted-foreground">
            Purchased {formatDistanceToNow(new Date(pack.purchased_at), { addSuffix: true })}
          </p>

          <Button
            onClick={onOpen}
            disabled={opening}
            size="sm"
            className="w-full"
          >
            {opening ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Package className="w-4 h-4" />
              </motion.div>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1" />
                Open Pack
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default SealedPackCard;
