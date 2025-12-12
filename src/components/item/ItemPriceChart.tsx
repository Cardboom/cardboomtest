import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface ItemPriceChartProps {
  itemId: string;
}

// Mock chart data
const generateMockData = (days: number) => {
  const data = [];
  const basePrice = 420000;
  let currentPrice = basePrice * 0.8;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    currentPrice = currentPrice * (1 + (Math.random() - 0.45) * 0.05);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: Math.round(currentPrice),
    });
  }
  return data;
};

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

export const ItemPriceChart = ({ itemId }: ItemPriceChartProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const getDaysFromRange = (range: TimeRange) => {
    switch (range) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      case 'all': return 730;
    }
  };

  const data = generateMockData(getDaysFromRange(timeRange));
  const currentPrice = data[data.length - 1]?.price || 0;
  const startPrice = data[0]?.price || 0;
  const priceChange = ((currentPrice - startPrice) / startPrice) * 100;

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
          <p className={cn(
            "text-sm font-medium",
            priceChange >= 0 ? "text-gain" : "text-loss"
          )}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(1)}% in {timeRange}
          </p>
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
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160 84% 45%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(160 84% 45%)" stopOpacity={0} />
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
              stroke="hsl(160 84% 45%)"
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
