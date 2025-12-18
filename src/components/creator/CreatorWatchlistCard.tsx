import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bookmark, Share2, Calendar, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, ExternalLink
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface WatchlistItem {
  id: string;
  price_when_added: number;
  added_at: string;
  is_active: boolean;
  market_item?: {
    id: string;
    name: string;
    current_price: number;
    change_24h: number;
    image_url?: string;
  };
}

interface CreatorWatchlistCardProps {
  watchlist: {
    id: string;
    title: string;
    thesis?: string;
    slug: string;
    created_at: string;
    updated_at: string;
    views_count: number;
    items?: WatchlistItem[];
  };
  creatorUsername: string;
}

export const CreatorWatchlistCard = ({ watchlist, creatorUsername }: CreatorWatchlistCardProps) => {
  const [expanded, setExpanded] = useState(false);
  
  const activeItems = watchlist.items?.filter(i => i.is_active) || [];
  const displayItems = expanded ? activeItems : activeItems.slice(0, 4);

  // Calculate average performance
  const avgPerformance = activeItems.length > 0
    ? activeItems.reduce((sum, item) => {
        if (!item.market_item || !item.price_when_added) return sum;
        return sum + ((item.market_item.current_price - item.price_when_added) / item.price_when_added) * 100;
      }, 0) / activeItems.length
    : 0;

  const shareUrl = `${window.location.origin}/@${creatorUsername}/watchlist/${watchlist.slug}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: watchlist.title,
          text: watchlist.thesis || `Check out this watchlist by @${creatorUsername}`,
          url: shareUrl
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-primary" />
              {watchlist.title}
            </CardTitle>
            {watchlist.thesis && (
              <p className="text-sm text-muted-foreground mt-1">
                {watchlist.thesis}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm mt-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {formatDistanceToNow(new Date(watchlist.created_at), { addSuffix: true })}
          </div>
          <Badge variant="outline">
            {activeItems.length} cards
          </Badge>
          {activeItems.length > 0 && (
            <div className={cn(
              "flex items-center gap-1 font-medium",
              avgPerformance > 0 ? "text-gain" : avgPerformance < 0 ? "text-loss" : "text-muted-foreground"
            )}>
              {avgPerformance > 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : avgPerformance < 0 ? (
                <ArrowDownRight className="h-4 w-4" />
              ) : null}
              Avg: {avgPerformance > 0 ? '+' : ''}{avgPerformance.toFixed(1)}%
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Items Grid */}
        {displayItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {displayItems.map((item) => {
              const priceChange = item.price_when_added && item.market_item
                ? ((item.market_item.current_price - item.price_when_added) / item.price_when_added) * 100
                : 0;
              const isPositive = priceChange > 0;

              return (
                <Link 
                  key={item.id} 
                  to={`/item/${item.market_item?.id}`}
                  className="block"
                >
                  <div className="group border rounded-lg p-2 hover:border-primary/50 transition-all">
                    {item.market_item?.image_url && (
                      <img 
                        src={item.market_item.image_url}
                        alt={item.market_item.name}
                        className="w-full aspect-[3/4] object-cover rounded bg-muted mb-2"
                      />
                    )}
                    <p className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
                      {item.market_item?.name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        ${item.market_item?.current_price.toLocaleString()}
                      </span>
                      <span className={cn(
                        "text-xs font-medium",
                        isPositive ? "text-gain" : priceChange < 0 ? "text-loss" : "text-muted-foreground"
                      )}>
                        {isPositive ? '+' : ''}{priceChange.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Added at ${item.price_when_added.toLocaleString()}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">
            No items in this watchlist yet
          </p>
        )}

        {/* Show More */}
        {activeItems.length > 4 && (
          <Button 
            variant="ghost" 
            className="w-full mt-3"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show Less' : `Show ${activeItems.length - 4} More`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
