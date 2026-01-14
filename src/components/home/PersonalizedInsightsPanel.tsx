import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Sparkles, TrendingUp, TrendingDown, Lightbulb, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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
  userId?: string;
}

export const PersonalizedInsightsPanel = ({ userId }: PersonalizedInsightsPanelProps) => {
  const { t } = useLanguage();
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

  // Helper to get translated category
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'Market Pulse': return t.home.marketPulse;
      case 'Hot Take': return t.home.hotTake;
      case 'Hidden Gem': return t.home.hiddenGem;
      case 'Getting Started': return t.home.gettingStarted;
      case 'Did You Know': return t.home.didYouKnow;
      case 'Pro Tip': return t.home.proTip;
      case 'Status': return t.home.status;
      default: return category;
    }
  };

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
          { id: 'welcome', icon: '👋', message: t.home.buildPortfolio, type: 'tip', category: 'Getting Started' },
          { id: 'tip-1', icon: '🧠', message: t.home.aiAnalyzes, type: 'neutral', category: 'Did You Know' },
          { id: 'tip-2', icon: '🔔', message: t.home.setPriceAlerts, type: 'tip', category: 'Pro Tip' },
        );
      }

      setInsights(newInsights);
    } catch (error) {
      console.error('Error fetching insights:', error);
      setInsights([{ id: 'fallback', icon: '📊', message: t.home.tradingDeskReady, type: 'neutral', category: 'Status' }]);
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
      
      {/* Dynamic gradient based on insight type */}
      <div className={cn(
        "absolute inset-0 opacity-20 pointer-events-none transition-colors duration-500",
        currentInsight?.type === 'bullish' && "bg-gradient-to-br from-gain/30 via-transparent to-transparent",
        currentInsight?.type === 'bearish' && "bg-gradient-to-br from-loss/30 via-transparent to-transparent",
        currentInsight?.type === 'tip' && "bg-gradient-to-br from-primary/30 via-transparent to-transparent",
        currentInsight?.type === 'neutral' && "bg-gradient-to-br from-muted/30 via-transparent to-transparent"
      )} />
      
      {/* Header */}
      <div className="absolute top-2 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-primary" />
          </div>
          <span className="font-sans text-[10px] md:text-[11px] text-primary uppercase tracking-widest font-bold">
            {t.home.aiInsights}
          </span>
        </div>
        {currentInsight?.category && (
          <span className={cn(
            "text-[9px] font-bold px-1.5 py-0.5 rounded",
            typeConfig.bg, typeConfig.color
          )}>
            {getCategoryLabel(currentInsight.category)}
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
                <p className="text-sm font-medium text-white leading-relaxed line-clamp-2">
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
        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden mr-4">
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
        <span className="text-[10px] text-white/60 font-medium">
          {currentIndex + 1}/{insights.length}
        </span>
      </div>
    </div>
  );
};
