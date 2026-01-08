import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  ShoppingCart,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  RefreshCw
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { format, subDays, startOfMonth, subMonths } from 'date-fns';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const RevenueDashboard = () => {
  const { formatPrice } = useCurrency();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case '7d': return subDays(now, 7);
      case '30d': return subDays(now, 30);
      case '90d': return subDays(now, 90);
      default: return new Date(2020, 0, 1);
    }
  };

  // Fetch orders for revenue calculation
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-revenue-orders', period],
    queryFn: async () => {
      const startDate = getDateRange();
      const { data, error } = await supabase
        .from('orders')
        .select('id, price, buyer_fee, seller_fee, status, created_at')
        .gte('created_at', startDate.toISOString())
        .in('status', ['completed', 'shipped', 'delivered']);

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch subscriptions
  const { data: subscriptionsData } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .neq('tier', 'free')
        .gte('expires_at', new Date().toISOString());

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch all top-ups (credit card deposits)
  const { data: topUpsData } = useQuery({
    queryKey: ['admin-topups', period],
    queryFn: async () => {
      const startDate = getDateRange();
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type, created_at, description')
        .eq('type', 'topup')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch wire transfers (confirmed)
  const { data: wireTransfersData } = useQuery({
    queryKey: ['admin-wire-transfers', period],
    queryFn: async () => {
      const startDate = getDateRange();
      const { data, error } = await supabase
        .from('wire_transfers')
        .select('amount, net_amount, status, created_at')
        .eq('status', 'confirmed')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch top sellers
  const { data: topSellers } = useQuery({
    queryKey: ['admin-top-sellers', period],
    queryFn: async () => {
      const startDate = getDateRange();
      const { data, error } = await supabase
        .from('orders')
        .select('seller_id, price, profiles!orders_seller_id_fkey(display_name, avatar_url)')
        .gte('created_at', startDate.toISOString())
        .in('status', ['completed', 'shipped', 'delivered']);

      if (error) throw error;

      // Aggregate by seller
      const sellerMap = new Map<string, { total: number; count: number; name: string }>();
      data?.forEach(order => {
        const current = sellerMap.get(order.seller_id) || { total: 0, count: 0, name: 'Unknown' };
        sellerMap.set(order.seller_id, {
          total: current.total + Number(order.price || 0),
          count: current.count + 1,
          name: (order.profiles as any)?.display_name || 'Unknown'
        });
      });

      return Array.from(sellerMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    }
  });

  // Calculate metrics
  const totalGMV = ordersData?.reduce((sum, o) => sum + Number(o.price || 0), 0) || 0;
  const totalBuyerFees = ordersData?.reduce((sum, o) => sum + Number(o.buyer_fee || 0), 0) || 0;
  const totalSellerFees = ordersData?.reduce((sum, o) => sum + Number(o.seller_fee || 0), 0) || 0;
  const totalPlatformFees = totalBuyerFees + totalSellerFees;
  const subscriptionRevenue = subscriptionsData?.reduce((sum, s) => sum + Number(s.price_monthly || 0), 0) || 0;
  
  // Credit card top-up profit (0.4% of all top-ups)
  const totalTopUps = topUpsData?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;
  const topUpProfit = totalTopUps * 0.004; // 0.4% profit margin
  
  // Wire transfer deposits
  const totalWireDeposits = wireTransfersData?.reduce((sum, t) => sum + Number(t.net_amount || t.amount || 0), 0) || 0;
  
  // Total platform revenue
  const totalRevenue = totalPlatformFees + subscriptionRevenue + topUpProfit;
  
  const takeRate = totalGMV > 0 ? (totalPlatformFees / totalGMV * 100) : 0;
  const avgOrderValue = ordersData?.length ? totalGMV / ordersData.length : 0;

  // Generate daily revenue chart data
  const revenueChartData = (() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const data: { date: string; revenue: number; fees: number; orders: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayOrders = ordersData?.filter(o => 
        format(new Date(o.created_at), 'yyyy-MM-dd') === date
      ) || [];
      
      data.push({
        date: format(subDays(new Date(), i), 'MMM dd'),
        revenue: dayOrders.reduce((sum, o) => sum + Number(o.price || 0), 0),
        fees: dayOrders.reduce((sum, o) => sum + Number(o.buyer_fee || 0) + Number(o.seller_fee || 0), 0),
        orders: dayOrders.length
      });
    }
    
    return data;
  })();

  // Category breakdown (mock - would need category data from orders)
  const categoryData = [
    { name: 'Pokémon', value: 35 },
    { name: 'Sports', value: 25 },
    { name: 'Yu-Gi-Oh', value: 15 },
    { name: 'MTG', value: 12 },
    { name: 'Other', value: 13 }
  ];

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Revenue Dashboard</h2>
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards - Row 1: Volume Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total GMV</p>
                <p className="text-2xl font-bold">{formatPrice(totalGMV)}</p>
                <p className="text-xs text-muted-foreground">{ordersData?.length || 0} orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <CreditCard className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Top-ups</p>
                <p className="text-2xl font-bold text-cyan-500">{formatPrice(totalTopUps)}</p>
                <p className="text-xs text-muted-foreground">{topUpsData?.length || 0} deposits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <TrendingUp className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wire Deposits</p>
                <p className="text-2xl font-bold text-violet-500">{formatPrice(totalWireDeposits)}</p>
                <p className="text-xs text-muted-foreground">{wireTransfersData?.length || 0} confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold text-amber-500">{formatPrice(avgOrderValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards - Row 2: PROFIT Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 ring-2 ring-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">💰 Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-500">{formatPrice(totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">All profit sources</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Percent className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Platform Fees</p>
                <p className="text-2xl font-bold text-emerald-500">{formatPrice(totalPlatformFees)}</p>
                <p className="text-xs text-muted-foreground">{takeRate.toFixed(1)}% take rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 border-pink-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/20">
                <CreditCard className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CC Top-up Profit</p>
                <p className="text-2xl font-bold text-pink-500">{formatPrice(topUpProfit)}</p>
                <p className="text-xs text-muted-foreground">0.4% of {formatPrice(totalTopUps)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Subscriptions</p>
                <p className="text-2xl font-bold text-blue-500">{formatPrice(subscriptionRevenue)}/mo</p>
                <p className="text-xs text-muted-foreground">{subscriptionsData?.length || 0} active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
            <CardDescription>GMV and platform fees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorFees" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142.1 76.2% 36.3%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(142.1 76.2% 36.3%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area type="monotone" dataKey="revenue" name="GMV" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="fees" name="Fees" stroke="hsl(142.1 76.2% 36.3%)" fillOpacity={1} fill="url(#colorFees)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Revenue by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Sellers Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Top Sellers</CardTitle>
          <CardDescription>Highest revenue generating sellers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topSellers?.map((seller, index) => (
              <div key={seller.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{seller.name}</p>
                    <p className="text-sm text-muted-foreground">{seller.count} orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{formatPrice(seller.total)}</p>
                </div>
              </div>
            ))}
            {(!topSellers || topSellers.length === 0) && (
              <p className="text-center text-muted-foreground py-4">No seller data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
