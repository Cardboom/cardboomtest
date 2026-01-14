import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Users, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

export const MarketExplorerStats = () => {
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    totalUsers: 0,
    totalVolume: 0,
    indexedItems: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch market items count (indexed from PriceCharting)
      const { count: marketItemsCount, error: marketError } = await supabase
        .from('market_items')
        .select('*', { count: 'exact', head: true });

      if (marketError) throw marketError;

      // Fetch active listings count and total value (exclude coaching)
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('price, status')
        .neq('category', 'coaching');

      if (listingsError) throw listingsError;

      const activeListings = listings?.filter(l => l.status === 'active') || [];
      const totalValue = activeListings.reduce((sum, l) => sum + Number(l.price), 0);

      // Fetch users count from profiles
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Fetch completed orders for volume
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('price');

      if (ordersError) throw ordersError;

      const totalVolume = orders?.reduce((sum, o) => sum + Number(o.price), 0) || 0;

      setStats({
        totalListings: listings?.length || 0,
        activeListings: activeListings.length,
        totalUsers: usersCount || 0,
        totalVolume: totalVolume + totalValue,
        indexedItems: marketItemsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const displayStats = [
    { 
      label: 'Indexed Items', 
      value: formatNumber(stats.indexedItems), 
      change: 'From PriceCharting',
      isPositive: true,
      icon: BarChart3 
    },
    { 
      label: 'Total Volume', 
      value: formatValue(stats.totalVolume), 
      change: null,
      isPositive: true,
      icon: DollarSign 
    },
    { 
      label: 'Active Listings', 
      value: formatNumber(stats.activeListings), 
      change: `${stats.totalListings} total`, 
      isPositive: true,
      icon: ShoppingBag 
    },
    { 
      label: 'Total Traders', 
      value: formatNumber(stats.totalUsers), 
      change: null,
      isPositive: true,
      icon: Users 
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {displayStats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-[#f5f5f7] dark:bg-card/80 rounded-xl p-4 border border-black/[0.04] dark:border-white/5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <stat.icon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-muted-foreground text-sm">{stat.label}</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold font-display text-foreground">
              {loading ? '...' : stat.value}
            </span>
            {stat.change && (
              <span className={`text-sm font-medium flex items-center gap-1 ${stat.isPositive ? 'text-gain' : 'text-loss'}`}>
                {stat.isPositive && stat.change.startsWith('+') && <TrendingUp className="w-3 h-3" />}
                {stat.change}
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};
