import { AlertTriangle, TrendingDown, Clock, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type WarningType = 'below_market' | 'above_market' | 'low_demand' | 'volatile' | 'info';

interface PriceWarningProps {
  type: WarningType;
  message?: string;
  percentDiff?: number;
  className?: string;
}

const warningConfig: Record<WarningType, {
  icon: typeof AlertTriangle;
  color: string;
  bgColor: string;
  defaultMessage: string;
}> = {
  below_market: {
    icon: TrendingDown,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    defaultMessage: 'This price is significantly below market value',
  },
  above_market: {
    icon: AlertTriangle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
    defaultMessage: 'This price is above typical market value',
  },
  low_demand: {
    icon: Clock,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    defaultMessage: 'Low demand - may take longer to sell',
  },
  volatile: {
    icon: AlertTriangle,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    defaultMessage: 'Prices for this item fluctuate frequently',
  },
  info: {
    icon: Info,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50 border-border',
    defaultMessage: '',
  },
};

export const PriceWarning = ({ 
  type, 
  message, 
  percentDiff,
  className 
}: PriceWarningProps) => {
  const config = warningConfig[type];
  const Icon = config.icon;

  const displayMessage = message || config.defaultMessage;
  const percentText = percentDiff 
    ? ` (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(0)}% vs market)`
    : '';

  return (
    <div className={cn(
      "flex items-start gap-2 p-3 rounded-lg border text-sm",
      config.bgColor,
      className
    )}>
      <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", config.color)} />
      <span className="text-foreground">
        {displayMessage}
        {percentText && <span className={config.color}>{percentText}</span>}
      </span>
    </div>
  );
};

// Inline warning for forms/inputs
export const InlinePriceWarning = ({ 
  listPrice, 
  marketPrice 
}: { 
  listPrice: number; 
  marketPrice: number;
}) => {
  const diff = ((listPrice - marketPrice) / marketPrice) * 100;
  
  // No warning if within 20% of market
  if (Math.abs(diff) < 20) return null;

  if (diff < -30) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-500 mt-1">
        <TrendingDown className="w-3 h-3" />
        <span>This is far below market ({diff.toFixed(0)}%)</span>
      </div>
    );
  }

  if (diff > 30) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-orange-500 mt-1">
        <AlertTriangle className="w-3 h-3" />
        <span>This is above market (+{diff.toFixed(0)}%)</span>
      </div>
    );
  }

  return null;
};

// Non-blocking suggestion for listings
export const ListingSuggestion = ({ 
  suggestedPrice, 
  currentPrice,
  onApply,
}: { 
  suggestedPrice: number; 
  currentPrice: number;
  onApply?: (price: number) => void;
}) => {
  const diff = ((currentPrice - suggestedPrice) / suggestedPrice) * 100;
  
  if (Math.abs(diff) < 10) return null;

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/10 text-sm">
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 text-primary" />
        <span>
          Suggested: <strong>${suggestedPrice.toFixed(2)}</strong>
          <span className="text-muted-foreground ml-1">
            ({diff > 0 ? '+' : ''}{diff.toFixed(0)}% from your price)
          </span>
        </span>
      </div>
      {onApply && (
        <button 
          onClick={() => onApply(suggestedPrice)}
          className="text-primary hover:underline text-xs"
        >
          Apply
        </button>
      )}
    </div>
  );
};
