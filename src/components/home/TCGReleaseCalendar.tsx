import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Sparkles, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TCGDrop {
  id: string;
  name: string;
  tcg: 'pokemon' | 'one-piece' | 'lorcana' | 'riftbound' | 'magic' | 'yugioh' | 'other';
  releaseDate: string;
  type: 'booster-box' | 'starter-deck' | 'collection' | 'promo' | 'expansion';
  description?: string;
}

const TCG_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  pokemon: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: '⚡' },
  'one-piece': { bg: 'bg-red-500/20', text: 'text-red-400', icon: '☠️' },
  lorcana: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: '✨' },
  riftbound: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', icon: '🌀' },
  magic: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: '🔮' },
  yugioh: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '🃏' },
  other: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: '📦' },
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
  return Math.ceil((releaseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const TCGReleaseCalendar = () => {
  const [drops, setDrops] = useState<TCGDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchDrops();
  }, []);

  // Cycle through drops
  useEffect(() => {
    if (drops.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % Math.min(drops.length, 6));
    }, 5000);
    return () => clearInterval(interval);
  }, [drops.length]);

  const fetchDrops = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-tcg-drops');
      if (error) throw error;
      if (data?.releases) {
        setDrops(data.releases.slice(0, 8));
      }
    } catch (error) {
      console.error('Failed to fetch TCG drops:', error);
      setDrops([
        { id: '1', name: 'Prismatic Evolutions', tcg: 'pokemon', releaseDate: '2026-01-17', type: 'booster-box' },
        { id: '2', name: 'OP-11 Two Legends', tcg: 'one-piece', releaseDate: '2026-02-07', type: 'booster-box' },
        { id: '3', name: 'Aetherdrift', tcg: 'magic', releaseDate: '2026-02-14', type: 'booster-box' },
        { id: '4', name: 'Azurite Sea', tcg: 'lorcana', releaseDate: '2026-02-21', type: 'booster-box' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const nextDrop = drops.find(drop => getDaysUntil(drop.releaseDate) >= 0);
  const upcomingDrops = drops.filter(drop => getDaysUntil(drop.releaseDate) >= 0).slice(0, 4);

  if (loading) {
    return (
      <div className="h-[120px] md:h-[160px] rounded-[18px] bg-[#f5f5f7] dark:bg-gradient-to-br dark:from-[#0a0f1a] dark:via-[#0d1321] dark:to-[#101820] border border-black/[0.04] dark:border-white/5 animate-pulse" />
    );
  }

  return (
    <div className="h-[120px] md:h-[160px] rounded-[18px] overflow-hidden bg-[#f5f5f7] dark:bg-gradient-to-br dark:from-[#0a0f1a] dark:via-[#0d1321] dark:to-[#101820] border border-black/[0.04] dark:border-white/5 flex flex-col">
      {/* Header */}
      <div className="px-3 py-1.5 border-b border-black/[0.04] dark:border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
            <Calendar className="w-2.5 h-2.5 text-primary" />
          </div>
          <span className="font-sans text-[10px] md:text-[11px] text-primary uppercase tracking-widest font-bold">
            TCG DROPS
          </span>
        </div>
        <Badge variant="outline" className="text-[8px] h-4 gap-0.5 border-primary/30 text-primary px-1">
          <Sparkles className="w-2 h-2" />
          AI
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Next Drop - Left side */}
        {nextDrop && (
          <div className="w-1/4 p-2 border-r border-black/[0.04] dark:border-white/5 flex flex-col justify-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Next</p>
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center text-base mb-1",
              TCG_COLORS[nextDrop.tcg].bg
            )}>
              {TCG_COLORS[nextDrop.tcg].icon}
            </div>
            <p className="text-[10px] font-medium text-foreground truncate">{nextDrop.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={cn(
                "text-lg font-bold",
                getDaysUntil(nextDrop.releaseDate) <= 7 ? "text-gain" : "text-primary"
              )}>
                {getDaysUntil(nextDrop.releaseDate)}
              </span>
              <span className="text-[9px] text-muted-foreground">days</span>
            </div>
          </div>
        )}

        {/* Upcoming List - Right side */}
        <div className="flex-1 p-2 overflow-hidden flex flex-col">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1.5 shrink-0">Upcoming</p>
          <ScrollArea className="flex-1">
            <div className="space-y-1 pr-2">
              <AnimatePresence mode="popLayout">
                {upcomingDrops.map((drop, index) => (
                  <motion.div
                    key={drop.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "flex items-center gap-1.5 p-1 rounded-md transition-all",
                      TCG_COLORS[drop.tcg].bg
                    )}
                  >
                    <span className="text-xs shrink-0">{TCG_COLORS[drop.tcg].icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-foreground truncate">{drop.name}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-[9px] text-muted-foreground">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDate(drop.releaseDate)}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* TCG Legend Footer */}
      <div className="px-2 py-1 border-t border-black/[0.04] dark:border-white/5 shrink-0">
        <div className="flex gap-2 justify-center overflow-x-auto">
          {Object.entries(TCG_COLORS).filter(([key]) => key !== 'other').slice(0, 5).map(([tcg, colors]) => (
            <div key={tcg} className="flex items-center gap-0.5 shrink-0">
              <span className="text-[9px]">{colors.icon}</span>
              <span className={cn("text-[8px] uppercase", colors.text)}>
                {tcg.split('-')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
