import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Sparkles, TrendingUp, TrendingDown, Lightbulb, ChevronRight } from 'lucide-react';

interface Insight {
  id: string;
  icon: string;
  message: string;
  type: 'bullish' | 'bearish' | 'tip' | 'neutral';
  category?: string;
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
      const { data: aiSummary, error: aiError } = await supabase.functions.invoke('ai-market-summary', {
        body: { userId }
      });

      if (!aiError && aiSummary) {
        const summary = aiSummary as AIMarketSummary;
        
        if (summary.communityBuzz) {
          newInsights.push({
            id: 'buzz',
            icon: summary.sentiment === 'bullish' ? '🚀' : summary.sentiment === 'bearish' ? '📉' : '💬',
            message: summary.communityBuzz,
            type: summary.sentiment === 'bullish' ? 'bullish' : summary.sentiment === 'bearish' ? 'bearish' : 'neutral',
            category: 'Market Pulse',
          });
        }

        if (summary.hotTake) {
          newInsights.push({
            id: 'hot-take',
            icon: '🎯',
            message: summary.hotTake,
            type: 'tip',
            category: 'Hot Take',
          });
        }

        if (summary.sleeper) {
          newInsights.push({
            id: 'sleeper',
            icon: '💎',
            message: summary.sleeper,
            type: 'bullish',
            category: 'Hidden Gem',
          });
        }
      }

      if (newInsights.length === 0) {
        newInsights.push(
          { id: 'welcome', icon: '👋', message: 'Start building your portfolio to get personalized insights', type: 'tip', category: 'Getting Started' },
          { id: 'tip-1', icon: '🧠', message: 'Our AI analyzes market trends 24/7 to find opportunities', type: 'neutral', category: 'Did You Know' },
          { id: 'tip-2', icon: '🔔', message: 'Set price alerts to never miss a deal on cards you want', type: 'tip', category: 'Pro Tip' },
        );
      }

      setInsights(newInsights);
    } catch (error) {
      console.error('Error fetching insights:', error);
      setInsights([{ id: 'fallback', icon: '📊', message: 'Trading desk ready - explore the market', type: 'neutral', category: 'Status' }]);
    } finally {
      setLoading(false);
    }
  };

  const currentInsight = insights[currentIndex];

  const getTypeConfig = (type: Insight['type']) => {
    switch (type) {
      case 'bullish':
        return { 
          icon: TrendingUp, 
          color: 'text-gain',
          bg: 'bg-gain/10',
          border: 'border-gain/20'
        };
      case 'bearish':
        return { 
          icon: TrendingDown, 
          color: 'text-loss',
          bg: 'bg-loss/10',
          border: 'border-loss/20'
        };
      case 'tip':
        return { 
          icon: Lightbulb, 
          color: 'text-primary',
          bg: 'bg-primary/10',
          border: 'border-primary/20'
        };
      default:
        return { 
          icon: Sparkles, 
          color: 'text-muted-foreground',
          bg: 'bg-muted',
          border: 'border-border'
        };
    }
  };

  const typeConfig = currentInsight ? getTypeConfig(currentInsight.type) : getTypeConfig('neutral');
  const TypeIcon = typeConfig.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-card border border-border h-[120px] md:h-[160px]">
      {/* Decorative gradient */}
      <div className={cn(
        "absolute inset-0 opacity-30 pointer-events-none transition-colors duration-500",
        currentInsight?.type === 'bullish' && "bg-gradient-to-br from-gain/20 via-transparent to-transparent",
        currentInsight?.type === 'bearish' && "bg-gradient-to-br from-loss/20 via-transparent to-transparent",
        currentInsight?.type === 'tip' && "bg-gradient-to-br from-primary/20 via-transparent to-transparent",
        currentInsight?.type === 'neutral' && "bg-gradient-to-br from-muted via-transparent to-transparent"
      )} />
      
      {/* Header */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className={cn("p-1 rounded", typeConfig.bg)}>
            <Sparkles className={cn("w-3.5 h-3.5", typeConfig.color)} />
          </div>
          <span className="text-xs font-semibold text-foreground tracking-wide">
            AI Insights
          </span>
        </div>
        {currentInsight?.category && (
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full",
            typeConfig.bg, typeConfig.color
          )}>
            {currentInsight.category}
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="absolute inset-x-0 top-12 md:top-14 bottom-10 flex items-center px-4">
        <AnimatePresence mode="wait">
          {currentInsight && (
            <motion.div
              key={currentInsight.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex items-start gap-3 w-full"
            >
              {/* Icon */}
              <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl",
                typeConfig.bg
              )}>
                {currentInsight.icon}
              </div>
              
              {/* Message */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-relaxed line-clamp-2">
                  {currentInsight.message}
                </p>
              </div>

              {/* Type indicator */}
              <div className={cn(
                "flex-shrink-0 p-1.5 rounded-lg",
                typeConfig.bg
              )}>
                <TypeIcon className={cn("w-4 h-4", typeConfig.color)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer with progress */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
        {/* Progress bar */}
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden mr-4">
          <motion.div 
            className={cn("h-full rounded-full", 
              currentInsight?.type === 'bullish' && "bg-gain",
              currentInsight?.type === 'bearish' && "bg-loss",
              currentInsight?.type === 'tip' && "bg-primary",
              currentInsight?.type === 'neutral' && "bg-muted-foreground"
            )}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 7, ease: "linear" }}
            key={currentIndex}
          />
        </div>
        
        {/* Counter */}
        <span className="text-[10px] text-muted-foreground font-medium">
          {currentIndex + 1}/{insights.length}
        </span>
      </div>
    </div>
  );
};
