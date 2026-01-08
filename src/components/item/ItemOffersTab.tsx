import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DollarSign, Clock, TrendingUp } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ItemOffersTabProps {
  marketItemId: string;
  cardName: string;
  currentPrice?: number;
}

export const ItemOffersTab = ({ marketItemId, cardName, currentPrice }: ItemOffersTabProps) => {
  const { formatPrice } = useCurrency();

  const { data: buyOrders, isLoading } = useQuery({
    queryKey: ['item-buy-orders', marketItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buy_orders')
        .select('id, max_price, quantity, filled_quantity, condition, grade, created_at, buyer_id, status')
        .eq('market_item_id', marketItemId)
        .eq('status', 'active')
        .order('max_price', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch buyer profiles
      const buyerIds = [...new Set(data?.map(o => o.buyer_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', buyerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data?.map(order => ({
        ...order,
        buyer: profileMap.get(order.buyer_id) || { display_name: 'Buyer', avatar_url: null }
      })) || [];
    },
    enabled: !!marketItemId,
  });

  // Also fetch bids from bids table
  const { data: bids } = useQuery({
    queryKey: ['item-bids', marketItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bids')
        .select('id, bid_amount, grade, created_at, user_id, status')
        .eq('market_item_id', marketItemId)
        .eq('status', 'active')
        .order('bid_amount', { ascending: false })
        .limit(10);

      if (error) throw error;

      const userIds = [...new Set(data?.map(b => b.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data?.map(bid => ({
        ...bid,
        buyer: profileMap.get(bid.user_id) || { display_name: 'Buyer', avatar_url: null }
      })) || [];
    },
    enabled: !!marketItemId,
  });

  const allOffers = [
    ...(buyOrders?.map(o => ({
      id: o.id,
      type: 'buy_order' as const,
      amount: o.max_price,
      buyer: o.buyer,
      condition: o.condition,
      grade: o.grade,
      createdAt: o.created_at,
    })) || []),
    ...(bids?.map(b => ({
      id: b.id,
      type: 'bid' as const,
      amount: b.bid_amount,
      buyer: b.buyer,
      condition: null,
      grade: b.grade,
      createdAt: b.created_at,
    })) || []),
  ].sort((a, b) => b.amount - a.amount);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-5 h-5" />
            Active Offers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allOffers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-5 h-5" />
            Active Offers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-6">
            No active offers for this card yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const highestOffer = allOffers[0]?.amount || 0;
  const percentOfMarket = currentPrice && currentPrice > 0 
    ? ((highestOffer / currentPrice) * 100).toFixed(0)
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-5 h-5" />
            Active Offers ({allOffers.length})
          </CardTitle>
          {percentOfMarket && (
            <Badge variant="outline" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              Top offer at {percentOfMarket}% of market
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {allOffers.map((offer, index) => (
          <div 
            key={offer.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-colors",
              index === 0 ? "bg-primary/10 border border-primary/20" : "bg-secondary/30"
            )}
          >
            {/* Buyer Avatar */}
            <Avatar className="w-8 h-8">
              <AvatarImage src={offer.buyer?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {offer.buyer?.display_name?.charAt(0) || 'B'}
              </AvatarFallback>
            </Avatar>

            {/* Buyer & Details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {offer.buyer?.display_name || 'Buyer'}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(offer.createdAt), { addSuffix: true })}
                {offer.condition && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {offer.condition}
                  </Badge>
                )}
                {offer.grade && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {offer.grade}
                  </Badge>
                )}
              </div>
            </div>

            {/* Offer Amount */}
            <div className="text-right">
              <p className={cn(
                "font-bold",
                index === 0 ? "text-primary" : "text-foreground"
              )}>
                {formatPrice(offer.amount)}
              </p>
              <Badge variant="secondary" className="text-[9px]">
                {offer.type === 'buy_order' ? 'Buy Order' : 'Bid'}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
