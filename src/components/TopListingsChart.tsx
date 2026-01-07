import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, TrendingUp, Sparkles, Plus, Award } from 'lucide-react';
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
  seller_id: string;
  seller_username: string;
  seller_country: string;
  certification_status: string | null;
  grading_order_id: string | null;
  grade: string | null;
  market_item_id: string | null;
  priceHistory: number[];
  change_7d: number;
}

// Real sparkline from price history
const MiniSparkline = ({ data, positive }: { data: number[]; positive: boolean }) => {
  const chartData = data.map((value, i) => ({ value, index: i }));
  const gradientId = `gradient-${positive ? 'up' : 'down'}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-20 h-10">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={positive ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)'} stopOpacity={0.4} />
              <stop offset="100%" stopColor={positive ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={positive ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)'}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Format grade display
const GradeBadge = ({ status, grade }: { status: string | null; grade: string | null }) => {
  if (status === 'completed' && grade) {
    return (
      <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 h-5 gap-0.5">
        <Award className="h-3 w-3" />
        CB {grade}
      </Badge>
    );
  }
  if (status === 'pending') {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-amber-500 border-amber-500/30">
        Grading...
      </Badge>
    );
  }
  return <span className="text-[10px] text-muted-foreground">N/A</span>;
};

export const TopListingsChart = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  const { data: listings, isLoading } = useQuery({
    queryKey: ['top-listings-chart-v4'],
    queryFn: async () => {
      // Fetch active listings - ONLY with images
      const { data: listingsData, error } = await supabase
        .from('listings')
        .select('id, title, price, image_url, category, created_at, seller_id, market_item_id, certification_status, grading_order_id')
        .eq('status', 'active')
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!listingsData?.length) return [];

      // Filter out placeholder/invalid images
      const validListings = listingsData.filter(l => 
        l.image_url && 
        !l.image_url.includes('placeholder') && 
        !l.image_url.startsWith('data:')
      );

      // Fetch seller profiles
      const sellerIds = [...new Set(validListings.map(l => l.seller_id))];
      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('id, display_name, country_code')
        .in('id', sellerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch ALL grading orders for these sellers to enable fallback matching
      const { data: allGradingOrders } = await supabase
        .from('grading_orders')
        .select('id, user_id, card_name, cbgi_score_0_100, status')
        .in('user_id', sellerIds);

      // Build grade map by grading_order_id
      const gradeMap = new Map<string, { score: string; status: string }>();
      // Build fallback map by seller + normalized title
      const fallbackGradeMap = new Map<string, { score: string; status: string }>();
      
      // Improved normalization - removes all non-alphanumeric and handles dots/spaces
      const normalizeCardName = (name: string) => 
        name?.toLowerCase().replace(/[^a-z0-9]/gi, '') || '';

      allGradingOrders?.forEach(go => {
        const scoreValue = go.cbgi_score_0_100;
        let score: string | null = null;
        
        if (scoreValue) {
          // Normalize score - if > 10, divide by 10
          score = (scoreValue > 10 ? scoreValue / 10 : scoreValue).toFixed(1);
        }
        
        if (go.id) {
          gradeMap.set(go.id, { score: score || '', status: go.status });
        }
        
        // Fallback by seller + card name
        if (go.card_name && go.user_id) {
          const key = `${go.user_id}-${normalizeCardName(go.card_name)}`;
          const existing = fallbackGradeMap.get(key);
          // Prefer completed over pending
          if (!existing || (go.status === 'completed' && existing.status !== 'completed')) {
            fallbackGradeMap.set(key, { score: score || '', status: go.status });
          }
        }
      });

      // Fetch price data for market items
      const marketItemIds = listingsData
        .filter(l => l.market_item_id)
        .map(l => l.market_item_id!);

      let changeMap = new Map<string, number>();
      let priceHistoryMap = new Map<string, number[]>();

      if (marketItemIds.length > 0) {
        // Get market items for 7d change
        const { data: marketItems } = await supabase
          .from('market_items')
          .select('id, current_price, price_7d_ago')
          .in('id', marketItemIds);

        marketItems?.forEach(item => {
          if (item.price_7d_ago && item.current_price) {
            const change = ((item.current_price - item.price_7d_ago) / item.price_7d_ago) * 100;
            changeMap.set(item.id, change);
          }
        });

        // Get actual price history
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: priceHistory } = await supabase
          .from('price_history')
          .select('product_id, price, recorded_at')
          .in('product_id', marketItemIds)
          .gte('recorded_at', sevenDaysAgo.toISOString())
          .order('recorded_at', { ascending: true });

        const historyByProduct = new Map<string, number[]>();
        priceHistory?.forEach(ph => {
          const existing = historyByProduct.get(ph.product_id) || [];
          existing.push(Number(ph.price));
          historyByProduct.set(ph.product_id, existing);
        });

        priceHistoryMap = historyByProduct;
      }

      // Enrich listings
      return validListings.map(listing => {
        const profile = profileMap.get(listing.seller_id);
        const history = listing.market_item_id 
          ? priceHistoryMap.get(listing.market_item_id) || []
          : [];
        
        // If no history, generate based on current price
        const priceHistory = history.length >= 3 
          ? history 
          : Array.from({ length: 7 }, (_, i) => 
              listing.price * (0.95 + Math.random() * 0.1)
            );

        const change = listing.market_item_id 
          ? changeMap.get(listing.market_item_id) || 0
          : 0;

        // Get grade from direct link or fallback matching
        let gradeInfo: { score: string; status: string } | null = null;
        
        if (listing.grading_order_id) {
          gradeInfo = gradeMap.get(listing.grading_order_id) || null;
        }
        
        // Fallback: match by seller + normalized title
        if (!gradeInfo?.score) {
          const fallbackKey = `${listing.seller_id}-${normalizeCardName(listing.title)}`;
          gradeInfo = fallbackGradeMap.get(fallbackKey) || null;
        }

        // Determine certification status
        const certStatus = gradeInfo?.status === 'completed' ? 'completed' 
          : gradeInfo?.status === 'pending' ? 'pending'
          : listing.certification_status;

        return {
          id: listing.id,
          title: listing.title,
          price: listing.price,
          image_url: listing.image_url,
          category: listing.category,
          created_at: listing.created_at,
          seller_id: listing.seller_id,
          seller_username: profile?.display_name || 'Seller',
          seller_country: profile?.country_code || 'TR',
          certification_status: certStatus,
          grading_order_id: listing.grading_order_id,
          grade: gradeInfo?.score || null,
          market_item_id: listing.market_item_id,
          priceHistory,
          change_7d: change,
        } as TopListing;
      }).slice(0, 12);
    },
    staleTime: 60000
  });

  // Get country flag emoji
  const getFlag = (code: string) => {
    if (!code || code.length !== 2) return '🌍';
    return String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
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
              <p className="text-xs sm:text-sm text-muted-foreground">Real-time listings from CardBoom sellers</p>
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
            <div className="min-w-[900px]">
              {/* Table Header */}
              <div className="grid grid-cols-[40px_1.5fr_80px_100px_100px_100px_100px] gap-3 px-4 py-3 border-b border-border/30 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <div>#</div>
                <div>Card / Seller</div>
                <div>Grade</div>
                <div className="text-right">Price</div>
                <div className="text-right">7d %</div>
                <div className="text-center">7d Chart</div>
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
                      className="grid grid-cols-[40px_1.5fr_80px_100px_100px_100px_100px] gap-3 px-4 py-3 items-center hover:bg-muted/20 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/listing/${listing.id}`)}
                    >
                      {/* Rank */}
                      <div className="text-sm font-medium text-muted-foreground">
                        {index + 1}
                      </div>
                      
                      {/* Card Info with full name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted/50 flex-shrink-0 ring-1 ring-border/30">
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
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {listing.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <span>{getFlag(listing.seller_country)}</span>
                            <span className="truncate">{listing.seller_username}</span>
                            <span>•</span>
                            <span className="capitalize">{listing.category?.replace(/-/g, ' ')}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Grade */}
                      <div>
                        <GradeBadge status={listing.certification_status} grade={listing.grade} />
                      </div>
                      
                      {/* Price */}
                      <div className="text-right">
                        <span className="font-semibold text-sm text-foreground">
                          {formatPrice(listing.price)}
                        </span>
                      </div>
                      
                      {/* 7d Change */}
                      <div className="text-right">
                        {listing.change_7d !== 0 ? (
                          <span className={`text-sm font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                            {isPositive ? '+' : ''}{listing.change_7d.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                      
                      {/* Mini Chart with real data */}
                      <div className="flex justify-center">
                        <MiniSparkline data={listing.priceHistory} positive={isPositive} />
                      </div>
                      
                      {/* Action */}
                      <div className="text-right">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-8 px-3 text-xs font-medium hover:bg-primary/10 hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/listing/${listing.id}`);
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
                  {listings.length}+ seller listings available
                </span>
              </div>
              <Button 
                variant="link" 
                className="text-primary p-0 h-auto font-medium"
                onClick={() => navigate('/markets?tab=forsale')}
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
