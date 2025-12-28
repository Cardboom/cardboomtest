import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { Loader2 } from 'lucide-react';

interface ItemPriceChartProps {
  itemId: string;
  productId?: string;
  itemName?: string;
  category?: string;
  currentPrice?: number;
  marketItemId?: string;
}

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

const getDaysFromRange = (range: TimeRange) => {
  switch (range) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '1y': return 365;
    case 'all': return 730;
  }
};

export const ItemPriceChart = ({ itemId, productId, itemName, category, currentPrice, marketItemId }: ItemPriceChartProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const { data: historyData, isLoading, hasData } = usePriceHistory({
    productId: productId || itemId,
    itemName,
    category,
    days: getDaysFromRange(timeRange),
    marketItemId: marketItemId || itemId,
  });

  // Calculate stats from real data
  const chartData = useMemo(() => {
    if (!hasData) return [];
    return historyData;
  }, [historyData, hasData]);

  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { currentPrice: currentPrice || 0, startPrice: currentPrice || 0, priceChange: 0 };
    }
    const latestPrice = chartData[chartData.length - 1]?.price || currentPrice || 0;
    const firstPrice = chartData[0]?.price || latestPrice;
    const change = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;
    return { currentPrice: latestPrice, startPrice: firstPrice, priceChange: change };
  }, [chartData, currentPrice]);

  const formatPrice = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass rounded-lg p-3 border border-border/50">
          <p className="text-muted-foreground text-xs mb-1">{label}</p>
          <p className="text-foreground font-semibold">
            {formatPrice(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-display text-xl font-semibold text-foreground">Price History</h3>
          {hasData ? (
            <p className={cn(
              "text-sm font-medium",
              stats.priceChange >= 0 ? "text-gain" : "text-loss"
            )}>
              {stats.priceChange >= 0 ? '+' : ''}{stats.priceChange.toFixed(1)}% in {timeRange}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No historical data yet</p>
          )}
        </div>
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg">
          {(['7d', '30d', '90d', '1y', 'all'] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={cn(
                "text-xs h-8",
                timeRange === range && "bg-primary text-primary-foreground"
              )}
            >
              {range.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      <div className="h-80">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-lg font-medium">No price history available</p>
            <p className="text-sm">Price data will be recorded as trading activity occurs</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(188 85% 40%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(188 85% 40%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(220 10% 55%)', fontSize: 11 }}
                tickMargin={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(220 10% 55%)', fontSize: 11 }}
                tickFormatter={formatPrice}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke="hsl(188 85% 40%)"
                strokeWidth={2}
                fill="url(#priceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
