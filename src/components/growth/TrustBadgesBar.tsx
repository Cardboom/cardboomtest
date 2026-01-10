import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, Users, TrendingUp, Shield, 
  BadgeCheck, Lock, Globe, Award
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';

interface TrustBadgesBarProps {
  compact?: boolean;
  className?: string;
}

export const TrustBadgesBar = ({ compact = false, className = '' }: TrustBadgesBarProps) => {
  const { formatPrice } = useCurrency();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['trust-stats'],
    queryFn: async () => {
      // Get verified sellers count
      const { count: verifiedSellers } = await supabase
        .from('seller_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // Get total completed trades
      const { count: totalTrades } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Get total trade volume
      const { data: orders } = await supabase
        .from('orders')
        .select('price')
        .eq('status', 'completed');

      const totalVolume = orders?.reduce((sum, o) => sum + Number(o.price || 0), 0) || 0;

      // Get active users (profiles created in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_login_at', thirtyDaysAgo.toISOString());

      return {
        verifiedSellers: verifiedSellers || 0,
        totalTrades: totalTrades || 0,
        totalVolume,
        activeUsers: activeUsers || 0,
        escrowProtected: true, // Feature flag
        insuranceEnabled: true // Feature flag
      };
    },
    staleTime: 60000 // Cache for 1 minute
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const badges = [
    {
      icon: <BadgeCheck className="w-4 h-4" />,
      label: 'Verified Sellers',
      value: formatNumber(stats?.verifiedSellers || 0),
      color: 'text-primary'
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: 'Total Trades',
      value: formatNumber(stats?.totalTrades || 0),
      color: 'text-gain'
    },
    {
      icon: <Shield className="w-4 h-4" />,
      label: 'Trade Volume',
      value: stats ? formatPrice(stats.totalVolume) : '$0',
      color: 'text-blue-500'
    },
    {
      icon: <Lock className="w-4 h-4" />,
      label: 'Escrow Protected',
      value: '100%',
      color: 'text-gain'
    },
    {
      icon: <Award className="w-4 h-4" />,
      label: 'Buyer Insurance',
      value: 'Active',
      color: 'text-amber-500'
    }
  ];

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center gap-6 py-3 ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-6 w-24 bg-muted/50 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center justify-center gap-4 text-xs ${className}`}>
        {badges.slice(0, 3).map((badge, index) => (
          <motion.div
            key={badge.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-1.5"
          >
            <span className={badge.color}>{badge.icon}</span>
            <span className="text-muted-foreground">{badge.value}</span>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className={`bg-muted/30 border-y border-border/50 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-4 md:gap-8 py-3 overflow-x-auto scrollbar-hide">
          {badges.map((badge, index) => (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <div className={`w-8 h-8 rounded-lg bg-background flex items-center justify-center ${badge.color}`}>
                {badge.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{badge.label}</span>
                <span className="text-sm font-semibold text-foreground">{badge.value}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
