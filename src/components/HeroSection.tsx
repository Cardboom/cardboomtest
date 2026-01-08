import { Button } from '@/components/ui/button';
import { ArrowRight, DollarSign, Users, ShoppingCart, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedCounter } from './AnimatedCounter';

export const HeroSection = () => {
  const { t } = useLanguage();
  const { currency } = useCurrency();
  const navigate = useNavigate();
  
  const { data: realStats } = useQuery({
    queryKey: ['hero-stats'],
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const [listingsRes, profilesRes, ordersRes, monthOrdersRes] = await Promise.all([
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('price'),
        supabase.from('orders').select('id').gte('created_at', monthStart.toISOString())
      ]);
      
      const totalVolume = ordersRes.data?.reduce((sum, order) => sum + Number(order.price), 0) || 0;
      const soldThisMonth = monthOrdersRes.data?.length || 0;
      
      return {
        totalVolume,
        soldThisMonth,
        activeListings: listingsRes.count || 0,
        traders: profilesRes.count || 0
      };
    }
  });

  const formatCurrency = (value: number) => {
    const displayValue = currency === 'USD' ? value / 34.5 : value;
    const symbol = currency === 'USD' ? '$' : '₺';
    if (displayValue >= 1e6) return `${symbol}${(displayValue / 1e6).toFixed(1)}M`;
    if (displayValue >= 1e3) return `${symbol}${(displayValue / 1e3).toFixed(1)}K`;
    return `${symbol}${displayValue.toFixed(0)}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toString();
  };

  const stats = [
    { 
      label: 'Trading Volume', 
      rawValue: realStats?.totalVolume || 0, 
      formatFn: formatCurrency,
      icon: DollarSign,
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      iconColor: 'text-emerald-600 dark:text-emerald-400'
    },
    { 
      label: 'Active Traders', 
      rawValue: realStats?.traders || 0, 
      formatFn: formatNumber,
      icon: Users,
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    { 
      label: 'Cards Sold This Month', 
      rawValue: realStats?.soldThisMonth || 0, 
      formatFn: formatNumber,
      icon: ShoppingCart,
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      iconColor: 'text-amber-600 dark:text-amber-400'
    },
    { 
      label: 'Total Volume', 
      rawValue: realStats?.totalVolume || 0, 
      formatFn: formatCurrency,
      icon: TrendingUp,
      bgColor: 'bg-violet-50 dark:bg-violet-950/30',
      iconBg: 'bg-violet-100 dark:bg-violet-900/50',
      iconColor: 'text-violet-600 dark:text-violet-400'
    }
  ];

  return (
    <section className="relative bg-background">
      {/* Hero Content */}
      <div className="container mx-auto px-4 pt-20 pb-12 lg:pt-32 lg:pb-16">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          {/* Headline */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            <span className="text-foreground">Grade your </span>
            <span className="text-primary">Card</span>
            <br />
            <span className="text-primary">Boom </span>
            <span className="text-foreground">Your Value</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
            Buy, sell, grade, and track cards, figures, gaming items, and fractional collectibles — all in one trusted base.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="h-14 px-8 rounded-full font-semibold text-base cursor-pointer"
            >
              Start Investing
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              variant="outline"
              size="lg" 
              onClick={() => navigate('/markets')}
              className="h-14 px-8 rounded-full font-semibold text-base cursor-pointer"
            >
              View Markets
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 pb-16 lg:pb-24">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 rounded-2xl overflow-hidden border border-border/50">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={stat.label} 
                className={`${stat.bgColor} p-6 lg:p-8 text-center ${
                  index < stats.length - 1 ? 'border-r border-border/30' : ''
                } ${index < 2 ? 'border-b lg:border-b-0 border-border/30' : ''}`}
              >
                <div className={`${stat.iconBg} w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4`}>
                  <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-1">
                  <AnimatedCounter 
                    value={stat.rawValue} 
                    formatFn={stat.formatFn}
                    duration={1000}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
