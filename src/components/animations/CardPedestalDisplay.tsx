import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface CardPedestalDisplayProps {
  imageUrl: string;
  cardName?: string;
  grade?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  autoRemoveBackground?: boolean;
}

export const CardPedestalDisplay = ({ 
  imageUrl, 
  cardName = 'Card',
  grade,
  className,
  size = 'md',
  autoRemoveBackground = false
}: CardPedestalDisplayProps) => {
  const [processedImage, setProcessedImage] = useState<string>(imageUrl);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'w-[200px]',
    md: 'w-[320px]',
    lg: 'w-[420px]'
  };

  const cardSizes = {
    sm: 'w-[140px]',
    md: 'w-[220px]',
    lg: 'w-[300px]'
  };

  // Auto-remove background if enabled
  useEffect(() => {
    if (autoRemoveBackground && imageUrl) {
      const removeBackground = async () => {
        setIsProcessing(true);
        setProcessingError(null);
        try {
          const { data, error } = await supabase.functions.invoke('remove-card-background', {
            body: { imageUrl }
          });
          
          if (error) throw error;
          
          if (data?.processedImageUrl) {
            setProcessedImage(data.processedImageUrl);
          }
        } catch (err) {
          console.error('Background removal failed:', err);
          setProcessingError('Could not process image');
          setProcessedImage(imageUrl); // Fallback to original
        } finally {
          setIsProcessing(false);
        }
      };
      
      removeBackground();
    } else {
      setProcessedImage(imageUrl);
    }
  }, [imageUrl, autoRemoveBackground]);

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
      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Processing...</span>
          </div>
        </div>
      )}

      {/* Card with floating animation and glow */}
      <motion.div
        animate={{ 
          y: [0, -12, 0],
          rotateY: [0, 2, 0, -2, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="relative z-10"
        style={{ perspective: '1000px' }}
      >
        {/* Ambient glow behind card */}
        <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-radial from-primary/40 via-primary/10 to-transparent -z-10 scale-150" />
        
        {/* Card container with subtle 3D tilt */}
        <motion.div 
          className="relative"
          whileHover={{ 
            rotateY: 5,
            rotateX: -5,
            scale: 1.02,
          }}
          transition={{ duration: 0.3 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Card image */}
          <div className="relative rounded-lg overflow-hidden shadow-2xl shadow-black/50">
            <img 
              src={processedImage} 
              alt={cardName}
              className={cn(
                "aspect-[2.5/3.5] object-contain",
                cardSizes[size]
              )}
            />
            
            {/* Holographic shine overlay */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent pointer-events-none"
              animate={{
                opacity: [0, 0.4, 0],
                x: ['-150%', '150%'],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                repeatDelay: 3,
              }}
            />
            
            {/* Edge highlight */}
            <div className="absolute inset-0 rounded-lg ring-1 ring-white/10 pointer-events-none" />
          </div>
          
          {/* Grade badge */}
          {grade && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2"
            >
              <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold text-sm shadow-lg shadow-amber-500/30">
                {grade}
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Premium glass pedestal */}
      <div className="relative w-full mt-8">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="relative mx-auto"
        >
          {/* Soft shadow under pedestal */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[90%] h-8 bg-black/60 blur-2xl rounded-full" />
          
          {/* Top elliptical surface with reflection */}
          <div className="relative">
            {/* Glass surface */}
            <div className="h-10 bg-gradient-to-b from-white/15 via-white/5 to-transparent rounded-t-[100%] border-t border-l border-r border-white/20 backdrop-blur-sm overflow-hidden">
              {/* Surface highlight */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[70%] h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
              
              {/* Reflection of card on surface */}
              <div className="absolute inset-0 opacity-20 overflow-hidden">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 scale-y-[-0.2] scale-x-[0.6] blur-[1px]">
                  <img 
                    src={processedImage} 
                    alt=""
                    className={cn(
                      "aspect-[2.5/3.5] object-contain opacity-40",
                      cardSizes[size]
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Pedestal base - metallic look */}
          <div className="h-8 bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-900 rounded-b-xl border border-white/5 overflow-hidden relative">
            {/* Metallic ridges */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-4 rounded-sm bg-gradient-to-b from-neutral-600 to-neutral-800 border border-white/10 flex items-center justify-center">
                {/* Logo indent */}
                <svg viewBox="0 0 24 12" className="w-8 h-4 text-white/20">
                  <path 
                    d="M2 6 L6 2 L10 6 L14 2 L18 6 L22 2" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            
            {/* Bottom highlight */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CardPedestalDisplay;
