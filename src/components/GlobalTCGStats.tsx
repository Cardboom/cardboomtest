import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, Users, ShoppingCart, DollarSign, ArrowRight, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { HeroNewsTicker } from './HeroNewsTicker';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
interface GlobalStats {
  totalVolume: number;
  totalUsers: number;
  cardsSoldMonth: number;
  totalVolumeTraded: number;
}

interface GlobalTCGStatsProps {
  hideHero?: boolean;
}

// Animated counter component for NYSE-style number scrolling
// Only animates on initial load (from 0), then shows stable value
const AnimatedCounter = ({ 
  value, 
  prefix = '', 
  suffix = '',
  duration = 1500 
}: { 
  value: number; 
  prefix?: string; 
  suffix?: string;
  duration?: number;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimated = useRef(false);
  const animationRef = useRef<number>();

  useEffect(() => {
    // Only animate once on initial load
    if (hasAnimated.current) {
      // Skip animation, just set value directly
      setDisplayValue(value);
      return;
    }

    if (value === 0) return;

    const startValue = 0;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeOut;
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        hasAnimated.current = true;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  const formatDisplay = () => {
    // Always show full numbers with commas
    return `${prefix}${Math.round(displayValue).toLocaleString()}${suffix}`;
  };

  return <span className="tabular-nums">{formatDisplay()}</span>;
};

export function GlobalTCGStats({ hideHero = false }: GlobalTCGStatsProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const { data: stats, isLoading } = useQuery<GlobalStats>({
    queryKey: ['global-tcg-stats'],
    queryFn: async () => {
      // Get start of current month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [marketItemsResult, usersResult, ordersResult, monthOrdersResult] = await Promise.all([
        // Market value from market_items (public access) - more reliable for non-logged users
        supabase
          .from('market_items')
          .select('current_price')
          .gt('current_price', 0),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        // Total volume from completed orders only (to avoid counting pending escrow twice)
        supabase.from('orders').select('price').in('status', ['completed', 'delivered', 'shipped']),
        supabase.from('orders').select('id, price').gte('created_at', monthStart.toISOString()),
      ]);

      // Calculate total market value from market_items (catalog value)
      const totalMarketValue = marketItemsResult.data?.reduce((sum, item) => sum + (item.current_price || 0), 0) || 0;
      // Total volume from completed trades only
      const totalOrdersVolume = ordersResult.data?.reduce((sum, order) => sum + Number(order.price || 0), 0) || 0;
      const monthSalesCount = monthOrdersResult.data?.length || 0;
      const monthOrdersVolume = monthOrdersResult.data?.reduce((sum, order) => sum + Number(order.price || 0), 0) || 0;

      // If no actual order volume yet, show 15% of catalog value as estimated tracked volume
      const displayVolume = totalOrdersVolume > 0 ? totalOrdersVolume : Math.round(totalMarketValue * 0.15);

      return {
        totalVolume: totalMarketValue,
        totalUsers: usersResult.count || 0,
        cardsSoldMonth: monthSalesCount,
        totalVolumeTraded: displayVolume,
      };
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const statItems = [
    { 
      value: stats?.totalVolume || 0,
      prefix: '$',
      label: 'Market Value',
    },
    { 
      value: stats?.totalUsers || 0,
      prefix: '',
      label: 'Active Traders',
    },
    { 
      value: stats?.cardsSoldMonth || 0,
      prefix: '',
      label: 'Cards Sold This Month',
    },
    { 
      value: stats?.totalVolumeTraded || 0,
      prefix: '$',
      label: 'Total Volume',
    },
  ];

  return (
    <section className={cn(
      "relative overflow-hidden",
      hideHero ? "pt-0 pb-6" : "min-h-[85vh] flex flex-col justify-center py-8 sm:py-12 md:py-20"
    )}>
      {/* Video Background - only for non-logged-in hero (logged-in users get video from Index.tsx) */}
      {!hideHero && (
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/videos/hero-video.mp4" type="video/mp4" />
          </video>
          {/* Overlay gradients - smooth blending */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background" />
        </div>
      )}
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Hero headline + Stats combined - only show if not hidden */}
        {!hideHero && (
          <div className="text-left max-w-xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 bg-primary/10 border border-primary/20 rounded-full"
            >
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Live Market</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 leading-[1.05]"
            >
              <span className="text-primary">Grade</span> Your Portfolio.
              <span className="block mt-1">Track Your Portfolio.</span>
              <span className="block mt-1">Trade It.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-base md:text-lg text-muted-foreground max-w-md mb-8 leading-relaxed"
            >
              The marketplace for TCG collectors. AI-powered grading, real-time pricing, and a community that knows cards.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')}
                className="h-12 px-8 rounded-md font-bold text-sm shadow-lg shadow-primary/25 cursor-pointer relative z-20 group"
              >
                Start Trading
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline"
                size="lg" 
                onClick={() => navigate('/markets')}
                className="h-12 px-8 rounded-md font-semibold text-sm cursor-pointer relative z-20"
              >
                Explore Market
              </Button>
            </motion.div>
            
            {/* News Ticker */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-10"
            >
              <HeroNewsTicker />
            </motion.div>
          </div>
        )}

        {/* Stats Grid - NYSE Terminal Style - Single Row with Dividers */}
        <div 
          className={cn(
            "relative overflow-hidden rounded-[18px] mt-3",
            "bg-[#f5f5f7] dark:bg-gradient-to-br dark:from-[#0a0f1a] dark:via-[#0d1321] dark:to-[#101820]",
            "border border-black/[0.04] dark:border-white/5",
            "shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_40px_rgba(0,0,0,0.3)]"
          )}
          style={{ backdropFilter: 'blur(22px)' }}
        >
          {/* Noise texture */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Accent line - Tiffany brand color */}
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary via-primary/50 to-transparent dark:block hidden" />
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/30 via-primary/20 to-transparent dark:hidden" />

          {/* Header - Tiffany branding */}
          <div className="absolute top-2 left-3 flex items-center gap-1.5 z-10">
            <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
              <BarChart3 className="w-2.5 h-2.5 text-primary" />
            </div>
            <span className="font-sans text-[10px] md:text-[11px] text-primary uppercase tracking-widest font-bold">
              CARDBOOM MARKET STATS
            </span>
          </div>

          {/* Top glow - only in dark mode */}
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/[0.02] pointer-events-none dark:block hidden" />

          {/* Stats Row */}
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 pt-8">
            {statItems.map((item, i) => (
              <div
                key={item.label}
                className={cn(
                  "flex flex-col items-center justify-center text-center py-4 px-3 md:py-5 md:px-4",
                  // Vertical dividers between columns
                  i < statItems.length - 1 && "md:border-r md:border-black/[0.06] dark:md:border-white/10",
                  // On mobile: right border for left column, bottom border for top row
                  i % 2 === 0 && "border-r border-black/[0.06] dark:border-white/10 md:border-r-0",
                  i < 2 && "border-b border-black/[0.06] dark:border-white/10 md:border-b-0",
                  // Re-add md border-r
                  i < 3 && "md:border-r md:border-black/[0.06] dark:md:border-white/10"
                )}
              >
                <div className="font-mono text-lg sm:text-xl md:text-2xl font-bold text-foreground tracking-tight">
                  {isLoading ? (
                    <span className="inline-block w-20 h-6 bg-muted rounded animate-pulse" />
                  ) : (
                    <AnimatedCounter value={item.value} prefix={item.prefix} />
                  )}
                </div>
                <div className="font-mono text-[8px] sm:text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}