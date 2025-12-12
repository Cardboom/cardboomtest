import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Users, Layers, DollarSign } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const HeroSection = () => {
  const { t } = useLanguage();
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
        supabase.from('orders').select('price').gte('created_at', twentyFourHoursAgo.toISOString()),
      ]);

      const totalVolume = ordersRes.data?.reduce((sum, order) => sum + Number(order.price), 0) || 0;
      const volume24h = orders24hRes.data?.reduce((sum, order) => sum + Number(order.price), 0) || 0;

      return {
        totalVolume,
        volume24h,
        activeListings: listingsRes.count || 0,
        traders: profilesRes.count || 0,
      };
    },
  });

  const formatValue = (value: number, type: 'currency' | 'number') => {
    if (type === 'currency') {
      if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
      if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
      return `$${value.toFixed(0)}`;
    }
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
    return value.toString();
  };

  const stats = [
    { label: t.hero.totalVolume, value: formatValue(realStats?.totalVolume || 0, 'currency'), icon: DollarSign },
    { label: t.hero.volume24h, value: formatValue(realStats?.volume24h || 0, 'currency'), icon: TrendingUp },
    { label: t.hero.activeListings, value: formatValue(realStats?.activeListings || 0, 'number'), icon: Layers },
    { label: t.hero.traders, value: formatValue(realStats?.traders || 0, 'number'), icon: Users },
  ];

  const scrollToListings = () => {
    const listingsSection = document.querySelector('section:last-of-type');
    listingsSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative py-20 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium mb-6 animate-fade-in">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            {t.hero.badge}
          </div>
          
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
            {t.hero.title}<br />
            <span className="text-gradient-primary">{t.hero.titleHighlight}</span>
          </h1>
          
          <p className="text-muted-foreground text-lg md:text-xl mb-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '200ms' }}>
            {t.hero.description}
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <Button variant="hero" size="xl" onClick={scrollToListings}>
              {t.hero.startTrading}
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="glass" size="xl" onClick={() => navigate('/markets')}>
              {t.hero.exploreMarket}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '400ms' }}>
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="glass rounded-xl p-4 text-center hover:border-primary/50 transition-all duration-300 hover:scale-105"
              style={{ animationDelay: `${400 + index * 100}ms` }}
            >
              <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
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
