import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface Insight {
  id: string;
  icon: string;
  message: string;
  metric?: string;
  isPositive?: boolean;
  isLongForm?: boolean; // For AI buzz text
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

  // Rotate insights - SLOWER: 8 seconds
  useEffect(() => {
    if (insights.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % insights.length);
    }, 8000);
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
        
        // Add CardBoom Index insight
        newInsights.push({
          id: 'cb-index',
          icon: summary.cardBoomIndex >= 0 ? '📈' : '📉',
          message: 'CardBoom Index',
          metric: `${summary.cardBoomIndex >= 0 ? '+' : ''}${summary.cardBoomIndex.toFixed(2)}%`,
          isPositive: summary.cardBoomIndex >= 0,
        });

        // Add Platform Grading Average
        if (summary.platformGradingAvg > 0) {
          newInsights.push({
            id: 'grading-avg',
            icon: '🏆',
            message: 'Platform Grading Avg',
            metric: `${summary.platformGradingAvg.toFixed(1)}/10`,
            isPositive: summary.platformGradingAvg >= 8.5,
          });
        }

        // Add Community Buzz (AI-generated)
        if (summary.communityBuzz) {
          newInsights.push({
            id: 'buzz',
            icon: summary.sentiment === 'bullish' ? '🔥' : summary.sentiment === 'bearish' ? '❄️' : '💬',
            message: summary.communityBuzz,
            isLongForm: true,
          });
        }

        // Add Hot Take (AI-generated)
        if (summary.hotTake) {
          newInsights.push({
            id: 'hot-take',
            icon: '🎯',
            message: summary.hotTake,
            isLongForm: true,
          });
        }

        // Add Sleeper pick (AI-generated)
        if (summary.sleeper) {
          newInsights.push({
            id: 'sleeper',
            icon: '👀',
            message: summary.sleeper,
            isLongForm: true,
          });
        }

        // Add weekly volume
        if (summary.weeklyVolume > 0) {
          newInsights.push({
            id: 'volume',
            icon: '⚡',
            message: 'Weekly trades',
            metric: summary.weeklyVolume.toLocaleString(),
            isPositive: true,
          });
        }
      }

      // Fetch user-specific data
      const { data: portfolioItems } = await supabase
        .from('portfolio_items')
        .select('*, market_item:market_items(current_price, change_7d, name)')
        .eq('user_id', userId);

      const { data: cardInstances } = await supabase
        .from('card_instances')
        .select('id, current_value, acquisition_price, title')
        .eq('owner_user_id', userId)
        .eq('is_active', true);

      const { data: listings } = await supabase
        .from('listings')
        .select('id, title, price, created_at')
        .eq('seller_id', userId)
        .eq('status', 'active');

      const { data: indexData } = await supabase
        .from('market_items')
        .select('change_7d')
        .not('change_7d', 'is', null)
        .limit(100);

      const indexChange = indexData 
        ? indexData.reduce((sum, i) => sum + (i.change_7d || 0), 0) / indexData.length
        : 0;

      const portfolioValue = (cardInstances?.reduce((sum, c) => sum + (c.current_value || 0), 0) || 0) +
        (listings?.reduce((sum, l) => sum + (l.price || 0), 0) || 0);
      
      const portfolioCost = cardInstances?.reduce((sum, c) => sum + (c.acquisition_price || 0), 0) || 0;
      const portfolioChange = portfolioCost > 0 ? ((portfolioValue - portfolioCost) / portfolioCost) * 100 : 0;
      const outperformance = portfolioChange - indexChange;

      if (outperformance > 0 && portfolioValue > 0) {
        newInsights.push({
          id: 'outperform',
          icon: '📊',
          message: `Your vault outperformed index by`,
          metric: `+${outperformance.toFixed(1)}%`,
          isPositive: true,
        });
      } else if (portfolioValue > 0) {
        newInsights.push({
          id: 'performance',
          icon: '📊',
          message: `Portfolio tracking index`,
          metric: `${portfolioChange >= 0 ? '+' : ''}${portfolioChange.toFixed(1)}%`,
          isPositive: portfolioChange >= 0,
        });
      }

      const trendingCards = portfolioItems?.filter(
        p => (p.market_item as any)?.change_7d > 5
      ) || [];

      if (trendingCards.length > 0) {
        const topTrending = trendingCards.sort(
          (a, b) => ((b.market_item as any)?.change_7d || 0) - ((a.market_item as any)?.change_7d || 0)
        )[0];
        newInsights.push({
          id: 'trending',
          icon: '📈',
          message: `${(topTrending.market_item as any)?.name?.substring(0, 20) || 'Card'} trending`,
          metric: `+${((topTrending.market_item as any)?.change_7d || 0).toFixed(1)}%`,
          isPositive: true,
        });
      }

      // User's personal grading average
      const { data: gradingOrders } = await supabase
        .from('grading_orders')
        .select('id, final_grade')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('final_grade', 'is', null)
        .limit(10);

      if (gradingOrders && gradingOrders.length > 0) {
        const avgGrade = gradingOrders.reduce((sum, g) => {
          const grade = parseFloat(String(g.final_grade || '0'));
          return sum + (isNaN(grade) ? 0 : grade);
        }, 0) / gradingOrders.length;

        if (avgGrade >= 8) {
          newInsights.push({
            id: 'your-grading',
            icon: '🧠',
            message: `Your avg grade`,
            metric: `${avgGrade.toFixed(1)}`,
            isPositive: avgGrade >= 9,
          });
        }
      }

      if (listings && listings.length > 0) {
        const totalListingValue = listings.reduce((sum, l) => sum + (l.price || 0), 0);
        newInsights.push({
          id: 'listings',
          icon: '🏷️',
          message: `${listings.length} active listings`,
          metric: `$${totalListingValue.toLocaleString()}`,
          isPositive: true,
        });
      }

      if (newInsights.length === 0) {
        newInsights.push(
          { id: 'welcome', icon: '👋', message: 'Build portfolio for insights', metric: '', isPositive: true },
          { id: 'tip-1', icon: '💡', message: 'AI analyzes market trends', metric: '24/7', isPositive: true },
          { id: 'tip-2', icon: '🔔', message: 'Set price alerts', metric: '', isPositive: true },
        );
      }

      setInsights(newInsights);
    } catch (error) {
      console.error('Error fetching insights:', error);
      setInsights([{ id: 'fallback', icon: '📊', message: 'Trading desk ready', metric: '', isPositive: true }]);
    } finally {
      setLoading(false);
    }
  };

  const currentInsight = insights[currentIndex];

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

      <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-primary via-primary/50 to-transparent" />

      {/* AI header */}
      <div className="absolute top-2 left-3 flex items-center gap-1.5">
        <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
          <Sparkles className="w-2.5 h-2.5 text-primary" />
        </div>
        <span className="font-mono text-[8px] text-gray-400 uppercase tracking-widest">
          AI INSIGHT
        </span>
      </div>

      {/* Main content */}
      <div className="absolute inset-x-0 top-8 md:top-9 bottom-0 flex items-center justify-center px-4 md:px-8">
        <AnimatePresence mode="wait">
          {currentInsight && (
            <motion.div
              key={currentInsight.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-full"
            >
              {currentInsight.isLongForm ? (
                // Long-form AI insight (community buzz, hot take, sleeper)
                <>
                  <div className="flex items-center justify-center gap-2 mb-1.5">
                    <span className="text-lg md:text-xl">{currentInsight.icon}</span>
                  </div>
                  <p className="font-mono text-[9px] md:text-[11px] text-white/90 tracking-wide leading-relaxed max-w-[280px] md:max-w-[340px] mx-auto line-clamp-3">
                    {currentInsight.message}
                  </p>
                </>
              ) : (
                // Standard metric insight
                <>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-lg md:text-2xl">{currentInsight.icon}</span>
                  </div>
                  <p className="font-mono text-[10px] md:text-xs text-white/80 tracking-wide mb-0.5">
                    {currentInsight.message}
                  </p>
                  {currentInsight.metric && (
                    <p className={cn(
                      "font-mono text-base md:text-xl font-bold tracking-wider",
                      currentInsight.isPositive ? "text-emerald-400" : "text-red-400"
                    )}>
                      {currentInsight.metric}
                    </p>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
        {insights.slice(0, 8).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1 h-1 rounded-full transition-all duration-300",
              i === currentIndex % Math.min(8, insights.length)
                ? "bg-primary w-3"
                : "bg-gray-600"
            )}
          />
        ))}
      </div>

      <div className="absolute bottom-1 right-3">
        <span className="font-mono text-[7px] text-gray-600 uppercase tracking-widest">
          TRADING DESK
        </span>
      </div>
    </div>
  );
};