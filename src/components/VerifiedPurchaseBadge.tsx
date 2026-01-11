import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface VerifiedPurchaseBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const VerifiedPurchaseBadge = ({ 
  className, 
  size = 'sm',
  showText = true 
}: VerifiedPurchaseBadgeProps) => {
  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-1.5',
    lg: 'text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span 
          className={cn(
            'inline-flex items-center text-primary font-medium',
            sizeClasses[size],
            className
          )}
        >
          <ShieldCheck className={cn(iconSizes[size], 'text-primary')} />
          {showText && <span>Verified Purchase</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">This reviewer purchased this item through CardBoom</p>
      </TooltipContent>
    </Tooltip>
  );
};

interface AuthenticityBadgeProps {
  confidence: number;
  className?: string;
}

export const AuthenticityBadge = ({ confidence, className }: AuthenticityBadgeProps) => {
  const isHigh = confidence >= 0.85;
  const isMedium = confidence >= 0.6 && confidence < 0.85;
  const isLow = confidence < 0.6;

  const badgeConfig = isHigh 
    ? { color: 'text-gain bg-gain/10 border-gain/30', label: 'Authentic', icon: BadgeCheck }
    : isMedium 
    ? { color: 'text-amber-500 bg-amber-500/10 border-amber-500/30', label: 'Review Recommended', icon: ShieldCheck }
    : { color: 'text-loss bg-loss/10 border-loss/30', label: 'Verification Needed', icon: ShieldCheck };

  const Icon = badgeConfig.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span 
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border',
            badgeConfig.color,
            className
          )}
        >
          <Icon className="w-3 h-3" />
          {badgeConfig.label}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <p className="font-medium">Authenticity Confidence: {Math.round(confidence * 100)}%</p>
          {isHigh && <p>Our AI is highly confident this card is authentic.</p>}
          {isMedium && <p>Some elements couldn't be fully verified. Manual review suggested.</p>}
          {isLow && <p>This card requires additional verification before listing.</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
