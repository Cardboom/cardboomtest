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
        // Fetch active listings count and total value
        const { data: listingsData, error: listingsError } = await supabase
          .from('listings')
          .select('price_cents')
          .eq('status', 'active');

        // Fetch completed orders for volume
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('price_cents')
          .eq('status', 'completed');

        if (!isMounted) return;

        if (listingsError) console.error('Listings fetch error:', listingsError);
        if (ordersError) console.error('Orders fetch error:', ordersError);

        const safeListingsData = Array.isArray(listingsData) ? listingsData : [];
        const safeOrdersData = Array.isArray(ordersData) ? ordersData : [];

        const itemsListed = safeListingsData.length;
        const totalCardValue = safeListingsData.reduce((sum, l) => sum + (l.price_cents || 0), 0);
        const totalVolume = safeOrdersData.reduce((sum, o) => sum + (o.price_cents || 0), 0);

        setStats({
          totalCardValue: totalCardValue / 100, // Convert cents to dollars
          itemsListed,
          totalVolume: totalVolume / 100, // Convert cents to dollars
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
