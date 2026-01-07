import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Gavel, Clock, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuctionCountdownBadgeProps {
  startsAt: string;
  endsAt: string;
  status: string;
  currentBid?: number;
  bidCount?: number;
  className?: string;
  size?: 'sm' | 'md';
}

export const AuctionCountdownBadge = ({
  startsAt,
  endsAt,
  status,
  currentBid,
  bidCount = 0,
  className,
  size = 'sm',
}: AuctionCountdownBadgeProps) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isEnding, setIsEnding] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const start = new Date(startsAt).getTime();
      const end = new Date(endsAt).getTime();

      if (status !== 'active') {
        setTimeRemaining(status === 'sold' ? 'Sold' : status === 'ended' ? 'Ended' : 'Inactive');
        return;
      }

      // Not started yet
      if (now < start) {
        const diff = start - now;
        setTimeRemaining(formatTime(diff));
        setIsStarting(true);
        setIsEnding(false);
        return;
      }

      // Active auction
      if (now < end) {
        const diff = end - now;
        setTimeRemaining(formatTime(diff));
        setIsStarting(false);
        setIsEnding(diff < 3600000); // Last hour
        return;
      }

      // Ended
      setTimeRemaining('Ended');
      setIsEnding(false);
    };

    const formatTime = (ms: number) => {
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);

      if (days > 0) return `${days}d ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      if (minutes > 0) return `${minutes}m ${seconds}s`;
      return `${seconds}s`;
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [startsAt, endsAt, status]);

  if (status !== 'active' && status !== 'scheduled') {
    return null;
  }

  const isSmall = size === 'sm';

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Badge
        className={cn(
          'gap-1 font-mono',
          isEnding && 'bg-destructive text-destructive-foreground animate-pulse',
          isStarting && 'bg-amber-500/20 text-amber-500 border-amber-500/30',
          !isEnding && !isStarting && 'bg-primary/20 text-primary border-primary/30',
          isSmall ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
        )}
        variant="outline"
      >
        {isStarting ? (
          <>
            <Clock className={isSmall ? 'h-3 w-3' : 'h-4 w-4'} />
            Starts in {timeRemaining}
          </>
        ) : (
          <>
            <Timer className={isSmall ? 'h-3 w-3' : 'h-4 w-4'} />
            {isEnding ? 'Ending ' : ''}{timeRemaining}
          </>
        )}
      </Badge>
      
      {bidCount > 0 && (
        <div className={cn(
          'flex items-center gap-1 text-muted-foreground',
          isSmall ? 'text-xs' : 'text-sm'
        )}>
          <Gavel className={isSmall ? 'h-3 w-3' : 'h-4 w-4'} />
          {bidCount} bid{bidCount !== 1 ? 's' : ''}
          {currentBid && (
            <span className="font-medium text-foreground ml-1">
              ${currentBid.toLocaleString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
