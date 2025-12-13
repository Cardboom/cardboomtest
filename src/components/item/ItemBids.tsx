import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Gavel, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ItemBidsProps {
  itemId?: string;
  itemName: string;
}

export const ItemBids = ({ itemId, itemName }: ItemBidsProps) => {
  const { data: bids, isLoading } = useQuery({
    queryKey: ['item-bids', itemId, itemName],
    queryFn: async () => {
      let query = supabase
        .from('bids')
        .select('*')
        .eq('status', 'active')
        .order('bid_amount', { ascending: false })
        .limit(10);

      if (itemId) {
        query = query.eq('market_item_id', itemId);
      } else {
        query = query.ilike('item_name', `%${itemName}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="w-5 h-5" />
            Active Bids
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel className="w-5 h-5 text-primary" />
          Active Bids
          {bids && bids.length > 0 && (
            <Badge variant="secondary">{bids.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bids && bids.length > 0 ? (
          <div className="space-y-3">
            {bids.map((bid: any, index: number) => (
              <div
                key={bid.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                  #{index + 1}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60">
                    ?
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {formatPrice(bid.bid_amount)}
                    </span>
                    {bid.max_bid && (
                      <Badge variant="outline" className="text-xs">
                        Max: {formatPrice(bid.max_bid)}
                      </Badge>
                    )}
                    {bid.grade !== 'any' && (
                      <Badge variant="secondary" className="text-xs uppercase">
                        {bid.grade}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Gavel className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">No active bids yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to place a bid!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
