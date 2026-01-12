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
        "relative overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-card via-card/95 to-card/90",
        "border border-border/50",
        "h-[100px] md:h-[140px]",
        "shadow-lg"
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />

      {/* Left accent bar */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-accent via-accent/60 to-accent/20" />

      {/* Header */}
      <div className="absolute top-2 left-4 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">
          <Sparkles className="w-3 h-3 text-accent" />
          <span className="font-sans text-[10px] md:text-[11px] text-accent font-bold uppercase tracking-wider">
            AI Insight
          </span>
        </div>
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
              <p className="font-sans font-bold text-xs md:text-sm text-foreground tracking-wide leading-relaxed max-w-[320px] md:max-w-[400px] mx-auto line-clamp-2">
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
                ? "bg-accent w-4"
                : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>
    </div>
  );
};