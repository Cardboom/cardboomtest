import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardInsertionAnimationProps {
  isVisible: boolean;
  onComplete?: () => void;
  cardImage?: string;
  cardName?: string;
  isPremium?: boolean;
  className?: string;
  enableSound?: boolean;
}

// Premium easing - Apple-style smooth motion
const premiumEasing = [0.32, 0.72, 0, 1] as const;
const insertionEasing = [0.25, 0.1, 0.25, 1] as const;

export const CardInsertionAnimation = ({
  isVisible,
  onComplete,
  cardImage,
  cardName = "Card",
  isPremium = false,
  className,
  enableSound = false,
}: CardInsertionAnimationProps) => {
  const [phase, setPhase] = useState<'idle' | 'sleeve' | 'insert' | 'deck' | 'complete'>('idle');
  const shouldReduceMotion = useReducedMotion();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sound effect hook (optional)
  const playInsertSound = useCallback(() => {
    if (!enableSound) return;
    // Soft card sliding sound would be loaded here
    // For now, we'll use Web Audio API for a subtle whoosh
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.15);
      
      gainNode.gain.setValueAtTime(0.03, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
      // Audio not supported
    }
  }, [enableSound]);

  useEffect(() => {
    if (isVisible && phase === 'idle') {
      // Start animation sequence
      setPhase('sleeve');
      
      const sleeveTimer = setTimeout(() => {
        setPhase('insert');
        playInsertSound();
      }, 300);
      
      const insertTimer = setTimeout(() => {
        setPhase('deck');
      }, 900);
      
      const completeTimer = setTimeout(() => {
        setPhase('complete');
        onComplete?.();
      }, isPremium ? 1600 : 1400);
      
      return () => {
        clearTimeout(sleeveTimer);
        clearTimeout(insertTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [isVisible, phase, onComplete, isPremium, playInsertSound]);

  useEffect(() => {
    if (!isVisible) {
      setPhase('idle');
    }
  }, [isVisible]);

  // Reduced motion fallback
  if (shouldReduceMotion) {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn("fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm", className)}
          >
            <div className="w-48 h-64 rounded-lg bg-card border border-border shadow-xl flex items-center justify-center">
              {cardImage ? (
                <img src={cardImage} alt={cardName} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <span className="text-muted-foreground text-sm">{cardName}</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center",
            "bg-background/60 backdrop-blur-md",
            className
          )}
        >
          {/* Ambient lighting effect for premium */}
          {isPremium && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'insert' ? 0.15 : 0 }}
              transition={{ duration: 0.8 }}
              style={{
                background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.1) 0%, transparent 70%)',
              }}
            />
          )}

          <div className="relative w-64 h-96 flex items-center justify-center">
            {/* Deck stack (destination) */}
            <motion.div
              className="absolute bottom-0 left-1/2 -translate-x-1/2"
              initial={{ y: 100, opacity: 0 }}
              animate={{ 
                y: phase === 'deck' || phase === 'complete' ? 0 : 60,
                opacity: phase === 'sleeve' || phase === 'insert' || phase === 'deck' || phase === 'complete' ? 1 : 0,
              }}
              transition={{ duration: 0.5, ease: premiumEasing }}
            >
              {/* Deck cards stack */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className={cn(
                    "absolute w-40 h-56 rounded-lg",
                    isPremium 
                      ? "bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700/50"
                      : "bg-gradient-to-br from-neutral-700 to-neutral-800 border border-neutral-600/30"
                  )}
                  style={{
                    bottom: i * 2,
                    left: i * 0.5,
                    zIndex: i,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                  animate={{
                    // Compression effect when card joins
                    y: phase === 'deck' ? -2 : 0,
                    scale: phase === 'deck' ? 0.99 : 1,
                  }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                />
              ))}
            </motion.div>

            {/* Card + Sleeve Container */}
            <motion.div
              className="relative"
              initial={{ y: -50, opacity: 0 }}
              animate={{
                y: phase === 'deck' || phase === 'complete' ? 80 : 0,
                opacity: 1,
                scale: phase === 'complete' ? 0.85 : 1,
              }}
              transition={{ 
                duration: phase === 'deck' ? 0.5 : 0.4,
                ease: premiumEasing,
              }}
            >
              {/* Card Sleeve */}
              <motion.div
                className={cn(
                  "absolute inset-0 w-44 h-60 rounded-lg overflow-hidden",
                  "pointer-events-none"
                )}
                initial={{ y: -80, opacity: 0, rotateX: 5 }}
                animate={{
                  y: phase === 'sleeve' || phase === 'insert' || phase === 'deck' || phase === 'complete' ? 0 : -80,
                  opacity: phase === 'sleeve' || phase === 'insert' || phase === 'deck' || phase === 'complete' ? 1 : 0,
                  rotateX: phase === 'insert' ? (isPremium ? 2 : 0) : 5,
                }}
                transition={{ duration: 0.35, ease: insertionEasing }}
                style={{
                  transformStyle: 'preserve-3d',
                  perspective: 1000,
                }}
              >
                {/* Sleeve body - matte/glass effect */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-lg",
                    isPremium
                      ? "bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20"
                      : "bg-gradient-to-br from-white/8 via-white/3 to-transparent border border-white/10"
                  )}
                  style={{
                    backdropFilter: 'blur(1px)',
                  }}
                />
                
                {/* Premium sleeve gloss edge */}
                {isPremium && (
                  <motion.div
                    className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    animate={{
                      opacity: phase === 'insert' ? [0.3, 0.6, 0.3] : 0.3,
                    }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                  />
                )}

                {/* Sleeve flex effect for premium */}
                {isPremium && (
                  <motion.div
                    className="absolute inset-0 rounded-lg"
                    animate={{
                      boxShadow: phase === 'insert' 
                        ? 'inset 0 0 20px rgba(255,255,255,0.05)' 
                        : 'inset 0 0 0 rgba(255,255,255,0)',
                    }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.div>

              {/* The Card */}
              <motion.div
                className={cn(
                  "relative w-44 h-60 rounded-lg overflow-hidden",
                  "shadow-2xl"
                )}
                initial={{ y: -120, rotateY: 0, rotateX: 8 }}
                animate={{
                  y: phase === 'insert' || phase === 'deck' || phase === 'complete' ? 0 : (phase === 'sleeve' ? -40 : -120),
                  rotateX: phase === 'insert' ? 0 : 8,
                  rotateY: 0,
                }}
                transition={{
                  duration: phase === 'insert' ? 0.6 : 0.3,
                  ease: insertionEasing,
                }}
                style={{
                  transformStyle: 'preserve-3d',
                  perspective: 1000,
                  boxShadow: isPremium 
                    ? '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)'
                    : '0 20px 40px -10px rgba(0,0,0,0.4)',
                }}
              >
                {/* Card face */}
                {cardImage ? (
                  <img 
                    src={cardImage} 
                    alt={cardName}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-border">
                    <span className="text-sm font-medium text-muted-foreground">{cardName}</span>
                  </div>
                )}

                {/* Card surface reflection */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
                  }}
                  animate={{
                    opacity: phase === 'insert' ? [0.3, 0.5, 0.3] : 0.3,
                  }}
                  transition={{ duration: 0.6 }}
                />
              </motion.div>

              {/* Soft shadow beneath card */}
              <motion.div
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-36 h-8 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)',
                  filter: 'blur(8px)',
                }}
                animate={{
                  opacity: phase === 'deck' || phase === 'complete' ? 0.2 : 0.6,
                  scale: phase === 'deck' || phase === 'complete' ? 0.8 : 1,
                }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
          </div>

          {/* Subtle vignette */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.2) 100%)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Hook for easy triggering
export const useCardInsertionAnimation = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [config, setConfig] = useState<{
    cardImage?: string;
    cardName?: string;
    isPremium?: boolean;
    onComplete?: () => void;
  }>({});

  const trigger = useCallback((options: {
    cardImage?: string;
    cardName?: string;
    isPremium?: boolean;
    onComplete?: () => void;
  } = {}) => {
    setConfig(options);
    setIsVisible(true);
  }, []);

  const handleComplete = useCallback(() => {
    config.onComplete?.();
    // Small delay before hiding to let exit animation play
    setTimeout(() => setIsVisible(false), 100);
  }, [config]);

  return {
    isVisible,
    trigger,
    animationProps: {
      isVisible,
      onComplete: handleComplete,
      cardImage: config.cardImage,
      cardName: config.cardName,
      isPremium: config.isPremium,
    },
  };
};

export default CardInsertionAnimation;
