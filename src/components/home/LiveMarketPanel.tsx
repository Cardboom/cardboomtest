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

  // Rotate events - SLOWER: 6 seconds instead of 3
  useEffect(() => {
    if (events.length === 0) return;
    const interval = setInterval(() => {
      setCurrentEventIndex((prev) => (prev + 1) % events.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [events.length]);

  const fetchMarketData = async () => {
    const { data: marketItems } = await supabase
      .from('market_items')
      .select('name, current_price, change_7d, category')
      .not('current_price', 'is', null)
      .gt('current_price', 0)
      .order('views_7d', { ascending: false })
      .limit(30);

    if (marketItems) {
      const ticks: MarketTick[] = marketItems.map(item => ({
        symbol: item.name.length > 12 ? item.name.substring(0, 12) + '..' : item.name,
        price: item.current_price || 0,
        change: item.change_7d || 0,
      }));
      setMarketTicks([...ticks, ...ticks]);
    }

    const newEvents: EventItem[] = [];

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
        message: `${title.substring(0, 20)}${title.length > 20 ? '..' : ''} sold $${((order.price_cents || 0) / 100).toLocaleString()}`,
        type: 'sale',
      });
    });

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
        message: `AI Grade: ${g.card_name.substring(0, 16)}${g.card_name.length > 16 ? '..' : ''} → ${g.final_grade}`,
        type: 'grading',
      });
    });

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
        message: `New: ${l.title.substring(0, 18)}${l.title.length > 18 ? '..' : ''} $${l.price?.toLocaleString()}`,
        type: 'listing',
      });
    });

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
        message: `Card Wars: ${winner.substring(0, 16)}${winner.length > 16 ? '..' : ''} wins`,
        type: 'cardwar',
      });
    });

    if (newEvents.length === 0) {
      newEvents.push(
        { id: 'demo-1', icon: '📈', message: 'CardBoom Index +2.4% today', type: 'price' },
        { id: 'demo-2', icon: '🔥', message: 'Charizard Base sold $12,500', type: 'sale' },
        { id: 'demo-3', icon: '🧠', message: 'AI Grade: Luffy OP-01 → 9.5', type: 'grading' },
      );
    }

    setEvents(newEvents.sort(() => Math.random() - 0.5));

    const micros: MicroTick[] = [];
    marketItems?.slice(0, 15).forEach(item => {
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
      );
    }
    
    setMicroTicks([...micros, ...micros, ...micros]);
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

      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/[0.02] pointer-events-none" />

      {/* Top: Horizontal Ticker - SMALLER text, SLOWER animation */}
      <div className="absolute top-0 left-0 right-0 h-6 md:h-7 border-b border-white/5 overflow-hidden">
        <div 
          ref={tickerRef}
          className="flex items-center h-full whitespace-nowrap"
          style={{ animation: 'marquee 60s linear infinite' }}
        >
          {marketTicks.map((tick, i) => (
            <div key={i} className="flex items-center gap-1 px-2 md:px-3">
              <span className="font-sans font-bold text-[10px] md:text-[11px] text-gray-500 uppercase tracking-wide">
                {tick.symbol}
              </span>
              <span className="font-sans font-bold text-[10px] md:text-[11px] text-white/80">
                ${tick.price.toLocaleString()}
              </span>
              <span className={cn(
                "font-sans font-bold text-[10px] md:text-[11px]",
                tick.change >= 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {tick.change >= 0 ? '+' : ''}{tick.change.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Center: Event Pulse - CENTERED */}
      <div className="absolute inset-x-0 top-6 md:top-7 bottom-0 flex items-center justify-center px-3 md:px-6">
        <AnimatePresence mode="wait">
          {currentEvent && (
            <motion.div
              key={currentEvent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-center gap-2 text-center"
            >
              <span className="text-lg md:text-2xl">{currentEvent.icon}</span>
              <span className="font-sans font-bold text-[11px] md:text-sm text-white/90 tracking-wide">
                {currentEvent.message}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Vertical Micro Ticker - SLOWER */}
      <div className="absolute right-2 md:right-4 top-8 md:top-9 bottom-1 w-10 md:w-12 overflow-hidden hidden md:block">
        <div 
          className="flex flex-col"
          style={{ animation: 'scrollVertical 20s linear infinite' }}
        >
          {microTicks.map((tick, i) => (
            <div 
              key={i}
              className={cn(
                "font-sans font-bold text-[9px] py-0.5 text-center",
                tick.isPositive ? "text-emerald-400" : "text-red-400"
              )}
            >
              {tick.value}
            </div>
          ))}
        </div>
      </div>

      {/* Live indicator */}
      <div className="absolute bottom-1 left-2 md:left-3 flex items-center gap-1">
        <span className="relative flex h-1 w-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-500"></span>
        </span>
        <span className="font-sans font-bold text-[8px] text-gray-500 uppercase tracking-widest">LIVE</span>
      </div>

      <div className="absolute bottom-1 right-2 md:right-16">
        <span className="font-sans font-bold text-[8px] text-gray-600 uppercase tracking-widest">TERMINAL</span>
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