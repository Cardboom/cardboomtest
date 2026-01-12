import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';

interface MarketTick {
  symbol: string;
  price: number;
  change: number;
}

interface EventItem {
  id: string;
  icon: string;
  message: string;
  type: 'sale' | 'grading' | 'listing' | 'cardwar' | 'price';
}

export const LiveMarketPanel = () => {
  const [marketTicks, setMarketTicks] = useState<MarketTick[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMarketData();
    
    const ordersChannel = supabase
      .channel('market-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, fetchMarketData)
      .subscribe();

    const listingsChannel = supabase
      .channel('market-listings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'listings' }, fetchMarketData)
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(listingsChannel);
    };
  }, []);

  // Rotate events - 5 seconds
  useEffect(() => {
    if (events.length === 0) return;
    const interval = setInterval(() => {
      setCurrentEventIndex((prev) => (prev + 1) % events.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [events.length]);

  const fetchMarketData = async () => {
    const { data: marketItems } = await supabase
      .from('market_items')
      .select('name, current_price, change_24h, category')
      .not('current_price', 'is', null)
      .gt('current_price', 0)
      .order('views_24h', { ascending: false })
      .limit(20);

    if (marketItems) {
      const ticks: MarketTick[] = marketItems.map(item => ({
        symbol: item.name.length > 10 ? item.name.substring(0, 10) + '..' : item.name,
        price: item.current_price || 0,
        change: item.change_24h || 0,
      }));
      setMarketTicks([...ticks, ...ticks]);
    }

    const newEvents: EventItem[] = [];

    // Fetch recent sales
    const { data: orders } = await supabase
      .from('orders')
      .select('id, price_cents, listing:listings(title)')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(4);

    orders?.forEach(order => {
      const title = (order.listing as any)?.title || 'Card';
      const shortTitle = title.substring(0, 18) + (title.length > 18 ? '..' : '');
      newEvents.push({
        id: `sale-${order.id}`,
        icon: '💰',
        message: `SOLD: ${shortTitle} • $${((order.price_cents || 0) / 100).toLocaleString()}`,
        type: 'sale',
      });
    });

    // Fetch recent grading completions
    const { data: grading } = await supabase
      .from('grading_orders')
      .select('id, card_name, final_grade')
      .eq('status', 'completed')
      .not('final_grade', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(3);

    grading?.forEach(g => {
      const shortName = g.card_name.substring(0, 15) + (g.card_name.length > 15 ? '..' : '');
      newEvents.push({
        id: `grade-${g.id}`,
        icon: '🏆',
        message: `GRADED: ${shortName} → ${g.final_grade}/10`,
        type: 'grading',
      });
    });

    // Fetch new listings
    const { data: listings } = await supabase
      .from('listings')
      .select('id, title, price')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(3);

    listings?.forEach(l => {
      const shortTitle = l.title.substring(0, 16) + (l.title.length > 16 ? '..' : '');
      newEvents.push({
        id: `list-${l.id}`,
        icon: '📦',
        message: `NEW: ${shortTitle} • $${l.price?.toLocaleString()}`,
        type: 'listing',
      });
    });

    // Fallback events
    if (newEvents.length === 0) {
      newEvents.push(
        { id: 'demo-1', icon: '📈', message: 'CardBoom Index +2.4% today', type: 'price' },
        { id: 'demo-2', icon: '💰', message: 'SOLD: Charizard Base • $12,500', type: 'sale' },
        { id: 'demo-3', icon: '🏆', message: 'GRADED: Pikachu VMAX → 9.5/10', type: 'grading' },
      );
    }

    setEvents(newEvents.sort(() => Math.random() - 0.5));
  };

  const currentEvent = events[currentEventIndex];

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-[18px]",
        "bg-gradient-to-br from-[#0a0f1a] via-[#0d1321] to-[#101820]",
        "border border-white/5",
        "h-[100px] md:h-[140px]",
        "shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_40px_rgba(0,0,0,0.3)]"
      )}
      style={{ backdropFilter: 'blur(22px)' }}
    >
      {/* Noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Accent line - Tiffany brand color */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary via-primary/50 to-transparent" />

      {/* Header - Tiffany branding */}
      <div className="absolute top-2 left-3 flex items-center gap-1.5 z-10">
        <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
          <Zap className="w-2.5 h-2.5 text-primary" />
        </div>
        <span className="font-sans text-[10px] md:text-[11px] text-primary uppercase tracking-widest font-bold">
          LIVE FEED
        </span>
        <span className="relative flex h-2 w-2 ml-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
      </div>

      {/* Top: Horizontal Ticker */}
      <div className="absolute top-8 md:top-9 left-0 right-0 h-5 overflow-hidden border-y border-white/5">
        <div 
          ref={tickerRef}
          className="flex items-center h-full whitespace-nowrap"
          style={{ animation: 'marquee 50s linear infinite' }}
        >
          {marketTicks.map((tick, i) => (
            <div key={i} className="flex items-center gap-1.5 px-3">
              <span className="font-sans font-semibold text-[10px] text-gray-400 uppercase">
                {tick.symbol}
              </span>
              <span className="font-sans font-bold text-[10px] text-white/90">
                ${tick.price.toLocaleString()}
              </span>
              <span className={cn(
                "font-sans font-bold text-[10px]",
                tick.change >= 0 ? "text-gain" : "text-loss"
              )}>
                {tick.change >= 0 ? '+' : ''}{tick.change.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Center: Main Event Display */}
      <div className="absolute inset-x-0 top-[52px] md:top-[58px] bottom-6 flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {currentEvent && (
            <motion.div
              key={currentEvent.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-center gap-3 text-center"
            >
              <span className="text-xl md:text-2xl">{currentEvent.icon}</span>
              <span className="font-sans font-bold text-xs md:text-sm text-white/90 tracking-wide">
                {currentEvent.message}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom: Progress dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {events.slice(0, 6).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-300",
              i === currentEventIndex % Math.min(6, events.length)
                ? "bg-primary w-4"
                : "bg-white/20"
            )}
          />
        ))}
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};