import { useState, useEffect, useMemo } from 'react';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MarketInsight {
  text: string;
  type: 'bullish' | 'bearish' | 'neutral' | 'hot';
  category?: string;
}

interface MarketItem {
  id: string;
  name: string;
  category: string;
  current_price: number;
  change_24h: number | null;
  change_7d: number | null;
  is_trending: boolean | null;
}

export const AIMarketInsight = () => {
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real market data and generate insights
  useEffect(() => {
    const fetchMarketInsights = async () => {
      try {
        // Fetch top gainers
        const { data: gainers } = await supabase
          .from('market_items')
          .select('name, category, current_price, change_24h')
          .not('change_24h', 'is', null)
          .gt('change_24h', 5)
          .not('image_url', 'is', null)
          .order('change_24h', { ascending: false })
          .limit(5);

        // Fetch top losers
        const { data: losers } = await supabase
          .from('market_items')
          .select('name, category, current_price, change_24h')
          .not('change_24h', 'is', null)
          .lt('change_24h', -5)
          .not('image_url', 'is', null)
          .order('change_24h', { ascending: true })
          .limit(3);

        // Fetch trending items
        const { data: trending } = await supabase
          .from('market_items')
          .select('name, category, current_price, change_24h')
          .eq('is_trending', true)
          .not('image_url', 'is', null)
          .limit(3);

        // Fetch category stats
        const { data: categoryStats } = await supabase
          .from('market_items')
          .select('category, change_24h')
          .not('change_24h', 'is', null)
          .not('image_url', 'is', null);

        const generatedInsights: MarketInsight[] = [];

        // Generate insights from top gainers
        gainers?.forEach((item) => {
          const change = item.change_24h?.toFixed(1);
          generatedInsights.push({
            text: `${item.name.slice(0, 30)} up ${change}% in 24h`,
            type: 'bullish',
            category: item.category,
          });
        });

        // Generate insights from losers
        losers?.forEach((item) => {
          const change = Math.abs(item.change_24h || 0).toFixed(1);
          generatedInsights.push({
            text: `${item.name.slice(0, 30)} down ${change}% - potential buy opportunity`,
            type: 'bearish',
            category: item.category,
          });
        });

        // Generate insights from trending
        trending?.forEach((item) => {
          generatedInsights.push({
            text: `${item.name.slice(0, 30)} trending with high demand`,
            type: 'hot',
            category: item.category,
          });
        });

        // Calculate category averages
        if (categoryStats && categoryStats.length > 0) {
          const categoryAvgs: Record<string, { sum: number; count: number }> = {};
          categoryStats.forEach((item) => {
            if (!categoryAvgs[item.category]) {
              categoryAvgs[item.category] = { sum: 0, count: 0 };
            }
            categoryAvgs[item.category].sum += item.change_24h || 0;
            categoryAvgs[item.category].count += 1;
          });

          const categoryLabels: Record<string, string> = {
            pokemon: 'Pokemon',
            yugioh: 'Yu-Gi-Oh!',
            mtg: 'MTG',
            lorcana: 'Disney Lorcana',
            'lol-riftbound': 'LoL Riftbound',
            gaming: 'Gaming',
            figures: 'Figures',
          };

          Object.entries(categoryAvgs).forEach(([cat, data]) => {
            const avg = data.sum / data.count;
            if (Math.abs(avg) > 2) {
              const label = categoryLabels[cat] || cat;
              generatedInsights.push({
                text: avg > 0 
                  ? `${label} market up ${avg.toFixed(1)}% on average today`
                  : `${label} market down ${Math.abs(avg).toFixed(1)}% - watch for opportunities`,
                type: avg > 0 ? 'bullish' : 'bearish',
                category: cat,
              });
            }
          });
        }

        // Shuffle insights for variety
        const shuffled = generatedInsights.sort(() => Math.random() - 0.5);
        
        if (shuffled.length > 0) {
          setInsights(shuffled);
        } else {
          // Fallback if no data
          setInsights([
            { text: "Market data loading...", type: 'neutral' }
          ]);
        }
      } catch (error) {
        console.error('Error fetching market insights:', error);
        setInsights([
          { text: "Analyzing market trends...", type: 'neutral' }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketInsights();
    
    // Refresh insights every 5 minutes
    const refreshInterval = setInterval(fetchMarketInsights, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Rotate through insights
  useEffect(() => {
    if (insights.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % insights.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [insights.length]);

  const currentInsight = insights[currentIndex] || { text: "Loading insights...", type: 'neutral' };

  const getIcon = () => {
    switch (currentInsight.type) {
      case 'bullish':
        return <TrendingUp className="w-3.5 h-3.5 text-gain" />;
      case 'bearish':
        return <TrendingDown className="w-3.5 h-3.5 text-loss" />;
      case 'hot':
        return <Flame className="w-3.5 h-3.5 text-orange-500" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-primary" />;
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20">
      <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
      <span className="text-xs font-medium text-muted-foreground">AI Insight:</span>
      <span className="text-xs text-foreground font-medium truncate max-w-[200px] md:max-w-[400px] transition-all duration-300">
        {currentInsight.text}
      </span>
      {getIcon()}
    </div>
  );
};
