import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, TrendingDown, Clock, Eye, Share2, 
  ArrowUpRight, ArrowDownRight, Minus, AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ShareCallDialog } from './ShareCallDialog';
import { cn } from '@/lib/utils';

interface MarketCallCardProps {
  call: {
    id: string;
    call_type: string;
    price_at_call: number;
    thesis?: string;
    created_at: string;
    outcome_status?: string;
    price_change_percent?: number;
    current_price?: number;
    liquidity_at_call?: string;
    market_item?: {
      id: string;
      name: string;
      current_price: number;
      change_24h: number;
      image_url?: string;
      category: string;
    };
  };
  creatorUsername: string;
}

const callTypeConfig = {
  buy: { 
    label: 'BUY', 
    color: 'bg-gain/20 text-gain border-gain/30',
    icon: TrendingUp
  },
  sell: { 
    label: 'SELL', 
    color: 'bg-loss/20 text-loss border-loss/30',
    icon: TrendingDown
  },
  hold: { 
    label: 'HOLD', 
    color: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
    icon: Minus
  },
  watch: { 
    label: 'WATCH', 
    color: 'bg-primary/20 text-primary border-primary/30',
    icon: Eye
  }
};

const outcomeConfig = {
  active: { label: 'Active', color: 'bg-muted text-muted-foreground' },
  played_out: { label: 'Played Out', color: 'bg-muted text-muted-foreground' },
  still_developing: { label: 'Still Developing', color: 'bg-amber-500/20 text-amber-600' },
  contradicted: { label: 'Contradicted', color: 'bg-loss/20 text-loss' }
};

export const MarketCallCard = ({ call, creatorUsername }: MarketCallCardProps) => {
  const [shareOpen, setShareOpen] = useState(false);
  
  const config = callTypeConfig[call.call_type as keyof typeof callTypeConfig] || callTypeConfig.watch;
  const Icon = config.icon;
  const outcome = outcomeConfig[call.outcome_status as keyof typeof outcomeConfig] || outcomeConfig.active;
  
  const priceChange = call.price_change_percent || 0;
  const isPositive = priceChange > 0;
  const currentPrice = call.current_price || call.market_item?.current_price || 0;

  // Determine if call was successful
  const isSuccessful = 
    (call.call_type === 'buy' && priceChange > 10) ||
    (call.call_type === 'sell' && priceChange < -10);

  return (
    <>
      <Card className={cn(
        "overflow-hidden transition-all hover:shadow-md",
        isSuccessful && "border-gain/30 bg-gain/5"
      )}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Card Image */}
            {call.market_item?.image_url && (
              <Link to={`/item/${call.market_item.id}`} className="flex-shrink-0">
                <img 
                  src={call.market_item.image_url} 
                  alt={call.market_item.name}
                  className="w-20 h-28 object-cover rounded-lg bg-muted"
                />
              </Link>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn("font-bold", config.color)}>
                    <Icon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                  {call.outcome_status && call.outcome_status !== 'active' && (
                    <Badge variant="outline" className={outcome.color}>
                      {outcome.label}
                    </Badge>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setShareOpen(true)}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Card Name */}
              <Link 
                to={`/item/${call.market_item?.id}`}
                className="font-semibold hover:text-primary transition-colors line-clamp-1"
              >
                {call.market_item?.name || 'Unknown Card'}
              </Link>

              {/* Thesis */}
              {call.thesis && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  "{call.thesis}"
                </p>
              )}

              {/* Price Info */}
              <div className="flex items-center gap-4 mt-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Call Price: </span>
                  <span className="font-medium">${call.price_at_call.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Current: </span>
                  <span className="font-medium">${currentPrice.toLocaleString()}</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1 font-semibold",
                  isPositive ? "text-gain" : priceChange < 0 ? "text-loss" : "text-muted-foreground"
                )}>
                  {isPositive ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : priceChange < 0 ? (
                    <ArrowDownRight className="h-4 w-4" />
                  ) : null}
                  {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
                </div>
              </div>

              {/* Timestamp & Context */}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                </div>
                {call.liquidity_at_call && (
                  <div>
                    Liquidity: {call.liquidity_at_call}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ShareCallDialog 
        open={shareOpen} 
        onOpenChange={setShareOpen}
        call={call}
        creatorUsername={creatorUsername}
      />
    </>
  );
};
