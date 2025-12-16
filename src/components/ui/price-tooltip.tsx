import { Info, Clock, Database, TrendingUp, BarChart3 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface PriceTooltipProps {
  price: number;
  lastUpdated?: Date | string | null;
  salesCount?: number;
  dataSource?: string;
  confidence?: 'high' | 'medium' | 'low';
  children: React.ReactNode;
  className?: string;
}

export const PriceTooltip = ({
  price,
  lastUpdated,
  salesCount,
  dataSource = 'Market Average',
  confidence = 'medium',
  children,
  className,
}: PriceTooltipProps) => {
  const lastUpdatedDate = lastUpdated 
    ? new Date(lastUpdated) 
    : new Date();
  
  const timeAgo = formatDistanceToNow(lastUpdatedDate, { addSuffix: true });

  const confidenceConfig = {
    high: { color: 'text-gain', label: 'High confidence', bg: 'bg-gain/10' },
    medium: { color: 'text-amber-500', label: 'Medium confidence', bg: 'bg-amber-500/10' },
    low: { color: 'text-loss', label: 'Low confidence', bg: 'bg-loss/10' },
  };

  const conf = confidenceConfig[confidence];

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-1 cursor-help", className)}>
            {children}
            <Info className="w-3 h-3 text-muted-foreground opacity-50 hover:opacity-100 transition-opacity" />
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="p-3 max-w-xs bg-popover border border-border shadow-xl"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="font-semibold">Price Details</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                Source
              </span>
              <span className="font-medium">{dataSource}</span>
            </div>

            {salesCount !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Based on
                </span>
                <span className="font-medium">{salesCount} recent sales</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Updated
              </span>
              <span className="font-medium">{timeAgo}</span>
            </div>

            <div className={cn("flex items-center gap-2 px-2 py-1.5 rounded-md text-xs mt-2", conf.bg)}>
              <span className={cn("w-2 h-2 rounded-full", conf.color.replace('text-', 'bg-'))} />
              <span className={conf.color}>{conf.label}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Simpler inline version for tables
export const PriceSourceBadge = ({ 
  source, 
  lastUpdated 
}: { 
  source: string; 
  lastUpdated?: Date | string;
}) => {
  const timeAgo = lastUpdated 
    ? formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })
    : 'recently';

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-help hover:text-foreground transition-colors">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>Data from {source}</p>
          <p className="text-muted-foreground">Updated {timeAgo}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
