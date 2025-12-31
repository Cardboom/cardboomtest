import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, TrendingUp, Package, Clock, 
  ArrowUpRight, ArrowDownRight, Wallet, ShoppingCart,
  BarChart3, Calendar
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid
} from 'recharts';

interface SellerEarningsDashboardProps {
  userId: string;
}

export const SellerEarningsDashboard = ({ userId }: SellerEarningsDashboardProps) => {
  const [period, setPeriod] = useState<'7d' | '30d' | 'month'>('30d');

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case '7d':
        return { start: subDays(now, 7), end: now };
      case '30d':
        return { start: subDays(now, 30), end: now };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return { start: subDays(now, 30), end: now };
    }
  };

  const dateRange = getDateRange();

  // Fetch seller orders
  const { data: orders } = useQuery({
    queryKey: ['seller-orders', userId, period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, listings(title, image_url)')
        .eq('seller_id', userId)
        .gte('created_at', dateRange.start.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch seller wallet
  const { data: wallet } = useQuery({
    queryKey: ['seller-wallet', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch active listings count
  const { data: activeListings } = useQuery({
    queryKey: ['seller-active-listings', userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', userId)
        .eq('status', 'active');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
  });

  // Calculate stats
  const completedOrders = orders?.filter(o => o.status === 'completed') || [];
  const pendingOrders = orders?.filter(o => ['paid', 'shipped'].includes(o.status)) || [];
  const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.price) - Number(o.seller_fee), 0);
  const totalFees = completedOrders.reduce((sum, o) => sum + Number(o.seller_fee), 0);
  const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

  // Generate chart data
  const chartData = (() => {
    const days = period === '7d' ? 7 : 30;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayOrders = orders?.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate.toDateString() === date.toDateString() && o.status === 'completed';
      }) || [];
      
      const revenue = dayOrders.reduce((sum, o) => sum + Number(o.price) - Number(o.seller_fee), 0);
      
      data.push({
        date: format(date, 'MMM dd'),
        revenue,
        orders: dayOrders.length,
      });
    }
    
    return data;
  })();

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Wallet className="w-5 h-5 text-primary" />
              <Badge variant="secondary">Balance</Badge>
            </div>
            <p className="text-2xl font-bold text-foreground">
              ${Number(wallet?.balance || 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Available to withdraw</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-gain" />
              <span className="text-xs text-muted-foreground">{period}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatPrice(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">Net Revenue</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <span className="text-xs text-muted-foreground">{period}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{completedOrders.length}</p>
            <p className="text-xs text-muted-foreground">Sales</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-5 h-5 text-amber-500" />
              <Badge variant="outline">{pendingOrders.length} pending</Badge>
            </div>
            <p className="text-2xl font-bold text-foreground">{activeListings}</p>
            <p className="text-xs text-muted-foreground">Active Listings</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Revenue Overview
            </CardTitle>
            <div className="flex gap-1">
              {(['7d', '30d', 'month'] as const).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPeriod(p)}
                >
                  {p === 'month' ? 'This Month' : p.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Avg. Order Value</p>
              <p className="font-semibold text-foreground">{formatPrice(avgOrderValue)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Fees</p>
              <p className="font-semibold text-loss">-{formatPrice(totalFees)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Fee Rate</p>
              <p className="font-semibold text-foreground">
                {totalRevenue > 0 ? ((totalFees / (totalRevenue + totalFees)) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Sales */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recent Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No sales in this period
            </p>
          ) : (
            <div className="space-y-3">
              {completedOrders.slice(0, 5).map((order) => (
                <div 
                  key={order.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                      {order.listings?.image_url ? (
                        <img 
                          src={order.listings.image_url} 
                          alt="" 
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {order.listings?.title || 'Unknown Item'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gain">
                      +${(Number(order.price) - Number(order.seller_fee)).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Fee: ${Number(order.seller_fee).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
