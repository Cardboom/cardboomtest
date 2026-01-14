import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardShowcaseProps {
  src: string;
  alt: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CardShowcase = ({ 
  src, 
  alt, 
  className,
  size = 'lg'
}: CardShowcaseProps) => {
  const sizeClasses = {
    sm: 'max-w-[180px]',
    md: 'max-w-[280px]',
    lg: 'max-w-[360px]'
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Ambient glow behind card */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[70%] h-[70%] bg-primary/20 blur-3xl rounded-full animate-pulse" />
      </div>
      
      {/* Card with animations */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={cn("relative", sizeClasses[size])}
      >
        {/* Floating animation wrapper */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          {/* Card container */}
          <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/40 group">
            {/* Main image */}
            <img 
              src={src} 
              alt={alt}
              className="w-full h-auto"
              loading="eager"
            />
            
            {/* Holographic shine sweep */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent pointer-events-none"
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ 
                x: ['calc(-100%)', 'calc(200%)'],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 4,
                ease: 'easeInOut'
              }}
            />
            
            {/* Subtle edge glow */}
            <div className="absolute inset-0 rounded-xl ring-1 ring-white/20 pointer-events-none" />
            
            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
          </div>
          
          {/* Reflection effect */}
          <div className="relative h-12 mt-1 overflow-hidden opacity-30">
            <div className="absolute inset-x-0 top-0 scale-y-[-1] blur-[2px]">
              <img 
                src={src} 
                alt=""
                className="w-full h-12 object-cover object-bottom"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
          </div>
          
        </motion.div>
      </motion.div>
    </div>
  );
};

export default CardShowcase;
