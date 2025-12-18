import { TrendingUp, TrendingDown } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

interface TickerItem {
  id: string;
  name: string;
  current_price: number;
  change_24h: number | null;
}

export const MarketTicker = () => {
  const [items, setItems] = useState<TickerItem[]>([]);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    const fetchTopGainers = async () => {
      const { data, error } = await supabase
        .from('market_items')
        .select('id, name, current_price, change_24h')
        .not('change_24h', 'is', null)
        .not('image_url', 'is', null)
        .neq('image_url', '')
        .gt('current_price', 0)
        .not('data_source', 'is', null)
        .order('change_24h', { ascending: false })
        .limit(50);

      if (!error && data) {
        setItems(data);
      }
    };

    fetchTopGainers();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('ticker-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'market_items' },
        () => fetchTopGainers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const duplicatedItems = useMemo(() => 
    [...items, ...items], 
  [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="bg-muted/30 border-b border-border/40 overflow-hidden">
      <div className="flex animate-ticker">
        {duplicatedItems.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="flex items-center gap-2 px-6 py-2.5 whitespace-nowrap border-r border-border/20"
          >
            <span className="text-sm text-muted-foreground font-medium">
              {item.name.slice(0, 25)}{item.name.length > 25 ? '...' : ''}
            </span>
            <span className="text-sm font-semibold">
              {formatPrice(item.current_price)}
            </span>
            <span className={cn(
              'flex items-center gap-1 text-xs font-medium',
              (item.change_24h ?? 0) >= 0 ? 'text-gain' : 'text-loss'
            )}>
              {(item.change_24h ?? 0) >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {(item.change_24h ?? 0) >= 0 ? '+' : ''}{(item.change_24h ?? 0).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
