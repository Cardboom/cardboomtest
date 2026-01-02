import { useMemo } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Loader2, AlertCircle } from 'lucide-react';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { useCurrency } from '@/contexts/CurrencyContext';

interface ItemPriceChartProps {
  itemId: string;
  itemName?: string;
  category?: string;
  title?: string;
  days?: number;
}

export const ItemPriceChart = ({ 
  itemId, 
  itemName, 
  category,
  title = 'Price History',
  days = 30 
}: ItemPriceChartProps) => {
  const { formatPrice } = useCurrency();
  const { data, isLoading, hasData } = usePriceHistory({
    productId: itemId,
    itemName,
    category,
    days,
    marketItemId: itemId,
  });

  const stats = useMemo(() => {
    if (data.length === 0) return { startPrice: 0, endPrice: 0, change: 0, isPositive: true };
    const startPrice = data[0]?.price || 0;
    const endPrice = data[data.length - 1]?.price || 0;
    const change = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;
    return { startPrice, endPrice, change, isPositive: change >= 0 };
  }, [data]);

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{days} Day Performance</p>
        </div>
        <div className="text-right">
          {hasData ? (
            <>
              <div className="text-lg font-bold font-display text-foreground">
                {formatPrice(stats.endPrice)}
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${stats.isPositive ? 'text-gain' : 'text-loss'}`}>
                {stats.isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {stats.isPositive ? '+' : ''}{stats.change.toFixed(2)}%
              </div>
            </>
          ) : !isLoading ? (
            <p className="text-xs text-muted-foreground">No data</p>
          ) : null}
        </div>
      </div>

      <div className="h-32">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-1">
            <AlertCircle className="w-4 h-4" />
            <span>Price history will appear as trading occurs</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`colorPrice-${itemId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={stats.isPositive ? "hsl(142 76% 36%)" : "hsl(0 84% 60%)"} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={stats.isPositive ? "hsl(142 76% 36%)" : "hsl(0 84% 60%)"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 9 }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 9 }}
                domain={['dataMin - 5', 'dataMax + 5']}
                tickFormatter={(value) => formatPrice(value)}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(220, 18%, 8%)',
                  border: '1px solid hsl(220, 15%, 18%)',
                  borderRadius: '8px',
                  color: 'hsl(0, 0%, 98%)',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(220, 10%, 55%)' }}
                formatter={(value: number) => [formatPrice(value), 'Price']}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={stats.isPositive ? "hsl(142 76% 36%)" : "hsl(0 84% 60%)"}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#colorPrice-${itemId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
