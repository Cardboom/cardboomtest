import { Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProBadgeProps {
  className?: string;
  showText?: boolean;
}

export const ProBadge = ({ className, showText = true }: ProBadgeProps) => {
  return (
    <Badge 
      className={`gap-1 bg-gradient-to-r from-gold to-premium text-background border-0 ${className}`}
    >
      <Crown className="h-3 w-3" />
      {showText && 'PRO'}
    </Badge>
  );
};
