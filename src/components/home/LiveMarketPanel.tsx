import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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

interface MicroTick {
  value: string;
  isPositive: boolean;
}

export const LiveMarketPanel = () => {
  const [marketTicks, setMarketTicks] = useState<MarketTick[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [microTicks, setMicroTicks] = useState<MicroTick[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMarketData();
    
    // Realtime subscriptions
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

  // Rotate events
  useEffect(() => {
    if (events.length === 0) return;
    const interval = setInterval(() => {
      setCurrentEventIndex((prev) => (prev + 1) % events.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [events.length]);

  const fetchMarketData = async () => {
    // Fetch market items for ticker
    const { data: marketItems } = await supabase
      .from('market_items')
      .select('name, current_price, change_7d, category')
      .not('current_price', 'is', null)
      .gt('current_price', 0)
      .order('views_7d', { ascending: false })
      .limit(20);

    if (marketItems) {
      const ticks: MarketTick[] = marketItems.map(item => ({
        symbol: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
        price: item.current_price || 0,
        change: item.change_7d || 0,
      }));
      // Double for seamless loop
      setMarketTicks([...ticks, ...ticks]);
    }

    // Fetch recent events
    const newEvents: EventItem[] = [];

    // Recent sales
    const { data: orders } = await supabase
      .from('orders')
      .select('id, price_cents, listing:listings(title)')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    orders?.forEach(order => {
      const title = (order.listing as any)?.title || 'Card';
      newEvents.push({
        id: `sale-${order.id}`,
        icon: '🔥',
        message: `${title.substring(0, 25)}${title.length > 25 ? '...' : ''} sold for $${((order.price_cents || 0) / 100).toLocaleString()}`,
        type: 'sale',
      });
    });

    // Recent grading
    const { data: grading } = await supabase
      .from('grading_orders')
      .select('id, card_name, final_grade')
      .eq('status', 'completed')
      .not('final_grade', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(3);

    grading?.forEach(g => {
      newEvents.push({
        id: `grade-${g.id}`,
        icon: '🧠',
        message: `AI Graded: ${g.card_name.substring(0, 20)}${g.card_name.length > 20 ? '...' : ''} → ${g.final_grade}`,
        type: 'grading',
      });
    });

    // Recent listings
    const { data: listings } = await supabase
      .from('listings')
      .select('id, title, price')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(3);

    listings?.forEach(l => {
      newEvents.push({
        id: `list-${l.id}`,
        icon: '📋',
        message: `New: ${l.title.substring(0, 25)}${l.title.length > 25 ? '...' : ''} — $${l.price?.toLocaleString()}`,
        type: 'listing',
      });
    });

    // Card Wars
    const { data: wars } = await supabase
      .from('card_wars')
      .select('id, card_a_name, card_b_name, winner')
      .eq('status', 'completed')
      .not('winner', 'is', null)
      .order('ends_at', { ascending: false })
      .limit(2);

    wars?.forEach(w => {
      const winner = w.winner === 'card_a' ? w.card_a_name : w.card_b_name;
      newEvents.push({
        id: `war-${w.id}`,
        icon: '🏆',
        message: `Card Wars: ${winner.substring(0, 20)}${winner.length > 20 ? '...' : ''} wins`,
        type: 'cardwar',
      });
    });

    // Fallback demo data if empty
    if (newEvents.length === 0) {
      newEvents.push(
        { id: 'demo-1', icon: '📈', message: 'CardBoom Index +2.4% today', type: 'price' },
        { id: 'demo-2', icon: '🔥', message: 'Charizard Base Set sold for $12,500', type: 'sale' },
        { id: 'demo-3', icon: '🧠', message: 'AI Grading: Luffy OP-01 → 9.5 Gem Mint', type: 'grading' },
      );
    }

    setEvents(newEvents.sort(() => Math.random() - 0.5));

    // Micro ticks
    const micros: MicroTick[] = [];
    marketItems?.slice(0, 10).forEach(item => {
      if (item.change_7d) {
        micros.push({
          value: `${item.change_7d > 0 ? '+' : ''}${item.change_7d.toFixed(1)}%`,
          isPositive: item.change_7d > 0,
        });
      }
    });
    
    if (micros.length < 5) {
      micros.push(
        { value: '+3.2%', isPositive: true },
        { value: '-1.8%', isPositive: false },
        { value: '+5.1%', isPositive: true },
        { value: '+0.7%', isPositive: true },
        { value: '-2.4%', isPositive: false },
      );
    }
    
    // Triple for seamless vertical loop
    setMicroTicks([...micros, ...micros, ...micros]);
  };

  const currentEvent = events[currentEventIndex];

  return (
    <div className="w-full mb-6">
      <div 
        className={cn(
          "relative overflow-hidden rounded-[18px]",
          "bg-gradient-to-br from-[#0a0f1a] via-[#0d1321] to-[#101820]",
          "border border-white/5",
          "h-[120px] md:h-[180px]",
          "shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_40px_rgba(0,0,0,0.3)]"
        )}
        style={{
          backdropFilter: 'blur(22px)',
        }}
      >
        {/* Noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Inner glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/[0.02] pointer-events-none" />

        {/* Top Layer: Fast Horizontal Ticker */}
        <div className="absolute top-0 left-0 right-0 h-8 md:h-10 border-b border-white/5 overflow-hidden">
          <div 
            ref={tickerRef}
            className="flex items-center h-full animate-marquee-fast whitespace-nowrap"
            style={{
              animation: 'marquee 30s linear infinite',
            }}
          >
            {marketTicks.map((tick, i) => (
              <div key={i} className="flex items-center gap-2 px-4">
                <span className="font-mono text-[10px] md:text-xs text-gray-400 uppercase tracking-wider">
                  {tick.symbol}
                </span>
                <span className="font-mono text-[10px] md:text-xs text-white font-medium">
                  ${tick.price.toLocaleString()}
                </span>
                <span className={cn(
                  "font-mono text-[10px] md:text-xs font-medium",
                  tick.change >= 0 ? "text-emerald-400" : "text-red-400"
                )}>
                  {tick.change >= 0 ? '+' : ''}{tick.change.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Center Layer: Event Pulse */}
        <div className="absolute inset-x-0 top-8 md:top-10 bottom-0 flex items-center px-4 md:px-8 pr-16 md:pr-24">
          <AnimatePresence mode="wait">
            {currentEvent && (
              <motion.div
                key={currentEvent.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <span className="text-xl md:text-3xl">{currentEvent.icon}</span>
                <span className="font-mono text-sm md:text-lg text-white/90 tracking-wide">
                  {currentEvent.message}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Layer: Vertical Micro Ticker */}
        <div className="absolute right-4 md:right-6 top-10 md:top-12 bottom-2 w-12 md:w-16 overflow-hidden hidden md:block">
          <div 
            className="flex flex-col animate-scroll-vertical"
            style={{
              animation: 'scrollVertical 10s linear infinite',
            }}
          >
            {microTicks.map((tick, i) => (
              <div 
                key={i}
                className={cn(
                  "font-mono text-[10px] md:text-xs font-bold py-1 text-center",
                  tick.isPositive ? "text-emerald-400" : "text-red-400"
                )}
              >
                {tick.value}
              </div>
            ))}
          </div>
        </div>

        {/* Live indicator */}
        <div className="absolute bottom-2 left-4 flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">LIVE</span>
        </div>

        {/* CardBoom branding */}
        <div className="absolute bottom-2 right-4 md:right-24">
          <span className="font-mono text-[9px] text-gray-600 uppercase tracking-widest">CARDBOOM TERMINAL</span>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scrollVertical {
          0% { transform: translateY(0); }
          100% { transform: translateY(-33.33%); }
        }
      `}</style>
    </div>
  );
};
