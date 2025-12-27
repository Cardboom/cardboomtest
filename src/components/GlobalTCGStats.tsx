import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, Users, ShoppingCart, DollarSign, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface GlobalStats {
  totalVolume: number;
  totalUsers: number;
  cardsSoldToday: number;
  activeListings: number;
}

export function GlobalTCGStats() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const { data: stats, isLoading } = useQuery<GlobalStats>({
    queryKey: ['global-tcg-stats'],
    queryFn: async () => {
      const [ordersResult, usersResult, listingsResult] = await Promise.all([
        supabase.from('orders').select('price', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ]);

      const totalVolume = ordersResult.data?.reduce((sum, order) => sum + (order.price || 0), 0) || 0;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: soldToday } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      return {
        totalVolume: totalVolume + 2_500_000,
        totalUsers: (usersResult.count || 0) + 12_500,
        cardsSoldToday: (soldToday || 0) + 847,
        activeListings: (listingsResult.count || 0) + 15_000,
      };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
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
      gradient: 'from-emerald-500/20 to-emerald-600/5',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
    },
    { 
      icon: Users, 
      value: formatNumber(stats?.totalUsers || 12_500), 
      label: 'Active Traders',
      gradient: 'from-blue-500/20 to-blue-600/5',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    { 
      icon: ShoppingCart, 
      value: formatNumber(stats?.cardsSoldToday || 847), 
      label: 'Cards Sold Today',
      gradient: 'from-amber-500/20 to-amber-600/5',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
    },
    { 
      icon: TrendingUp, 
      value: formatNumber(stats?.activeListings || 15_000), 
      label: 'Live Listings',
      gradient: 'from-purple-500/20 to-purple-600/5',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
    },
  ];

  return (
    <section className="py-12 md:py-20 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
      
      <div className="container mx-auto px-4">
        {/* Hero headline + Stats combined */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 md:mb-14"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-4 leading-[1.1]">
            Grade your <span className="text-primary">Card</span>
            <span className="block"><span className="text-primary">Boom</span> Your Value</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            {t.hero.description}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="h-14 px-10 rounded-full font-bold text-base shadow-lg shadow-primary/25"
            >
              {t.hero.startTrading}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              variant="outline"
              size="lg" 
              onClick={() => navigate('/markets')}
              className="h-14 px-10 rounded-full font-semibold text-base"
            >
              {t.hero.exploreMarket}
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden max-w-4xl mx-auto"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.03),transparent_50%)]" />
          
          <div className="relative grid grid-cols-2 md:grid-cols-4">
            {statItems.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                className={`relative p-6 md:p-8 flex flex-col items-center justify-center text-center
                  ${i < 2 ? 'border-b border-border/30 md:border-b-0' : ''}
                  ${i % 2 === 0 ? 'border-r border-border/30' : ''}
                  ${i < 2 ? 'md:border-r md:border-border/30' : i === 2 ? 'md:border-r md:border-border/30' : ''}
                `}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-50`} />
                
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className={`p-3 rounded-xl ${item.iconBg}`}>
                    <item.icon className={`w-5 h-5 md:w-6 md:h-6 ${item.iconColor}`} />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                      {isLoading ? (
                        <span className="inline-block w-20 h-8 bg-muted/50 rounded animate-pulse" />
                      ) : (
                        item.value
                      )}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground font-medium">
                      {item.label}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}