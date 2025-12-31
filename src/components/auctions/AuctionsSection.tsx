import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gavel, Plus, ArrowRight } from 'lucide-react';
import { useAuctions } from '@/hooks/useAuctions';
import { AuctionCard } from './AuctionCard';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface AuctionsSectionProps {
  limit?: number;
  showHeader?: boolean;
  category?: string;
}

export const AuctionsSection = ({ 
  limit = 4, 
  showHeader = true,
  category 
}: AuctionsSectionProps) => {
  const navigate = useNavigate();
  const { auctions, isLoading } = useAuctions(category);

  const displayedAuctions = auctions?.slice(0, limit) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {showHeader && (
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!displayedAuctions.length) {
    return (
      <Card className="glass">
        <CardContent className="p-8 text-center">
          <Gavel className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No Active Auctions</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Be the first to create an auction listing
          </p>
          <Button onClick={() => navigate('/sell')} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Auction
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gavel className="w-6 h-6 text-primary" />
            <h2 className="font-display text-2xl font-bold text-foreground">Live Auctions</h2>
            <Badge variant="secondary" className="animate-pulse">
              {auctions?.length || 0} Active
            </Badge>
          </div>
          <Button variant="ghost" onClick={() => navigate('/auctions')} className="gap-2">
            View All
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {displayedAuctions.map((auction) => (
          <AuctionCard key={auction.id} auction={auction} />
        ))}
      </div>
    </div>
  );
};
