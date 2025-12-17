import { motion } from 'framer-motion';
import { Shield, Star, Crown, Gem, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ReputationBadgeProps {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  score: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const TIER_CONFIG = {
  bronze: {
    icon: Shield,
    color: 'text-amber-700',
    bgColor: 'bg-amber-700/20',
    borderColor: 'border-amber-700/50',
    label: 'Bronze',
    nextTier: 'silver',
    threshold: 200
  },
  silver: {
    icon: Star,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/20',
    borderColor: 'border-gray-400/50',
    label: 'Silver',
    nextTier: 'gold',
    threshold: 400
  },
  gold: {
    icon: Award,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/50',
    label: 'Gold',
    nextTier: 'platinum',
    threshold: 600
  },
  platinum: {
    icon: Crown,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/20',
    borderColor: 'border-cyan-400/50',
    label: 'Platinum',
    nextTier: 'diamond',
    threshold: 800
  },
  diamond: {
    icon: Gem,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/20',
    borderColor: 'border-purple-400/50',
    label: 'Diamond',
    nextTier: null,
    threshold: 1000
  }
};

export function ReputationBadge({ tier, score, showScore = false, size = 'md' }: ReputationBadgeProps) {
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const containerClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border font-medium",
              config.bgColor,
              config.borderColor,
              config.color,
              containerClasses[size]
            )}
          >
            <Icon className={sizeClasses[size]} />
            <span>{config.label}</span>
            {showScore && (
              <span className="opacity-70">({score})</span>
            )}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{config.label} Reputation</p>
            <p className="text-muted-foreground">Score: {score}/1000</p>
            {config.nextTier && (
              <p className="text-muted-foreground">
                {config.threshold - score} points to {TIER_CONFIG[config.nextTier as keyof typeof TIER_CONFIG].label}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
