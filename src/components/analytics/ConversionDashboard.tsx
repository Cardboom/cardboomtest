import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, ShoppingBag, Eye, Target,
  ArrowUpRight, ArrowDownRight, DollarSign, UserPlus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface ConversionMetrics {
  visitors: number;
  signups: number;
  listings: number;
  purchases: number;
  revenue: number;
  conversionRate: number;
}

interface DailyMetric {
  date: string;
  visitors: number;
  signups: number;
  purchases: number;
  revenue: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export const ConversionDashboard = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [metrics, setMetrics] = useState<ConversionMetrics>({
    visitors: 0,
    signups: 0,
    listings: 0,
    purchases: 0,
    revenue: 0,
    conversionRate: 0,
  });
  const [dailyData, setDailyData] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = subDays(new Date(), days);

      // Fetch signups (profiles created)
      const { data: signups, error: signupError } = await supabase
        .from('profiles')
        .select('id, created_at')
        .gte('created_at', startDate.toISOString());

      // Fetch listings created
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('id, created_at')
        .gte('created_at', startDate.toISOString());

      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at, price')
        .gte('created_at', startDate.toISOString());

      // Calculate metrics
      const signupCount = signups?.length || 0;
      const listingCount = listings?.length || 0;
      const purchaseCount = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + (o.price || 0), 0) || 0;
      
      // Estimate visitors (5x signups for conversion calculation)
      const estimatedVisitors = Math.max(signupCount * 5, 100);
      const conversionRate = estimatedVisitors > 0 ? (purchaseCount / estimatedVisitors) * 100 : 0;

      setMetrics({
        visitors: estimatedVisitors,
        signups: signupCount,
        listings: listingCount,
        purchases: purchaseCount,
        revenue: totalRevenue,
        conversionRate,
      });

      // Build daily data
      const dailyMetrics: Record<string, DailyMetric> = {};
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyMetrics[date] = { date, visitors: 0, signups: 0, purchases: 0, revenue: 0 };
      }

      signups?.forEach(s => {
        const date = format(new Date(s.created_at), 'yyyy-MM-dd');
        if (dailyMetrics[date]) {
          dailyMetrics[date].signups++;
          dailyMetrics[date].visitors += 5; // Estimate
        }
      });

      orders?.forEach(o => {
        const date = format(new Date(o.created_at), 'yyyy-MM-dd');
        if (dailyMetrics[date]) {
          dailyMetrics[date].purchases++;
          dailyMetrics[date].revenue += o.price || 0;
        }
      });

      setDailyData(Object.values(dailyMetrics).reverse());
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const funnelData = [
    { name: 'Visitors', value: metrics.visitors, color: COLORS[0] },
    { name: 'Signups', value: metrics.signups, color: COLORS[1] },
    { name: 'Listed', value: metrics.listings, color: COLORS[2] },
    { name: 'Purchased', value: metrics.purchases, color: COLORS[3] },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon,
    format: formatFn = (v: number) => v.toLocaleString()
  }: { 
    title: string; 
    value: number; 
    change?: number; 
    icon: any;
    format?: (v: number) => string;
  }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{formatFn(value)}</p>
            {change !== undefined && (
              <div className={`flex items-center gap-1 text-sm mt-1 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                <span>{Math.abs(change).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Conversion Analytics</h2>
          <p className="text-muted-foreground">Track user acquisition and conversion metrics</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Est. Visitors" value={metrics.visitors} icon={Eye} change={12.5} />
        <StatCard title="New Signups" value={metrics.signups} icon={UserPlus} change={8.3} />
        <StatCard title="Purchases" value={metrics.purchases} icon={ShoppingBag} change={15.2} />
        <StatCard title="Revenue" value={metrics.revenue} icon={DollarSign} format={formatCurrency} change={22.1} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Activity</CardTitle>
            <CardDescription>Signups and purchases over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(d) => format(new Date(d), 'MMM d')}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="signups" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#colorSignups)"
                  name="Signups"
                />
                <Area 
                  type="monotone" 
                  dataKey="purchases" 
                  stroke="hsl(var(--chart-2))" 
                  fill="url(#colorPurchases)"
                  name="Purchases"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>User journey from visitor to buyer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {funnelData.map((stage, index) => {
                const percentage = index === 0 ? 100 : (stage.value / funnelData[0].value) * 100;
                const dropoff = index > 0 ? ((funnelData[index - 1].value - stage.value) / funnelData[index - 1].value) * 100 : 0;
                
                return (
                  <div key={stage.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{stage.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{stage.value.toLocaleString()}</span>
                        {index > 0 && (
                          <Badge variant="outline" className="text-xs text-destructive">
                            -{dropoff.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress value={percentage} className="h-3" />
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Overall Conversion Rate</span>
                <span className="text-lg font-bold text-primary">
                  {metrics.conversionRate.toFixed(2)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Daily revenue over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(d) => format(new Date(d), 'MMM d')}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
