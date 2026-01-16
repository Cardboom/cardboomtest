import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { BoomPackCard } from '@/hooks/useBoomPacks';

interface PackOpeningAnimationProps {
  isOpen: boolean;
  packName: string;
  packImage?: string | null;
  cards: BoomPackCard[];
  bonusGems: number;
  onComplete: () => void;
}

type Phase = 'idle' | 'shake' | 'tear' | 'burst' | 'reveal' | 'complete';

const rarityColors: Record<string, string> = {
  common: 'from-slate-400 to-slate-600',
  uncommon: 'from-emerald-400 to-emerald-600',
  rare: 'from-blue-400 to-blue-600',
  ultra_rare: 'from-amber-400 via-yellow-300 to-amber-500'
};

const rarityGlow: Record<string, string> = {
  common: 'shadow-slate-400/30',
  uncommon: 'shadow-emerald-400/40',
  rare: 'shadow-blue-400/50',
  ultra_rare: 'shadow-amber-400/60'
};

export const PackOpeningAnimation: React.FC<PackOpeningAnimationProps> = ({
  isOpen,
  packName,
  packImage,
  cards,
  bonusGems,
  onComplete
}) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [revealedCards, setRevealedCards] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) {
      setPhase('idle');
      setRevealedCards(0);
      return;
    }

    // Animation sequence timing
    const sequence = async () => {
      setPhase('shake');
      await delay(800);
      setPhase('tear');
      await delay(600);
      setPhase('burst');
      await delay(500);
      setPhase('reveal');
      
      // Staggered card reveal
      for (let i = 0; i < cards.length; i++) {
        await delay(400);
        setRevealedCards(i + 1);
      }
      
      await delay(1000);
      setPhase('complete');
    };

    sequence();
  }, [isOpen, cards.length]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <div className="relative w-full max-w-2xl px-4">
          {/* Pack Container */}
          <AnimatePresence mode="wait">
            {(phase === 'idle' || phase === 'shake' || phase === 'tear') && (
              <motion.div
                key="pack"
                className="flex flex-col items-center"
                animate={phase === 'shake' ? {
                  x: [0, -10, 10, -10, 10, -5, 5, 0],
                  rotate: [0, -2, 2, -2, 2, -1, 1, 0],
                } : {}}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              >
                {/* Pack Card */}
                <motion.div
                  className="relative w-64 h-80 rounded-2xl overflow-hidden"
                  animate={phase === 'tear' ? {
                    scaleY: [1, 1.02, 0.98, 1.05, 0],
                    opacity: [1, 1, 1, 0.8, 0]
                  } : {}}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                >
                  {/* Pack Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-primary-foreground/20">
                    {packImage ? (
                      <img 
                        src={packImage} 
                        alt={packName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="w-20 h-20 text-primary-foreground/50" />
                      </div>
                    )}
                  </div>

                  {/* Shine Effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent"
                    animate={{
                      x: ['-100%', '200%'],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 1
                    }}
                  />

                  {/* Pack Label */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-white font-bold text-center">{packName}</p>
                  </div>
                </motion.div>

                {/* Glow Effect during shake */}
                {phase === 'shake' && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    initial={{ boxShadow: '0 0 0 0 rgba(var(--primary), 0)' }}
                    animate={{ 
                      boxShadow: [
                        '0 0 20px 10px rgba(var(--primary), 0.3)',
                        '0 0 40px 20px rgba(var(--primary), 0.5)',
                        '0 0 20px 10px rgba(var(--primary), 0.3)'
                      ]
                    }}
                    transition={{ duration: 0.3, repeat: Infinity }}
                  />
                )}
              </motion.div>
            )}

            {/* Burst Effect */}
            {phase === 'burst' && (
              <motion.div
                key="burst"
                className="flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.5, 1] }}
                transition={{ duration: 0.5 }}
              >
                <div className="relative">
                  {/* Central Glow */}
                  <motion.div
                    className="w-40 h-40 rounded-full bg-gradient-radial from-primary via-primary/50 to-transparent"
                    animate={{
                      scale: [1, 2, 2.5],
                      opacity: [1, 0.5, 0]
                    }}
                    transition={{ duration: 0.5 }}
                  />
                  
                  {/* Particle Effects */}
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-4 h-4 bg-primary rounded-full"
                      initial={{ 
                        x: 0, 
                        y: 0,
                        opacity: 1 
                      }}
                      animate={{
                        x: Math.cos((i * 45) * Math.PI / 180) * 150,
                        y: Math.sin((i * 45) * Math.PI / 180) * 150,
                        opacity: 0,
                        scale: [1, 0.5]
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      style={{
                        left: '50%',
                        top: '50%',
                        marginLeft: -8,
                        marginTop: -8
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Card Reveal */}
            {(phase === 'reveal' || phase === 'complete') && (
              <motion.div
                key="cards"
                className="flex flex-col items-center gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.h2
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-2xl font-bold text-white text-center"
                >
                  You opened a Boom Pack
                </motion.h2>

                {/* Cards Grid */}
                <div className="flex flex-wrap justify-center gap-4 max-w-lg">
                  {cards.map((card, index) => (
                    <motion.div
                      key={card.id}
                      initial={{ 
                        y: 50, 
                        opacity: 0, 
                        scale: 0.8,
                        rotateY: 180 
                      }}
                      animate={index < revealedCards ? { 
                        y: 0, 
                        opacity: 1, 
                        scale: 1,
                        rotateY: 0 
                      } : {}}
                      transition={{ 
                        duration: 0.4,
                        type: "spring",
                        stiffness: 200
                      }}
                      className={`
                        relative w-32 h-44 rounded-xl overflow-hidden
                        bg-gradient-to-br ${rarityColors[card.rarity] || rarityColors.common}
                        shadow-lg ${rarityGlow[card.rarity] || rarityGlow.common}
                      `}
                    >
                      {/* Card Image or Placeholder */}
                      {card.card_image_url ? (
                        <img 
                          src={card.card_image_url} 
                          alt={card.card_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-2">
                          <div className="text-center">
                            <Sparkles className="w-8 h-8 mx-auto mb-2 text-white/70" />
                            <p className="text-xs text-white/90 font-medium leading-tight">
                              {card.card_name}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Rarity Badge */}
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-black/40 text-white rounded-full">
                          {card.rarity.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Ultra Rare Shimmer */}
                      {card.rarity === 'ultra_rare' && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity,
                            repeatDelay: 0.5 
                          }}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Bonus Gems */}
                {bonusGems > 0 && phase === 'complete' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full shadow-lg"
                  >
                    <p className="text-black font-bold flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Guaranteed Value Bonus: +{bonusGems} Gems
                    </p>
                  </motion.div>
                )}

                {/* Collection Message */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-muted-foreground text-center"
                >
                  These cards are now in your collection
                </motion.p>

                {/* Continue Button */}
                {phase === 'complete' && (
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    onClick={onComplete}
                    className="mt-4 px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Continue
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PackOpeningAnimation;
