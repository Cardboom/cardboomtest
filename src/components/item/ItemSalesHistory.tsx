import { Clock, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ItemSalesHistoryProps {
  itemId: string;
}

interface Sale {
  id: string;
  price: number;
  created_at: string;
  status: string;
  condition?: string;
}

export const ItemSalesHistory = ({ itemId }: ItemSalesHistoryProps) => {
  // Fetch real orders for this market item
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['item-sales', itemId],
    queryFn: async () => {
      // First get listings for this market item, then get completed orders
      const { data: listings } = await supabase
        .from('listings')
        .select('id, title, condition')
        .ilike('title', `%${itemId.split('-').slice(0, 2).join(' ')}%`);

      if (!listings?.length) return [];

      const listingIds = listings.map(l => l.id);
      
      const { data: orders } = await supabase
        .from('orders')
        .select('id, price, created_at, status, listing_id')
        .in('listing_id', listingIds)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

      return orders?.map(order => {
        const listing = listings.find(l => l.id === order.listing_id);
        return {
          id: order.id,
          price: order.price,
          created_at: order.created_at,
          status: order.status,
          condition: listing?.condition || 'Near Mint'
        };
      }) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <h3 className="font-display text-xl font-semibold text-foreground">Recent Sales</h3>
          <p className="text-muted-foreground text-sm mt-1">Loading...</p>
        </div>
        <div className="p-8 flex justify-center">
          <div className="animate-pulse w-full space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-secondary/50 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <h3 className="font-display text-xl font-semibold text-foreground">Recent Sales</h3>
          <p className="text-muted-foreground text-sm mt-1">Verified transactions on CardBoom</p>
        </div>
        <div className="p-8 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No sales recorded yet</p>
          <p className="text-muted-foreground/70 text-sm mt-1">
            Sales data will appear here once transactions occur
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-6 border-b border-border/50">
        <h3 className="font-display text-xl font-semibold text-foreground">Recent Sales</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Last {sales.length} verified transaction{sales.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="divide-y divide-border/30">
        {sales.map((sale, index) => {
          const prevSale = sales[index + 1];
          const priceChange = prevSale 
            ? ((sale.price - prevSale.price) / prevSale.price) * 100 
            : 0;

          return (
            <div 
              key={sale.id}
              className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-foreground font-semibold">{formatPrice(sale.price)}</p>
                  <p className="text-muted-foreground text-sm">{formatDate(sale.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    sale.condition?.includes('10') || sale.condition === 'Gem Mint' 
                      ? "bg-gold/20 text-gold" 
                      : "bg-purple-500/20 text-purple-400"
                  )}>
                    {sale.condition || 'Near Mint'}
                  </span>
                </div>
                <div className="text-right min-w-16">
                  <span className="text-muted-foreground text-xs">CardBoom</span>
                </div>
                {index < sales.length - 1 && priceChange !== 0 && (
                  <div className="min-w-16 text-right">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-sm font-medium",
                      priceChange >= 0 ? "text-gain" : "text-loss"
                    )}>
                      {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
