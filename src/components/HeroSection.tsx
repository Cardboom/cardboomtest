import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, TrendingUp, Users, Layers, DollarSign, Shield, Zap, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

export const HeroSection = () => {
  const { t } = useLanguage();
  const { currency } = useCurrency();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  
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

  const features = [
    { icon: Shield, title: 'Secure Trading', desc: 'Vault storage & escrow protection' },
    { icon: Zap, title: 'Instant Deals', desc: 'Real-time price tracking' },
    { icon: Globe, title: 'Global Market', desc: 'Trade with collectors worldwide' }
  ];

  const handleGetStarted = () => {
    navigate('/auth');
  };

  return (
    <section className="relative min-h-[90vh] flex items-center bg-background">
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent" />
      
      <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-xs font-medium text-muted-foreground">
            <span className="w-1.5 h-1.5 bg-primary rounded-full" />
            {t.hero.badge}
          </div>
          
          {/* Headline */}
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.05]">
            Trade collectibles
            <br />
            <span className="text-primary">with confidence</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
            The trusted marketplace for trading cards and collectibles. Buy, sell, and track your portfolio.
          </p>
          
          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="h-12 px-8 rounded-full font-medium text-base"
            >
              Get started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              variant="outline"
              size="lg" 
              onClick={() => navigate('/markets')}
              className="h-12 px-8 rounded-full font-medium text-base"
            >
              Explore market
            </Button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-12 pt-12 border-t border-border mt-12">
            {stats.map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold font-display text-foreground">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
