import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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
  highlight?: string;
}

export const LiveMarketPanel = () => {
  const { t } = useLanguage();
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
        symbol: item.name.length > 12 ? item.name.substring(0, 12) + '…' : item.name,
        price: item.current_price || 0,
        change: item.change_24h || 0,
      }));
      setMarketTicks([...ticks, ...ticks]);
    }

    const newEvents: EventItem[] = [];

    const { data: orders } = await supabase
      .from('orders')
      .select('id, price_cents, listing:listings(title)')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(4);

    orders?.forEach(order => {
      const title = (order.listing as any)?.title || 'Card';
      const shortTitle = title.substring(0, 20) + (title.length > 20 ? '…' : '');
      newEvents.push({
        id: `sale-${order.id}`,
        icon: '💰',
        message: shortTitle,
        highlight: `$${((order.price_cents || 0) / 100).toLocaleString()}`,
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
      const shortName = g.card_name.substring(0, 18) + (g.card_name.length > 18 ? '…' : '');
      newEvents.push({
        id: `grade-${g.id}`,
        icon: '🏆',
        message: shortName,
        highlight: `${g.final_grade}/10`,
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
      const shortTitle = l.title.substring(0, 18) + (l.title.length > 18 ? '…' : '');
      newEvents.push({
        id: `list-${l.id}`,
        icon: '📦',
        message: shortTitle,
        highlight: `$${l.price?.toLocaleString()}`,
        type: 'listing',
      });
    });

    if (newEvents.length === 0) {
      newEvents.push(
        { id: 'demo-1', icon: '📈', message: 'CardBoom Index', highlight: '+2.4%', type: 'price' },
        { id: 'demo-2', icon: '💰', message: 'Charizard Base Set', highlight: '$12,500', type: 'sale' },
        { id: 'demo-3', icon: '🏆', message: 'Pikachu VMAX', highlight: '9.5/10', type: 'grading' },
      );
    }

    setEvents(newEvents.sort(() => Math.random() - 0.5));
  };

  const currentEvent = events[currentEventIndex];

  const getEventLabel = (type: EventItem['type']) => {
    switch (type) {
      case 'sale': return t.home.sold;
      case 'grading': return t.home.graded;
      case 'listing': return t.home.listed;
      case 'price': return t.home.index;
      default: return t.home.update;
    }
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-[18px]",
      "bg-gradient-to-br from-[#0a0f1a] via-[#0d1321] to-[#101820]",
      "border border-white/5",
      "h-[120px] md:h-[160px]",
      "shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_40px_rgba(0,0,0,0.3)]"
    )} style={{ backdropFilter: 'blur(22px)' }}>
      {/* Noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Accent line - Tiffany brand color */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
      
      {/* Header */}
      <div className="absolute top-2 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center relative">
            <Activity className="w-2.5 h-2.5 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gain opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gain"></span>
            </span>
          </div>
          <span className="font-sans text-[10px] md:text-[11px] text-primary uppercase tracking-widest font-bold">
            {t.home.liveMarket}
          </span>
        </div>
        <span className="text-[9px] text-gray-500 font-sans font-medium">
          {t.home.realTimeUpdates}
        </span>
      </div>

      {/* Ticker strip */}
      <div className="absolute top-10 md:top-11 left-0 right-0 h-6 overflow-hidden bg-white/5">
        <div 
          ref={tickerRef}
          className="flex items-center h-full whitespace-nowrap"
          style={{ animation: 'marquee 60s linear infinite' }}
        >
          {marketTicks.map((tick, i) => (
            <div key={i} className="flex items-center gap-2 px-4 border-r border-white/10">
              <span className="text-[11px] font-medium text-white/70">
                {tick.symbol}
              </span>
              <span className="text-[11px] font-semibold text-white">
                ${tick.price.toLocaleString()}
              </span>
              <span className={cn(
                "flex items-center gap-0.5 text-[11px] font-semibold",
                tick.change >= 0 ? "text-gain" : "text-loss"
              )}>
                {tick.change >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(tick.change).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main event display */}
      <div className="absolute inset-x-0 top-[68px] md:top-[76px] bottom-8 flex items-center justify-center px-4">
        <AnimatePresence mode="wait">
          {currentEvent && (
            <motion.div
              key={currentEvent.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3"
            >
              {/* Event type badge */}
              <div className={cn(
                "px-2 py-0.5 rounded text-[9px] font-bold tracking-wider",
                currentEvent.type === 'sale' && "bg-gain/20 text-gain",
                currentEvent.type === 'grading' && "bg-amber-500/20 text-amber-400",
                currentEvent.type === 'listing' && "bg-primary/20 text-primary",
                currentEvent.type === 'price' && "bg-blue-500/20 text-blue-400"
              )}>
                {getEventLabel(currentEvent.type)}
              </div>
              
              {/* Event content */}
              <div className="flex items-center gap-2">
                <span className="text-lg">{currentEvent.icon}</span>
                <span className="text-sm font-medium text-white">
                  {currentEvent.message}
                </span>
                {currentEvent.highlight && (
                  <span className={cn(
                    "text-sm font-bold",
                    currentEvent.type === 'sale' && "text-gain",
                    currentEvent.type === 'grading' && "text-amber-400",
                    currentEvent.type === 'listing' && "text-primary",
                    currentEvent.type === 'price' && "text-gain"
                  )}>
                    {currentEvent.highlight}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress indicator */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {events.slice(0, 5).map((_, i) => (
          <motion.div
            key={i}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              i === currentEventIndex % Math.min(5, events.length)
                ? "bg-primary w-6"
                : "bg-white/20 w-1"
            )}
            layout
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
