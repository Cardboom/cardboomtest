import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const HeroSection = () => {
  const { t } = useLanguage();
  const { currency } = useCurrency();
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

  const handleGetStarted = () => {
    navigate('/auth');
  };

  const stats = [
    { label: t.hero.totalVolume, value: formatValue(realStats?.totalVolume || 0, 'currency') },
    { label: t.hero.volume24h, value: formatValue(realStats?.volume24h || 0, 'currency') },
    { label: t.hero.activeListings, value: formatValue(realStats?.activeListings || 0, 'number') },
    { label: t.hero.traders, value: formatValue(realStats?.traders || 0, 'number') }
  ];

  return (
    <section className="relative min-h-[100vh] flex items-center overflow-hidden bg-gradient-to-b from-background via-background to-background">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />
        
        {/* Floating cards decoration */}
        <div className="absolute top-1/4 left-[10%] w-20 h-28 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/20 rotate-12 animate-float" />
        <div className="absolute top-1/3 right-[15%] w-16 h-24 bg-gradient-to-br from-primary/15 to-primary/5 rounded-lg border border-primary/15 -rotate-6 animate-float" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-1/3 left-[20%] w-14 h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/10 rotate-6 animate-float" style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary backdrop-blur-sm animate-fade-in">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            {t.hero.badge}
          </div>
          
          {/* Headline */}
          <h1 className="font-display text-5xl md:text-6xl lg:text-8xl font-bold tracking-tight text-foreground leading-[1] animate-fade-in" style={{ animationDelay: '100ms' }}>
            {t.hero.title}
            <br />
            <span className="text-primary">{t.hero.titleHighlight}</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto animate-fade-in" style={{ animationDelay: '200ms' }}>
            {t.hero.description}
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="h-14 px-10 rounded-full font-semibold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              {t.hero.startTrading}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              variant="outline"
              size="lg" 
              onClick={() => navigate('/markets')}
              className="h-14 px-10 rounded-full font-semibold text-base backdrop-blur-sm bg-background/50"
            >
              {t.hero.exploreMarket}
            </Button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 sm:gap-16 pt-16 animate-fade-in" style={{ animationDelay: '400ms' }}>
            {stats.map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-5xl font-bold font-display text-foreground">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest mt-2">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};