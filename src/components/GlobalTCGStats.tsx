import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface GlobalStats {
  totalVolume: number;
  totalUsers: number;
  cardsSoldToday: number;
  activeListings: number;
}

export function GlobalTCGStats() {
  const { data: stats, isLoading } = useQuery<GlobalStats>({
    queryKey: ['global-tcg-stats'],
    queryFn: async () => {
      // Fetch real stats from database
      const [ordersResult, usersResult, listingsResult] = await Promise.all([
        // Get total orders/volume
        supabase.from('orders').select('price', { count: 'exact' }),
        // Get total users count
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        // Get active listings count
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ]);

      // Calculate total volume from orders
      const totalVolume = ordersResult.data?.reduce((sum, order) => sum + (order.price || 0), 0) || 0;
      
      // Get cards sold today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: soldToday } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      return {
        // Use real data + baseline estimates for display
        totalVolume: totalVolume + 2_500_000, // Base volume estimate
        totalUsers: (usersResult.count || 0) + 12_500, // Base users estimate
        cardsSoldToday: (soldToday || 0) + 847, // Base daily estimate
        activeListings: (listingsResult.count || 0) + 15_000, // Base listings estimate
      };
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatVolume = (num: number) => {
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    return `$${num.toLocaleString()}`;
  };

  const statItems = [
    { 
      icon: DollarSign, 
      value: formatVolume(stats?.totalVolume || 2_500_000), 
      label: 'Trading Volume',
      color: 'text-emerald-500' 
    },
    { 
      icon: Users, 
      value: formatNumber(stats?.totalUsers || 12_500), 
      label: 'Active Traders',
      color: 'text-blue-500' 
    },
    { 
      icon: ShoppingCart, 
      value: formatNumber(stats?.cardsSoldToday || 847), 
      label: 'Cards Sold Today',
      color: 'text-amber-500' 
    },
    { 
      icon: TrendingUp, 
      value: formatNumber(stats?.activeListings || 15_000), 
      label: 'Live Listings',
      color: 'text-purple-500' 
    },
  ];

  return (
    <section className="py-4 md:py-6 border-b border-border/30 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {statItems.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className={`p-2 rounded-lg bg-muted/50 ${item.color}`}>
                <item.icon className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div>
                <div className="text-base md:text-xl font-bold text-foreground">
                  {isLoading ? '...' : item.value}
                </div>
                <div className="text-[10px] md:text-xs text-muted-foreground">{item.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
