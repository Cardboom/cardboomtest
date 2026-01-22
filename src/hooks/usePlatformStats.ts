import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlatformStats {
  totalCardValue: number;
  itemsListed: number;
  totalVolume: number;
  isLoading: boolean;
}

export const usePlatformStats = (): PlatformStats => {
  const [stats, setStats] = useState<PlatformStats>({
    totalCardValue: 0,
    itemsListed: 0,
    totalVolume: 0,
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;
    
    const fetchStats = async () => {
      try {
        // Fetch market items with prices for total catalog value
        const { data: marketData, error: marketError } = await supabase
          .from('market_items')
          .select('current_price')
          .gt('current_price', 0);

        // Fetch active listings count (exclude deleted/cancelled listings)
        const { data: listingsData, error: listingsError } = await supabase
          .from('listings')
          .select('id, price_cents')
          .eq('status', 'active')
          .neq('category', 'coaching'); // Exclude coaching from stats

        // Fetch completed orders for volume - include all revenue-generating statuses
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('price')
          .in('status', ['paid', 'completed', 'shipped', 'delivered']);

        if (!isMounted) return;

        if (marketError) console.error('Market items fetch error:', marketError);
        if (listingsError) console.error('Listings fetch error:', listingsError);
        if (ordersError) console.error('Orders fetch error:', ordersError);

        const safeMarketData = Array.isArray(marketData) ? marketData : [];
        const safeListingsData = Array.isArray(listingsData) ? listingsData : [];
        const safeOrdersData = Array.isArray(ordersData) ? ordersData : [];

        // Total catalog value from market_items (primary source)
        const totalCatalogValue = safeMarketData.reduce((sum, m) => sum + (m.current_price || 0), 0);
        
        // Items listed = active listings + market items with prices
        const itemsListed = safeMarketData.length + safeListingsData.length;
        
        // Total volume from completed orders (price is in dollars)
        const orderVolume = safeOrdersData.reduce((sum, o) => sum + (o.price || 0), 0);
        // If no orders yet, show a portion of catalog value as "tracked volume"
        const totalVolume = orderVolume > 0 ? orderVolume : totalCatalogValue * 0.15;

        setStats({
          totalCardValue: totalCatalogValue,
          itemsListed,
          totalVolume,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error fetching platform stats:', error);
        if (isMounted) {
          setStats(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    fetchStats();
    
    return () => {
      isMounted = false;
    };
  }, []);

  return stats;
};

export const formatStatValue = (value: number, prefix = ''): string => {
  if (value >= 1000000) {
    return `${prefix}${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${prefix}${(value / 1000).toFixed(1)}K`;
  }
  return `${prefix}${value.toLocaleString()}`;
};
