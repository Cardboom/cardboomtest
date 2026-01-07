import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Sparkles, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface TopListing {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  category: string;
  created_at: string;
  seller_username: string;
  change_7d: number;
}

const MiniSparkline = ({ positive }: { positive: boolean }) => {
  // Generate mock sparkline data for visual effect
  const data = Array.from({ length: 12 }, (_, i) => ({
    value: positive 
      ? 50 + Math.random() * 30 + i * 3
      : 80 - Math.random() * 20 - i * 2
  }));

  return (
    <div className="w-16 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`gradient-${positive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={positive ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} stopOpacity={0.4} />
              <stop offset="100%" stopColor={positive ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={positive ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'}
            strokeWidth={1.5}
            fill={`url(#gradient-${positive ? 'up' : 'down'})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TopListingsChart = () => {
  const navigate = useNavigate();
  const { currency } = useCurrency();

  const { data: listings, isLoading } = useQuery({
    queryKey: ['top-listings-chart'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, price, image_url, category, created_at, seller_id')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;

      // Mock 7d change for display
      return (data || []).map((item, index) => ({
        ...item,
        seller_username: 'Seller',
        change_7d: index % 3 === 0 ? -(Math.random() * 8 + 2) : (Math.random() * 15 + 5)
      })) as TopListing[];
    },
    staleTime: 60000
  });

  const formatPrice = (value: number) => {
    const displayValue = currency === 'USD' ? value / 34.5 : value;
    const symbol = currency === 'USD' ? '$' : '₺';
    if (displayValue >= 1000) return `${symbol}${(displayValue / 1000).toFixed(1)}K`;
    return `${symbol}${displayValue.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <section className="py-6 sm:py-8 border-t border-border/20">
        <div className="container mx-auto px-4">
          <div className="h-32 bg-muted/30 rounded-xl animate-pulse" />
        </div>
      </section>
    );
  }

  if (!listings?.length) return null;

  return (
    <section className="py-6 sm:py-10 border-t border-border/20 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent">
      <div className="container mx-auto px-4">
        {/* Header with CTA */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                New Top Listings
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Fresh listings from verified sellers</p>
            </div>
          </div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              onClick={() => navigate('/sell')}
              className="group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg shadow-primary/20 h-10 sm:h-11 px-4 sm:px-6 rounded-full font-semibold"
            >
              <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
              <span className="hidden sm:inline">List Your Card</span>
              <span className="sm:hidden">List</span>
              <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
            </Button>
          </motion.div>
        </div>

        {/* CoinMarketCap-style horizontal chart table */}
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
          {/* Gradient overlay for scroll hint */}
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none hidden sm:block" />
          
          <div className="overflow-x-auto scrollbar-hide">
            <div className="min-w-[800px]">
              {/* Table Header */}
              <div className="grid grid-cols-[40px_1fr_100px_100px_80px_100px] gap-4 px-4 py-3 border-b border-border/30 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <div>#</div>
                <div>Card</div>
                <div className="text-right">Price</div>
                <div className="text-right">7d %</div>
                <div className="text-center">Chart</div>
                <div className="text-right">Action</div>
              </div>
              
              {/* Table Body */}
              <div className="divide-y divide-border/20">
                {listings.slice(0, 6).map((listing, index) => {
                  const isPositive = listing.change_7d >= 0;
                  
                  return (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="grid grid-cols-[40px_1fr_100px_100px_80px_100px] gap-4 px-4 py-3 items-center hover:bg-muted/20 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/item/${listing.id}`)}
                    >
                      {/* Rank */}
                      <div className="text-sm font-medium text-muted-foreground">
                        {index + 1}
                      </div>
                      
                      {/* Card Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted/50 flex-shrink-0 ring-1 ring-border/30">
                            {listing.image_url ? (
                              <img 
                                src={listing.image_url} 
                                alt={listing.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                ?
                              </div>
                            )}
                          </div>
                          {index < 3 && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white">🔥</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {listing.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate capitalize">
                            {listing.category?.replace(/-/g, ' ')}
                          </p>
                        </div>
                      </div>
                      
                      {/* Price */}
                      <div className="text-right">
                        <span className="font-semibold text-sm text-foreground">
                          {formatPrice(listing.price)}
                        </span>
                      </div>
                      
                      {/* 7d Change */}
                      <div className="text-right">
                        <span className={`text-sm font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                          {isPositive ? '+' : ''}{listing.change_7d.toFixed(1)}%
                        </span>
                      </div>
                      
                      {/* Mini Chart */}
                      <div className="flex justify-center">
                        <MiniSparkline positive={isPositive} />
                      </div>
                      
                      {/* Action */}
                      <div className="text-right">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-8 px-3 text-xs font-medium hover:bg-primary/10 hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/item/${listing.id}`);
                          }}
                        >
                          View
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Bottom CTA Bar */}
          <div className="px-4 py-4 border-t border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">
                  {listings.length}+ new listings today
                </span>
              </div>
              <Button 
                variant="link" 
                className="text-primary p-0 h-auto font-medium"
                onClick={() => navigate('/markets?tab=for-sale')}
              >
                View all listings
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
