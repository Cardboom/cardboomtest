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

  // Rotate insights
  useEffect(() => {
    if (insights.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % insights.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [insights.length]);

  const fetchInsights = async () => {
    const newInsights: Insight[] = [];

    try {
      // Get user's portfolio items
      const { data: portfolioItems } = await supabase
        .from('portfolio_items')
        .select('*, market_item:market_items(current_price, change_7d, name)')
        .eq('user_id', userId);

      // Get user's card instances
      const { data: cardInstances } = await supabase
        .from('card_instances')
        .select('id, current_value, acquisition_price, title')
        .eq('owner_user_id', userId)
        .eq('is_active', true);

      // Get user's listings
      const { data: listings } = await supabase
        .from('listings')
        .select('id, title, price, created_at')
        .eq('seller_id', userId)
        .eq('status', 'active');

      // Get CardBoom Index (average market change)
      const { data: indexData } = await supabase
        .from('market_items')
        .select('change_7d')
        .not('change_7d', 'is', null)
        .limit(100);

      const indexChange = indexData 
        ? indexData.reduce((sum, i) => sum + (i.change_7d || 0), 0) / indexData.length
        : 0;

      // Calculate portfolio performance
      const portfolioValue = (cardInstances?.reduce((sum, c) => sum + (c.current_value || 0), 0) || 0) +
        (listings?.reduce((sum, l) => sum + (l.price || 0), 0) || 0);
      
      const portfolioCost = cardInstances?.reduce((sum, c) => sum + (c.acquisition_price || 0), 0) || 0;
      const portfolioChange = portfolioCost > 0 ? ((portfolioValue - portfolioCost) / portfolioCost) * 100 : 0;
      
      // Calculate if outperforming index
      const outperformance = portfolioChange - indexChange;

      if (outperformance > 0 && portfolioValue > 0) {
        newInsights.push({
          id: 'outperform',
          icon: '📊',
          message: `Your Vault outperformed the CardBoom Index by`,
          metric: `+${outperformance.toFixed(1)}%`,
          isPositive: true,
        });
      } else if (portfolioValue > 0) {
        newInsights.push({
          id: 'performance',
          icon: '📊',
          message: `Your portfolio is tracking the CardBoom Index at`,
          metric: `${portfolioChange >= 0 ? '+' : ''}${portfolioChange.toFixed(1)}%`,
          isPositive: portfolioChange >= 0,
        });
      }

      // Find trending cards in portfolio
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
          message: `${(topTrending.market_item as any)?.name?.substring(0, 25) || 'One of your cards'} is trending above market`,
          metric: `+${((topTrending.market_item as any)?.change_7d || 0).toFixed(1)}%`,
          isPositive: true,
        });
      }

      // Grading insight
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
            id: 'grading',
            icon: '🧠',
            message: `Your average CardBoom grade is`,
            metric: `${avgGrade.toFixed(1)}`,
            isPositive: avgGrade >= 9,
          });
        }
      }

      // Listings insight
      if (listings && listings.length > 0) {
        const totalListingValue = listings.reduce((sum, l) => sum + (l.price || 0), 0);
        newInsights.push({
          id: 'listings',
          icon: '🏷️',
          message: `You have ${listings.length} active listings worth`,
          metric: `$${totalListingValue.toLocaleString()}`,
          isPositive: true,
        });
      }

      // Fallback insights if user has no activity
      if (newInsights.length === 0) {
        newInsights.push(
          {
            id: 'welcome',
            icon: '👋',
            message: 'Start building your portfolio to get personalized insights',
            metric: '',
            isPositive: true,
          },
          {
            id: 'tip-1',
            icon: '💡',
            message: 'CardBoom AI analyzes market trends for you',
            metric: '24/7',
            isPositive: true,
          },
          {
            id: 'tip-2',
            icon: '🔔',
            message: 'Set price alerts to never miss a deal',
            metric: '',
            isPositive: true,
          },
        );
      }

      setInsights(newInsights);
    } catch (error) {
      console.error('Error fetching insights:', error);
      setInsights([{
        id: 'fallback',
        icon: '📊',
        message: 'Your personal AI trading desk is ready',
        metric: '',
        isPositive: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const currentInsight = insights[currentIndex];

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

        {/* Gradient accent */}
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary via-primary/50 to-transparent" />

        {/* AI indicator header */}
        <div className="absolute top-3 left-4 flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-primary" />
          </div>
          <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">
            AI MARKET INSIGHT
          </span>
        </div>

        {/* Main content */}
        <div className="absolute inset-x-0 top-10 md:top-12 bottom-0 flex items-center justify-center px-6 md:px-12">
          <AnimatePresence mode="wait">
            {currentInsight && (
              <motion.div
                key={currentInsight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="text-2xl md:text-4xl">{currentInsight.icon}</span>
                </div>
                <p className="font-mono text-sm md:text-lg text-white/80 tracking-wide mb-1">
                  {currentInsight.message}
                </p>
                {currentInsight.metric && (
                  <p className={cn(
                    "font-mono text-xl md:text-3xl font-bold tracking-wider",
                    currentInsight.isPositive ? "text-emerald-400" : "text-red-400"
                  )}>
                    {currentInsight.metric}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {insights.slice(0, 5).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                i === currentIndex % Math.min(5, insights.length)
                  ? "bg-primary w-4"
                  : "bg-gray-600"
              )}
            />
          ))}
        </div>

        {/* Branding */}
        <div className="absolute bottom-2 right-4">
          <span className="font-mono text-[9px] text-gray-600 uppercase tracking-widest">
            PERSONAL TRADING DESK
          </span>
        </div>
      </div>
    </div>
  );
};
