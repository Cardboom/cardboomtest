import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Shield, ShoppingBag, TrendingUp, ChevronRight, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface Merchant {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  trust_rating: number;
  trust_review_count: number;
  account_type: string;
  total_sales: number;
  total_revenue: number;
  is_id_verified: boolean;
}

export function TrustedMerchants() {
  const { data: merchants, isLoading } = useQuery({
    queryKey: ['trusted-merchants'],
    queryFn: async () => {
      // Fetch profiles from public view (excludes PII)
      const { data: profiles, error } = await supabase
        .from('public_profiles')
        .select('id, display_name, avatar_url, trust_rating, trust_review_count, account_type, is_id_verified')
        .eq('is_fan_account', false)
        .order('trust_rating', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get sales counts for each profile
      const profileIds = profiles?.map(p => p.id) || [];
      if (profileIds.length === 0) return [];

      const { data: salesData } = await supabase
        .from('orders')
        .select('seller_id, price')
        .in('seller_id', profileIds)
        .eq('status', 'completed');

      // Calculate sales stats per profile
      const salesMap = new Map<string, { count: number; revenue: number }>();
      salesData?.forEach(order => {
        const existing = salesMap.get(order.seller_id) || { count: 0, revenue: 0 };
        salesMap.set(order.seller_id, {
          count: existing.count + 1,
          revenue: existing.revenue + (order.price || 0),
        });
      });

      // Combine and sort by trust rating, then by sales
      const merchants: Merchant[] = profiles?.map(p => ({
        ...p,
        total_sales: salesMap.get(p.id)?.count || 0,
        total_revenue: salesMap.get(p.id)?.revenue || 0,
      })) || [];

      // Sort: verified first, then by rating, then by sales
      return merchants.sort((a, b) => {
        if (a.is_id_verified !== b.is_id_verified) return a.is_id_verified ? -1 : 1;
        if (a.trust_rating !== b.trust_rating) return b.trust_rating - a.trust_rating;
        return b.total_sales - a.total_sales;
      }).slice(0, 8);
    },
  });

  const getTrustBadge = (rating: number, reviewCount: number) => {
    if (reviewCount === 0) return { label: 'New Seller', color: 'bg-muted text-muted-foreground' };
    if (rating >= 4.5) return { label: 'Highly Trusted', color: 'bg-green-500/20 text-green-400' };
    if (rating >= 4) return { label: 'Trusted', color: 'bg-primary/20 text-primary' };
    if (rating >= 3) return { label: 'Good', color: 'bg-yellow-500/20 text-yellow-400' };
    return { label: 'Building Trust', color: 'bg-orange-500/20 text-orange-400' };
  };

  const formatRevenue = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            Trusted Merchants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-primary" />
          Trusted Merchants
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/explorer?tab=sellers" className="gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {!merchants || merchants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No merchants yet</p>
            <p className="text-sm">Be the first to start selling!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {merchants.map((merchant) => {
              const trustBadge = getTrustBadge(merchant.trust_rating, merchant.trust_review_count);
              
              return (
                <Link
                  key={merchant.id}
                  to={`/u/${merchant.display_name || merchant.id}`}
                  className="block group"
                >
                  <div className="p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-card/80 transition-all">
                    <div className="flex flex-col items-center text-center">
                      <div className="relative mb-3">
                        <Avatar className="w-14 h-14 border-2 border-background">
                          <AvatarImage src={merchant.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary font-bold">
                            {(merchant.display_name || 'U')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {merchant.is_id_verified && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Shield className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>

                      <p className="font-semibold text-sm truncate w-full">
                        {merchant.display_name || 'Seller'}
                      </p>

                      {/* Trust Rating */}
                      {merchant.trust_review_count > 0 ? (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 fill-gold text-gold" />
                          <span className="text-xs font-medium">{merchant.trust_rating.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({merchant.trust_review_count})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground mt-1">No reviews yet</span>
                      )}

                      {/* Sales Stats */}
                      {merchant.total_sales > 0 ? (
                        <div className="flex items-center gap-1 mt-2">
                          <TrendingUp className="w-3 h-3 text-gain" />
                          <span className="text-xs text-muted-foreground">
                            {merchant.total_sales} sale{merchant.total_sales !== 1 ? 's' : ''}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="mt-2 text-[10px] px-2">
                          No Sales Yet
                        </Badge>
                      )}

                      <Badge className={cn("mt-2 text-[10px]", trustBadge.color)}>
                        {trustBadge.label}
                      </Badge>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}