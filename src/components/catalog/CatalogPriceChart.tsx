import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { useCatalogPriceHistory } from '@/hooks/useCatalogCard';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Loader2 } from 'lucide-react';

interface CatalogPriceChartProps {
  catalogCardId: string;
  cardName: string;
}

type TimeRange = '7d' | '30d' | '90d' | '1y';

const getDaysFromRange = (range: TimeRange): number => {
  switch (range) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '1y': return 365;
    default: return 30;
  }
};

export const CatalogPriceChart = ({ catalogCardId, cardName }: CatalogPriceChartProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const { formatPrice } = useCurrency();
  
  const { data: priceHistory, isLoading } = useCatalogPriceHistory(
    catalogCardId, 
    getDaysFromRange(timeRange)
  );

  const chartData = useMemo(() => {
    if (!priceHistory) return [];
    return priceHistory.map(p => ({
      date: new Date(p.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: Number(p.median_usd) || 0,
      volume: p.liquidity_count,
    }));
  }, [priceHistory]);

  const stats = useMemo(() => {
    if (!chartData.length) return null;
    const startPrice = chartData[0]?.price || 0;
    const endPrice = chartData[chartData.length - 1]?.price || 0;
    const change = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;
    return { startPrice, endPrice, change };
  }, [chartData]);

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card className="glass">
        <CardContent className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
          <p>No price history available</p>
          <p className="text-sm mt-2">Check back once we have more market data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg">Price History</CardTitle>
          {stats && (
            <p className={`text-sm ${stats.change >= 0 ? 'text-gain' : 'text-loss'}`}>
              {stats.change >= 0 ? '+' : ''}{stats.change.toFixed(1)}% ({timeRange})
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {(['7d', '30d', '90d', '1y'] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="h-7 px-2 text-xs"
            >
              {range}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}K` : v.toFixed(0)}`}
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload?.[0]) {
                  const data = payload[0].payload;
                  return (
                    <div className="glass rounded-lg p-3 shadow-lg border">
                      <p className="text-sm text-muted-foreground">{data.date}</p>
                      <p className="text-lg font-bold">{formatPrice(data.price)}</p>
                      <p className="text-xs text-muted-foreground">{data.volume} sales</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
