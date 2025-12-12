import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Users, Layers, DollarSign } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const HeroSection = () => {
  const { t } = useLanguage();
  const { currency, formatPrice } = useCurrency();
  const navigate = useNavigate();
  
  const { data: realStats } = useQuery({
    queryKey: ['hero-stats'],
    queryFn: async () => {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const [listingsRes, profilesRes, ordersRes, orders24hRes] = await Promise.all([
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('price'),
        supabase.from('orders').select('price').gte('created_at', twentyFourHoursAgo.toISOString())
      ]);
      
      const totalVolume = ordersRes.data?.reduce((sum, order) => sum + Number(order.price), 0) || 0;
      const volume24h = orders24hRes.data?.reduce((sum, order) => sum + Number(order.price), 0) || 0;
      
      return {
        totalVolume,
        volume24h,
        activeListings: listingsRes.count || 0,
        traders: profilesRes.count || 0
      };
    }
  });

  const formatValue = (value: number, type: 'currency' | 'number') => {
    if (type === 'currency') {
      const displayValue = currency === 'USD' ? value / 34.5 : value;
      const symbol = currency === 'USD' ? '$' : '₺';
      if (displayValue >= 1e9) return `${symbol}${(displayValue / 1e9).toFixed(2)}B`;
      if (displayValue >= 1e6) return `${symbol}${(displayValue / 1e6).toFixed(1)}M`;
      if (displayValue >= 1e3) return `${symbol}${(displayValue / 1e3).toFixed(1)}K`;
      return `${symbol}${displayValue.toFixed(0)}`;
    }
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
    return value.toString();
  };

  const stats = [
    { label: t.hero.totalVolume, value: formatValue(realStats?.totalVolume || 0, 'currency'), icon: DollarSign },
    { label: t.hero.volume24h, value: formatValue(realStats?.volume24h || 0, 'currency'), icon: TrendingUp },
    { label: t.hero.activeListings, value: formatValue(realStats?.activeListings || 0, 'number'), icon: Layers },
    { label: t.hero.traders, value: formatValue(realStats?.traders || 0, 'number'), icon: Users }
  ];

  const scrollToListings = () => {
    const listingsSection = document.querySelector('section:last-of-type');
    listingsSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative py-20 lg:py-28 overflow-hidden">
      {/* Subtle Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent dark:from-primary/[0.05]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            {t.hero.badge}
          </div>
          
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
            <span className="text-gradient-primary">Boom</span> your collection.
            <br />
            <span className="text-foreground">Collect Smarter.</span>
          </h1>
          
          <p className="text-muted-foreground text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            {t.hero.description}
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="xl" onClick={scrollToListings} className="shadow-md hover:shadow-lg">
              {t.hero.startTrading}
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="xl" onClick={() => navigate('/markets')}>
              {t.hero.exploreMarket}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {stats.map(stat => (
            <div key={stat.label} className="rounded-xl border border-border/50 bg-card/50 p-5 text-center hover:border-primary/30 hover:shadow-md transition-all duration-300">
              <stat.icon className="w-5 h-5 text-primary mx-auto mb-3" />
              <div className="text-2xl md:text-3xl font-bold font-display text-foreground mb-1">
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
