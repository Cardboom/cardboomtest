import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Sparkles, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';

interface Insight {
  id: string;
  icon: string;
  message: string;
  type: 'bullish' | 'bearish' | 'tip' | 'neutral';
}

interface AIMarketSummary {
  communityBuzz: string;
  hotTake: string;
  sleeper: string;
  sentiment: 'bullish' | 'bearish' | 'mixed';
  cardBoomIndex: number;
  platformGradingAvg: number;
  weeklyVolume: number;
}

interface PersonalizedInsightsPanelProps {
  userId: string;
}

export const PersonalizedInsightsPanel = ({ userId }: PersonalizedInsightsPanelProps) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, [userId]);

  // Rotate insights every 7 seconds
  useEffect(() => {
    if (insights.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % insights.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [insights.length]);

  const fetchInsights = async () => {
    const newInsights: Insight[] = [];

    try {
      // Fetch AI-generated market summary
      const { data: aiSummary, error: aiError } = await supabase.functions.invoke('ai-market-summary', {
        body: { userId }
      });

      if (!aiError && aiSummary) {
        const summary = aiSummary as AIMarketSummary;
        
        // Add Community Buzz
        if (summary.communityBuzz) {
          newInsights.push({
            id: 'buzz',
            icon: summary.sentiment === 'bullish' ? '🚀' : summary.sentiment === 'bearish' ? '📉' : '💬',
            message: summary.communityBuzz,
            type: summary.sentiment === 'bullish' ? 'bullish' : summary.sentiment === 'bearish' ? 'bearish' : 'neutral',
          });
        }

        // Add Hot Take
        if (summary.hotTake) {
          newInsights.push({
            id: 'hot-take',
            icon: '🎯',
            message: summary.hotTake,
            type: 'tip',
          });
        }

        // Add Sleeper pick
        if (summary.sleeper) {
          newInsights.push({
            id: 'sleeper',
            icon: '💎',
            message: summary.sleeper,
            type: 'bullish',
          });
        }
      }

      // Fallback insights
      if (newInsights.length === 0) {
        newInsights.push(
          { id: 'welcome', icon: '👋', message: 'Start building your portfolio to get personalized insights', type: 'tip' },
          { id: 'tip-1', icon: '🧠', message: 'Our AI analyzes market trends 24/7 to find opportunities', type: 'neutral' },
          { id: 'tip-2', icon: '🔔', message: 'Set price alerts to never miss a deal', type: 'tip' },
        );
      }

      setInsights(newInsights);
    } catch (error) {
      console.error('Error fetching insights:', error);
      setInsights([{ id: 'fallback', icon: '📊', message: 'Trading desk ready - explore the market', type: 'neutral' }]);
    } finally {
      setLoading(false);
    }
  };

  const currentInsight = insights[currentIndex];

  const getTypeStyles = (type: Insight['type']) => {
    switch (type) {
      case 'bullish':
        return { bg: 'from-gain/10 to-gain/5', border: 'border-gain/30', icon: TrendingUp, iconColor: 'text-gain' };
      case 'bearish':
        return { bg: 'from-loss/10 to-loss/5', border: 'border-loss/30', icon: TrendingDown, iconColor: 'text-loss' };
      case 'tip':
        return { bg: 'from-primary/10 to-primary/5', border: 'border-primary/30', icon: Lightbulb, iconColor: 'text-primary' };
      default:
        return { bg: 'from-muted to-muted/50', border: 'border-border', icon: Sparkles, iconColor: 'text-muted-foreground' };
    }
  };

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
          <Sparkles className="w-2.5 h-2.5 text-primary" />
        </div>
        <span className="font-sans text-[10px] md:text-[11px] text-primary uppercase tracking-widest font-bold">
          AI INSIGHT
        </span>
      </div>

      {/* Main content */}
      <div className="absolute inset-x-0 top-8 md:top-10 bottom-6 flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {currentInsight && (
            <motion.div
              key={currentInsight.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-full px-2"
            >
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <span className="text-xl md:text-2xl">{currentInsight.icon}</span>
              </div>
              <p className="font-sans font-bold text-xs md:text-sm text-white/90 tracking-wide leading-relaxed max-w-[320px] md:max-w-[400px] mx-auto line-clamp-2">
                {currentInsight.message}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {insights.slice(0, 6).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-300",
              i === currentIndex % Math.min(6, insights.length)
                ? "bg-primary w-4"
                : "bg-white/20"
            )}
          />
        ))}
      </div>
    </div>
  );
};