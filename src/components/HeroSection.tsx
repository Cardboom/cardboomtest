import { Button } from '@/components/ui/button';
import { marketStats } from '@/data/mockData';
import { ArrowRight, TrendingUp, Users, Layers, DollarSign } from 'lucide-react';

export const HeroSection = () => {
  const stats = [
    { label: 'Total Volume', value: `$${(marketStats.totalVolume / 1e9).toFixed(2)}B`, icon: DollarSign },
    { label: '24h Volume', value: `$${(marketStats.dailyVolume / 1e6).toFixed(1)}M`, icon: TrendingUp },
    { label: 'Active Listings', value: `${(marketStats.activeListings / 1e6).toFixed(2)}M`, icon: Layers },
    { label: 'Traders', value: `${(marketStats.activeTraders / 1e3).toFixed(0)}K`, icon: Users },
  ];

  return (
    <section className="relative py-20 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium mb-6 animate-fade-in">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Live Trading Active
          </div>
          
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
            The Premier<br />
            <span className="text-gradient-primary">Collectibles</span> Exchange
          </h1>
          
          <p className="text-muted-foreground text-lg md:text-xl mb-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '200ms' }}>
            Trade NBA cards, football cards, TCG, and rare figures with real-time pricing, 
            secure transactions, and instant settlements.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <Button variant="hero" size="xl">
              Start Trading
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="glass" size="xl">
              Explore Market
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
