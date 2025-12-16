import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveUpdateIndicatorProps {
  lastUpdated: Date | null;
  isConnected?: boolean;
  updateCount?: number;
  className?: string;
}

export const LiveUpdateIndicator = ({ 
  lastUpdated, 
  isConnected = true,
  updateCount = 0,
  className 
}: LiveUpdateIndicatorProps) => {
  const [timeSince, setTimeSince] = useState<string>('');
  const [pulse, setPulse] = useState(false);

  // Update time since display every second
  useEffect(() => {
    const updateTime = () => {
      if (!lastUpdated) {
        setTimeSince('Syncing...');
        return;
      }
      
      const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      
      if (seconds < 5) {
        setTimeSince('Just now');
      } else if (seconds < 60) {
        setTimeSince(`${seconds}s ago`);
      } else if (seconds < 3600) {
        setTimeSince(`${Math.floor(seconds / 60)}m ago`);
      } else {
        setTimeSince(`${Math.floor(seconds / 3600)}h ago`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Pulse animation when update count changes
  useEffect(() => {
    if (updateCount > 0) {
      setPulse(true);
      const timeout = setTimeout(() => setPulse(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [updateCount]);

  return (
    <div className={cn(
      "flex items-center gap-2 text-xs text-muted-foreground",
      className
    )}>
      <Clock className="w-3 h-3" />
      <span className={cn(
        "transition-all duration-300",
        pulse && "text-primary font-medium"
      )}>
        Updated {timeSince}
      </span>
      <span className={cn(
        "w-2 h-2 rounded-full",
        isConnected ? "bg-gain animate-pulse" : "bg-loss"
      )} />
    </div>
  );
};
