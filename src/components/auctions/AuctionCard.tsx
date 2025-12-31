import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gavel, Clock, Users, Zap, TrendingUp } from 'lucide-react';
import { useAuctions } from '@/hooks/useAuctions';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AuctionCardProps {
  auction: {
    id: string;
    title: string;
    image_url: string | null;
    category: string;
    condition: string;
    starting_price: number;
    current_bid: number | null;
    buy_now_price: number | null;
    bid_increment: number;
    bid_count: number;
    ends_at: string;
    status: string;
  };
}

export const AuctionCard = ({ auction }: AuctionCardProps) => {
  const [bidAmount, setBidAmount] = useState('');
  const [maxBid, setMaxBid] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { placeBid, buyNow } = useAuctions();

  const currentPrice = auction.current_bid || auction.starting_price;
  const minBid = auction.current_bid 
    ? auction.current_bid + auction.bid_increment 
    : auction.starting_price;

  useEffect(() => {
    const updateTimeLeft = () => {
      const end = new Date(auction.ends_at);
      const now = new Date();
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Ended');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        setTimeLeft(formatDistanceToNow(end, { addSuffix: true }));
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [auction.ends_at]);

  const handlePlaceBid = () => {
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < minBid) {
      return;
    }
    placeBid.mutate({
      auctionId: auction.id,
      amount,
      maxBid: maxBid ? parseFloat(maxBid) : undefined,
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setBidAmount('');
        setMaxBid('');
      },
    });
  };

  const isEnding = new Date(auction.ends_at).getTime() - Date.now() < 3600000; // 1 hour

  return (
    <Card className="glass overflow-hidden group hover:border-primary/30 transition-all">
      <div className="relative aspect-square bg-secondary">
        {auction.image_url ? (
          <img 
            src={auction.image_url} 
            alt={auction.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gavel className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Time Badge */}
        <Badge 
          className={cn(
            "absolute top-2 right-2 gap-1",
            isEnding ? "bg-loss animate-pulse" : "bg-background/80 text-foreground"
          )}
        >
          <Clock className="w-3 h-3" />
          {timeLeft}
        </Badge>

        {/* Buy Now Badge */}
        {auction.buy_now_price && (
          <Badge className="absolute top-2 left-2 bg-primary gap-1">
            <Zap className="w-3 h-3" />
            Buy Now
          </Badge>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-1">{auction.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">{auction.category}</Badge>
            <Badge variant="secondary" className="text-xs">{auction.condition}</Badge>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">
              {auction.current_bid ? 'Current Bid' : 'Starting Bid'}
            </p>
            <p className="text-xl font-bold text-foreground">
              ${currentPrice.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-3 h-3" />
              <span className="text-xs">{auction.bid_count} bids</span>
            </div>
            {auction.buy_now_price && (
              <p className="text-sm text-primary font-medium">
                or ${auction.buy_now_price.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2">
              <Gavel className="w-4 h-4" />
              Place Bid
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Place a Bid</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground">{auction.title}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-muted-foreground">Current Bid:</span>
                  <span className="font-bold text-lg">${currentPrice.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Minimum Bid:</span>
                  <span className="text-primary font-semibold">${minBid.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Your Bid ($)</Label>
                <Input
                  type="number"
                  placeholder={`Min: $${minBid}`}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  min={minBid}
                  step={auction.bid_increment}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Auto-Bid (Optional)</Label>
                <Input
                  type="number"
                  placeholder="We'll bid for you up to this amount"
                  value={maxBid}
                  onChange={(e) => setMaxBid(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  We'll automatically increase your bid to stay winning
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 gap-2"
                  onClick={handlePlaceBid}
                  disabled={placeBid.isPending || !bidAmount || parseFloat(bidAmount) < minBid}
                >
                  <Gavel className="w-4 h-4" />
                  Bid ${bidAmount || minBid}
                </Button>
              </div>

              {auction.buy_now_price && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">or</span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="secondary" 
                    className="w-full gap-2"
                    onClick={() => buyNow.mutate(auction.id)}
                    disabled={buyNow.isPending}
                  >
                    <Zap className="w-4 h-4" />
                    Buy Now for ${auction.buy_now_price.toLocaleString()}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
