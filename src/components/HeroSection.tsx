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
    <section className="relative overflow-hidden min-h-[85vh] flex items-center">
      {/* Animated Cyan Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(188_85%_45%_/_0.3),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,hsl(188_85%_50%_/_0.15),transparent_50%)]" />
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black_70%,transparent_110%)] opacity-30" />
      
      <div className="container mx-auto px-4 py-16 lg:py-24 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-semibold backdrop-blur-sm">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_12px_hsl(188_85%_50%)]" />
              {t.hero.badge}
            </div>
            
            <h1 className="font-display text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
              The World's Leading
              <br />
              <span className="bg-gradient-to-r from-primary via-[hsl(188_85%_60%)] to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
                TCG Marketplace
              </span>
            </h1>
            
            <p className="text-muted-foreground text-lg md:text-xl max-w-lg leading-relaxed">
              {t.hero.description}
            </p>
            
            {/* CTA Form */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 px-5 bg-card/60 backdrop-blur-sm border-primary/20 rounded-xl text-base focus:border-primary focus:ring-primary/30"
              />
              <Button 
                size="lg" 
                onClick={handleGetStarted}
                className="h-14 px-8 rounded-xl font-bold text-base bg-primary hover:bg-primary/90 shadow-[0_0_24px_hsl(188_85%_50%_/_0.4)] hover:shadow-[0_0_32px_hsl(188_85%_50%_/_0.6)] transition-all"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-6 sm:gap-10 pt-6 border-t border-primary/10">
              {stats.map(stat => (
                <div key={stat.label} className="text-center sm:text-left group">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-foreground group-hover:text-primary transition-colors">
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
                  className="flex items-center gap-5 p-6 rounded-2xl bg-card/60 backdrop-blur-md border border-primary/20 hover:border-primary/50 hover:bg-card/80 hover:shadow-[0_8px_32px_hsl(188_85%_50%_/_0.15)] transition-all duration-300 animate-fade-in group"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/25 group-hover:shadow-[0_0_20px_hsl(188_85%_50%_/_0.3)] transition-all">
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
                  className="flex-1 h-12 rounded-xl font-semibold border-primary/30 hover:border-primary hover:bg-primary/10 transition-all"
                  onClick={() => navigate('/markets')}
                >
                  {t.hero.exploreMarket}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 rounded-xl font-semibold border-primary/30 hover:border-primary hover:bg-primary/10 transition-all"
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
