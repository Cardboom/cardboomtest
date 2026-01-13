import { TrendingUp, TrendingDown, Tag } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Link } from 'react-router-dom';

interface TickerItem {
  id: string;
  name: string;
  current_price: number;
  change_24h: number | null;
  type: 'market' | 'listing';
  listing_id?: string;
}

export const MarketTicker = () => {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const { formatPrice } = useCurrency();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchTickerItems = async () => {
      // Fetch recent active listings (user listings)
      const { data: listings } = await supabase
        .from('listings')
        .select('id, title, price, created_at')
        .eq('status', 'active')
        .not('price', 'is', null)
        .gt('price', 0)
        .order('created_at', { ascending: false })
        .limit(30);

      // Fetch top market items (popular cards with price changes)
      const { data: marketItems } = await supabase
        .from('market_items')
        .select('id, name, current_price, change_24h, price_status')
        .in('price_status', ['verified', 'estimated'])
        .not('current_price', 'is', null)
        .gt('current_price', 0)
        .order('change_24h', { ascending: false, nullsFirst: false })
        .limit(50);

      if (!isMounted) return;

      const listingItems: TickerItem[] = (listings || []).map(l => ({
        id: `listing-${l.id}`,
        name: l.title,
        current_price: l.price,
        change_24h: null,
        type: 'listing' as const,
        listing_id: l.id,
      }));

      const marketTickerItems: TickerItem[] = (marketItems || []).map(m => ({
        id: m.id,
        name: m.name,
        current_price: m.current_price,
        change_24h: m.change_24h,
        type: 'market' as const,
      }));

      // Interleave listings and market items, prioritizing listings
      const combined: TickerItem[] = [];
      const listingQueue = [...listingItems];
      const marketQueue = [...marketTickerItems];

      // Add listings more frequently (every 2-3 items)
      while (listingQueue.length > 0 || marketQueue.length > 0) {
        // Add 1-2 listings
        if (listingQueue.length > 0) combined.push(listingQueue.shift()!);
        if (listingQueue.length > 0 && Math.random() > 0.5) combined.push(listingQueue.shift()!);
        
        // Add 1-2 market items
        if (marketQueue.length > 0) combined.push(marketQueue.shift()!);
        if (marketQueue.length > 0) combined.push(marketQueue.shift()!);
      }

      // If very few items, fill with market items
      if (combined.length < 20 && marketTickerItems.length > 0) {
        while (combined.length < 40 && marketQueue.length > 0) {
          combined.push(marketQueue.shift()!);
        }
      }

      // Only update if not initialized or if items changed significantly
      const newItems = combined.slice(0, 80);
      
      if (!isInitialized) {
        setItems(newItems);
        setIsInitialized(true);
      }
      // Don't update items after initial load to prevent animation reset
    };

    fetchTickerItems();

    return () => {
      isMounted = false;
    };
  }, [isInitialized]);

  if (items.length === 0) {
    return null;
  }

  // Create duplicated items for seamless loop - triple for smoother loop
  const duplicatedItems = [...items, ...items, ...items];

  return (
    <div className="bg-muted/30 border-b border-border/40 overflow-hidden">
      <div 
        ref={containerRef}
        className="flex ticker-scroll"
        style={{
          willChange: 'transform',
        }}
      >
        {duplicatedItems.map((item, index) => (
          <Link
            key={`${item.id}-${index}`}
            to={item.type === 'listing' && item.listing_id ? `/listing/${item.listing_id}` : `/item/${item.id}`}
            className="flex items-center gap-2 px-6 py-2.5 whitespace-nowrap border-r border-border/20 hover:bg-muted/50 transition-colors flex-shrink-0"
          >
            {item.type === 'listing' && (
              <Tag className="w-3 h-3 text-primary" />
            )}
            <span className="text-sm text-muted-foreground font-medium">
              {item.name.slice(0, 25)}{item.name.length > 25 ? '...' : ''}
            </span>
            <span className="text-sm font-semibold">
              {formatPrice(item.current_price)}
            </span>
            {item.change_24h !== null && (
              <span className={cn(
                "text-xs font-medium flex items-center gap-0.5",
                item.change_24h >= 0 ? "text-gain" : "text-loss"
              )}>
                {item.change_24h >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {item.change_24h >= 0 ? '+' : ''}{item.change_24h.toFixed(1)}%
              </span>
            )}
            {item.type === 'listing' && (
              <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-semibold">
                FOR SALE
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};
