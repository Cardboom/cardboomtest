import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { generatePriceHistory } from '@/data/mockData';
import { TrendingUp } from 'lucide-react';

interface PriceChartProps {
  title?: string;
}

export const PriceChart = ({ title = 'Market Index' }: PriceChartProps) => {
  const data = useMemo(() => generatePriceHistory(), []);
  const startPrice = data[0]?.price || 0;
  const endPrice = data[data.length - 1]?.price || 0;
  const change = ((endPrice - startPrice) / startPrice) * 100;
  const isPositive = change >= 0;

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">30 Day Performance</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold font-display text-foreground">
            ${endPrice.toFixed(2)}
          </div>
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-gain' : 'text-loss'}`}>
            <TrendingUp className={`w-4 h-4 ${!isPositive && 'rotate-180'}`} />
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 10 }}
              tickFormatter={(value) => value.slice(5)}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 10 }}
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(220, 18%, 8%)',
                border: '1px solid hsl(220, 15%, 18%)',
                borderRadius: '8px',
                color: 'hsl(0, 0%, 98%)',
              }}
              labelStyle={{ color: 'hsl(220, 10%, 55%)' }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(142, 76%, 45%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPrice)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
