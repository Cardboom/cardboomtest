import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PortfolioHeatData {
  score: number;
  priceMovementScore: number;
  viewsScore: number;
  liquidityScore: number;
  calculatedAt: string;
  movedCards: number;
  totalViews: number;
}

export function usePortfolioHeat() {
  const [heatData, setHeatData] = useState<PortfolioHeatData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [portfolioAlerts, setPortfolioAlerts] = useState<string[]>([]);

  const fetchHeatScore = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate heat score via RPC
      const { data: score } = await supabase.rpc('calculate_portfolio_heat', {
        p_user_id: user.id
      });

      // Fetch the calculated data
      const { data: heatScore } = await supabase
        .from('portfolio_heat_scores')
        .select('*')
        .eq('user_id', user.id)
        .eq('calculated_at', new Date().toISOString().split('T')[0])
        .maybeSingle();

      // Get portfolio movement alerts
      const { data: portfolioItems } = await supabase
        .from('portfolio_items')
        .select(`
          id,
          market_item:market_items (
            name,
            change_24h,
            views_24h
          )
        `)
        .eq('user_id', user.id);

      const alerts: string[] = [];
      let movedCards = 0;
      let totalViews = 0;

      portfolioItems?.forEach((item: any) => {
        if (item.market_item) {
          const change = Math.abs(item.market_item.change_24h || 0);
          const views = item.market_item.views_24h || 0;
          totalViews += views;
          
          if (change > 2) {
            movedCards++;
          }
          if (views > 10) {
            alerts.push(`${item.market_item.name} was viewed ${views} times today`);
          }
        }
      });

      if (movedCards > 0) {
        alerts.unshift(`${movedCards} card${movedCards > 1 ? 's' : ''} in your portfolio moved today`);
      }

      setPortfolioAlerts(alerts.slice(0, 5));
      
      if (heatScore) {
        setHeatData({
          score: heatScore.score,
          priceMovementScore: heatScore.price_movement_score,
          viewsScore: heatScore.views_score,
          liquidityScore: heatScore.liquidity_score,
          calculatedAt: heatScore.calculated_at,
          movedCards,
          totalViews
        });
      }
    } catch (error) {
      console.error('Error fetching heat score:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHeatScore();
  }, [fetchHeatScore]);

  return {
    heatData,
    isLoading,
    portfolioAlerts,
    refetch: fetchHeatScore
  };
}
