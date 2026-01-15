import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { tierColors, tierBgColors } from '@/hooks/useAchievements';
import { Button } from '@/components/ui/button';

interface UnlockedAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  xp_reward: number;
}

interface AchievementUnlockNotificationProps {
  achievement: UnlockedAchievement | null;
  onClose: () => void;
}

const AchievementUnlockNotification = ({ achievement, onClose }: AchievementUnlockNotificationProps) => {
  if (!achievement) return null;

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Particle effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0,
                  x: '50vw',
                  y: '50vh',
                  scale: 0
                }}
                animate={{ 
                  opacity: [0, 1, 0],
                  x: `${Math.random() * 100}vw`,
                  y: `${Math.random() * 100}vh`,
                  scale: [0, 1, 0]
                }}
                transition={{ 
                  duration: 2,
                  delay: Math.random() * 0.5,
                  ease: "easeOut"
                }}
                className={`absolute w-2 h-2 rounded-full bg-gradient-to-r ${tierColors[achievement.tier]}`}
              />
            ))}
          </div>

          {/* Main notification card */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative"
          >
            {/* Glow effect */}
            <div className={`absolute inset-0 blur-3xl opacity-30 bg-gradient-to-r ${tierColors[achievement.tier]} rounded-3xl`} />
            
            <div className={`relative p-8 rounded-2xl border-2 ${tierBgColors[achievement.tier]} bg-card shadow-2xl max-w-sm mx-4`}>
              {/* Close button - more prominent */}
              <Button
                variant="outline"
                size="icon"
                className="absolute -top-3 -right-3 h-10 w-10 rounded-full bg-card border-2 border-border shadow-lg hover:bg-destructive hover:text-destructive-foreground hover:border-destructive z-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Achievement unlocked header */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-4"
              >
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                  <span className="text-sm font-bold uppercase tracking-wider">Achievement Unlocked!</span>
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
              </motion.div>

              {/* Icon with animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="flex justify-center mb-4"
              >
                <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${tierColors[achievement.tier]} flex items-center justify-center shadow-lg`}>
                  <span className="text-5xl">{achievement.icon}</span>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-2 border-dashed border-white/30"
                  />
                </div>
              </motion.div>

              {/* Achievement details */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center"
              >
                <h3 className="text-xl font-bold text-foreground mb-2">{achievement.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{achievement.description}</p>
                
                {/* XP reward */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold"
                >
                  <span className="text-lg">+{achievement.xp_reward}</span>
                  <span className="text-sm">XP</span>
                </motion.div>

                {/* Tier badge */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="mt-4"
                >
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase bg-gradient-to-r ${tierColors[achievement.tier]} text-white`}>
                    {achievement.tier}
                  </span>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AchievementUnlockNotification;
