import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardPedestalDisplayProps {
  imageUrl: string;
  cardName?: string;
  grade?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CardPedestalDisplay = ({ 
  imageUrl, 
  cardName = 'Card',
  grade,
  className,
  size = 'md'
}: CardPedestalDisplayProps) => {
  const sizeClasses = {
    sm: 'w-[180px]',
    md: 'w-[280px]',
    lg: 'w-[380px]'
  };

  const cardSizes = {
    sm: 'w-[120px]',
    md: 'w-[200px]',
    lg: 'w-[280px]'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={cn(
        "relative flex flex-col items-center",
        sizeClasses[size],
        className
      )}
    >
      {/* Card with floating animation and glow */}
      <motion.div
        animate={{ 
          y: [0, -8, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="relative z-10"
      >
        {/* Card glow effect */}
        <div className="absolute inset-0 blur-2xl opacity-40 bg-gradient-to-b from-primary/30 via-transparent to-transparent -z-10 scale-110" />
        
        {/* PSA Slab frame */}
        <div className="relative rounded-lg overflow-hidden bg-gradient-to-b from-gray-200/20 to-gray-400/20 p-1 backdrop-blur-sm border border-white/10 shadow-2xl">
          {/* Inner slab */}
          <div className="rounded-md overflow-hidden bg-gradient-to-b from-gray-100/10 to-gray-300/10 p-2">
            {/* Card image */}
            <div className="relative rounded overflow-hidden shadow-lg">
              <img 
                src={imageUrl} 
                alt={cardName}
                className={cn(
                  "aspect-[2.5/3.5] object-cover",
                  cardSizes[size]
                )}
              />
              
              {/* Holographic shine overlay */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent"
                animate={{
                  opacity: [0.1, 0.3, 0.1],
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
              />
            </div>
          </div>
          
          {/* Grade badge */}
          {grade && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
              <div className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold text-xs shadow-lg">
                {grade}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Glass pedestal / reflection platform */}
      <div className="relative w-full mt-4">
        {/* Main pedestal surface */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative mx-auto"
        >
          {/* Ellipse shadow under pedestal */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[80%] h-4 bg-black/40 blur-xl rounded-full" />
          
          {/* Glass pedestal top surface */}
          <div className="relative h-8 bg-gradient-to-b from-white/10 via-white/5 to-transparent rounded-t-full border-t border-l border-r border-white/20 backdrop-blur-sm">
            {/* Highlight line */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          </div>
          
          {/* Pedestal base */}
          <div className="h-6 bg-gradient-to-b from-gray-800/80 via-gray-900/90 to-black rounded-b-lg border border-white/5 overflow-hidden">
            {/* Metallic highlights */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            {/* Subtle logo area */}
            <div className="flex items-center justify-center h-full">
              <div className="text-[8px] text-white/30 font-bold tracking-[0.3em] uppercase">
                CardBoom
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Card reflection on pedestal */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 opacity-20 blur-[2px] scale-y-[-0.3] scale-x-[0.9] overflow-hidden pointer-events-none">
          <img 
            src={imageUrl} 
            alt=""
            className={cn(
              "aspect-[2.5/3.5] object-cover",
              cardSizes[size]
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>
      </div>
    </motion.div>
  );
};

export default CardPedestalDisplay;
