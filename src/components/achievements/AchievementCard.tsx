import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Achievement, tierColors, tierBgColors } from '@/hooks/useAchievements';
import { format } from 'date-fns';
import { Lock, Sparkles } from 'lucide-react';

interface AchievementCardProps {
  achievement: Achievement & { earned: boolean; earnedAt?: string };
  compact?: boolean;
}

export const AchievementCard = ({ achievement, compact }: AchievementCardProps) => {
  const { icon, name, description, tier, xp_reward, earned, earnedAt } = achievement;

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        className={cn(
          'relative flex items-center gap-2 p-2 rounded-lg border transition-all',
          earned ? tierBgColors[tier] : 'bg-muted/30 border-border/50 opacity-60'
        )}
      >
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-lg',
          earned ? `bg-gradient-to-br ${tierColors[tier]}` : 'bg-muted'
        )}>
          {earned ? icon : <Lock className="w-4 h-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{name}</p>
        </div>
        {earned && (
          <Sparkles className="w-3 h-3 text-yellow-500" />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn(
        'relative p-4 rounded-xl border transition-all',
        earned ? tierBgColors[tier] : 'bg-muted/20 border-border/50'
      )}
    >
      {earned && (
        <div className="absolute -top-1 -right-1">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
          >
            <Sparkles className="w-5 h-5 text-yellow-500" />
          </motion.div>
        </div>
      )}
      
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0',
          earned 
            ? `bg-gradient-to-br ${tierColors[tier]} shadow-lg` 
            : 'bg-muted'
        )}>
          {earned ? icon : <Lock className="w-6 h-6 text-muted-foreground" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn(
              'font-semibold text-sm',
              earned ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {name}
            </h4>
            <span className={cn(
              'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
              earned ? `bg-gradient-to-r ${tierColors[tier]} text-white` : 'bg-muted text-muted-foreground'
            )}>
              {tier}
            </span>
          </div>
          
          <p className={cn(
            'text-xs mb-2',
            earned ? 'text-muted-foreground' : 'text-muted-foreground/60'
          )}>
            {description}
          </p>
          
          <div className="flex items-center justify-between">
            <span className={cn(
              'text-xs font-medium',
              earned ? 'text-primary' : 'text-muted-foreground'
            )}>
              +{xp_reward} XP
            </span>
            
            {earned && earnedAt && (
              <span className="text-[10px] text-muted-foreground">
                Earned {format(new Date(earnedAt), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
