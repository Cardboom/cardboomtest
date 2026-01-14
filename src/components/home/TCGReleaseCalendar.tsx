import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Sparkles, Clock, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface TCGDrop {
  id: string;
  name: string;
  tcg: 'pokemon' | 'one-piece' | 'lorcana' | 'riftbound' | 'magic' | 'yugioh' | 'other';
  releaseDate: string;
  type: 'booster-box' | 'starter-deck' | 'collection' | 'promo' | 'expansion';
  description?: string;
}

const TCG_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  pokemon: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: '⚡' },
  'one-piece': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', icon: '☠️' },
  lorcana: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', icon: '✨' },
  riftbound: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', icon: '🌀' },
  magic: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', icon: '🔮' },
  yugioh: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', icon: '🃏' },
  other: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', icon: '📦' },
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
};

const getDaysUntil = (dateStr: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const releaseDate = new Date(dateStr);
  releaseDate.setHours(0, 0, 0, 0);
  const diff = Math.ceil((releaseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

export const TCGReleaseCalendar = () => {
  const { t } = useLanguage();
  const [drops, setDrops] = useState<TCGDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [hoveredDrop, setHoveredDrop] = useState<string | null>(null);

  useEffect(() => {
    fetchDrops();
  }, []);

  const fetchDrops = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-tcg-drops');
      if (error) throw error;
      if (data?.releases) {
        setDrops(data.releases);
      }
    } catch (error) {
      console.error('Failed to fetch TCG drops:', error);
      // Use fallback data
      setDrops([
        { id: '1', name: 'Surging Sparks', tcg: 'pokemon', releaseDate: '2025-02-07', type: 'booster-box' },
        { id: '2', name: 'OP-10 Royal Blood', tcg: 'one-piece', releaseDate: '2025-02-14', type: 'booster-box' },
        { id: '3', name: 'Shimmering Skies', tcg: 'lorcana', releaseDate: '2025-02-21', type: 'booster-box' },
        { id: '4', name: 'Foundations', tcg: 'magic', releaseDate: '2025-02-28', type: 'booster-box' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const goToPrevMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Filter drops for selected month
  const monthDrops = drops.filter(drop => {
    const dropDate = new Date(drop.releaseDate);
    return dropDate.getMonth() === selectedMonth.getMonth() && 
           dropDate.getFullYear() === selectedMonth.getFullYear();
  });

  // Get next upcoming drop
  const nextDrop = drops.find(drop => getDaysUntil(drop.releaseDate) >= 0);

  // Generate calendar days
  const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const lastDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
  const startPadding = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startPadding; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const getDropsForDay = (day: number) => {
    return monthDrops.filter(drop => {
      const dropDate = new Date(drop.releaseDate);
      return dropDate.getDate() === day;
    });
  };

  return (
    <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#0a0f1a] via-[#0d1321] to-[#101820] border border-white/5">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">TCG Drop Calendar</h3>
            <p className="text-[10px] text-muted-foreground">Upcoming releases</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary">
          <Sparkles className="w-3 h-3" />
          AI-Powered
        </Badge>
      </div>

      {/* Next Drop Highlight */}
      {nextDrop && (
        <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
                TCG_COLORS[nextDrop.tcg].bg
              )}>
                {TCG_COLORS[nextDrop.tcg].icon}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Next Drop</p>
                <p className="font-semibold text-sm text-white">{nextDrop.name}</p>
              </div>
            </div>
            <div className="text-right">
              <div className={cn(
                "text-xl font-bold",
                getDaysUntil(nextDrop.releaseDate) <= 7 ? "text-gain" : "text-primary"
              )}>
                {getDaysUntil(nextDrop.releaseDate)}
              </div>
              <p className="text-[10px] text-muted-foreground">days left</p>
            </div>
          </div>
        </div>
      )}

      {/* Month Navigation */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-white/5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium text-white">{monthName}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Mini Calendar */}
      <div className="p-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-[10px] text-muted-foreground text-center font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            if (day === null) {
              return <div key={i} className="aspect-square" />;
            }

            const dayDrops = getDropsForDay(day);
            const hasDrops = dayDrops.length > 0;
            const isToday = new Date().getDate() === day && 
                           new Date().getMonth() === selectedMonth.getMonth() &&
                           new Date().getFullYear() === selectedMonth.getFullYear();

            return (
              <div
                key={i}
                className={cn(
                  "aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all cursor-pointer",
                  hasDrops ? "bg-primary/20 hover:bg-primary/30" : "hover:bg-white/5",
                  isToday && "ring-1 ring-primary"
                )}
                onMouseEnter={() => hasDrops && setHoveredDrop(dayDrops[0].id)}
                onMouseLeave={() => setHoveredDrop(null)}
              >
                <span className={cn(
                  "text-xs",
                  hasDrops ? "font-bold text-primary" : "text-muted-foreground"
                )}>
                  {day}
                </span>
                {hasDrops && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayDrops.slice(0, 3).map((drop, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          drop.tcg === 'pokemon' && "bg-yellow-400",
                          drop.tcg === 'one-piece' && "bg-red-400",
                          drop.tcg === 'lorcana' && "bg-purple-400",
                          drop.tcg === 'riftbound' && "bg-cyan-400",
                          drop.tcg === 'magic' && "bg-orange-400",
                          drop.tcg === 'yugioh' && "bg-blue-400",
                          drop.tcg === 'other' && "bg-gray-400"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Drops List */}
      <div className="px-3 pb-3 space-y-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide px-1">
          This Month's Drops
        </p>
        
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : monthDrops.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            No drops scheduled this month
          </p>
        ) : (
          <div className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-thin">
            <AnimatePresence>
              {monthDrops.map((drop, index) => (
                <motion.div
                  key={drop.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer",
                    TCG_COLORS[drop.tcg].bg,
                    "hover:scale-[1.02]"
                  )}
                >
                  <span className="text-base">{TCG_COLORS[drop.tcg].icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{drop.name}</p>
                    <p className={cn("text-[10px]", TCG_COLORS[drop.tcg].text)}>
                      {drop.tcg.replace('-', ' ').toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-white">{formatDate(drop.releaseDate)}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {getDaysUntil(drop.releaseDate)}d
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* TCG Legend */}
      <div className="px-3 pb-3 pt-1 border-t border-white/5">
        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(TCG_COLORS).filter(([key]) => key !== 'other').map(([tcg, colors]) => (
            <div key={tcg} className="flex items-center gap-1">
              <span className="text-xs">{colors.icon}</span>
              <span className={cn("text-[9px] uppercase", colors.text)}>
                {tcg.replace('-', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
