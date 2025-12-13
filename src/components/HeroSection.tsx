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
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 dark:from-primary/10 dark:to-accent/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4 py-16 lg:py-24 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              {t.hero.badge}
            </div>
            
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              The World's Leading
              <br />
              <span className="text-gradient-primary">TCG Marketplace</span>
            </h1>
            
            <p className="text-muted-foreground text-lg md:text-xl max-w-lg leading-relaxed">
              {t.hero.description}
            </p>
            
            {/* CTA Form - Binance style */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 px-5 bg-secondary/50 border-border/50 rounded-xl text-base"
              />
              <Button 
                size="lg" 
                onClick={handleGetStarted}
                className="h-14 px-8 rounded-xl font-bold text-base shadow-glow hover:shadow-lg transition-all"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Stats Row - Compact */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-4 sm:gap-8 pt-4">
              {stats.map(stat => (
                <div key={stat.label} className="text-center sm:text-left">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold font-display text-foreground">
                    {stat.value}
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Feature Cards */}
          <div className="hidden lg:block">
            <div className="grid gap-4">
              {features.map((feature, index) => (
                <div 
                  key={feature.title}
                  className="flex items-center gap-5 p-6 rounded-2xl bg-card/80 border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}
              
              {/* Quick Action Buttons */}
              <div className="flex gap-3 mt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 rounded-xl font-semibold"
                  onClick={() => navigate('/markets')}
                >
                  {t.hero.exploreMarket}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 rounded-xl font-semibold"
                  onClick={() => navigate('/sell')}
                >
                  Start Selling
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
