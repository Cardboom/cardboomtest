import { useMemo, useEffect, useState } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PriceChartProps {
  title?: string;
}

interface MarketIndexPoint {
  date: string;
  price: number;
}

export const PriceChart = ({ title = 'Market Index' }: PriceChartProps) => {
  const [data, setData] = useState<MarketIndexPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMarketIndex = async () => {
      setIsLoading(true);
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Fetch aggregated price history for market index
        const { data: historyData, error } = await supabase
          .from('price_history')
          .select('price, recorded_at')
          .gte('recorded_at', thirtyDaysAgo.toISOString())
          .order('recorded_at', { ascending: true });

        if (error) throw error;

        if (historyData && historyData.length > 0) {
          // Group by date and average prices for a market index feel
          const groupedByDate = historyData.reduce((acc: Record<string, number[]>, item) => {
            const date = new Date(item.recorded_at).toLocaleDateString('en-US', {
              month: 'numeric',
              day: 'numeric',
            });
            if (!acc[date]) acc[date] = [];
            acc[date].push(Number(item.price));
            return acc;
          }, {});

          const aggregatedData = Object.entries(groupedByDate).map(([date, prices]) => ({
            date,
            price: prices.reduce((sum, p) => sum + p, 0) / prices.length,
          }));

          setData(aggregatedData);
        } else {
          setData([]);
        }
      } catch (err) {
        console.error('Error fetching market index:', err);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketIndex();
  }, []);

  const stats = useMemo(() => {
    if (data.length === 0) return { startPrice: 0, endPrice: 0, change: 0, isPositive: true };
    const startPrice = data[0]?.price || 0;
    const endPrice = data[data.length - 1]?.price || 0;
    const change = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;
    return { startPrice, endPrice, change, isPositive: change >= 0 };
  }, [data]);

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">30 Day Performance</p>
        </div>
        <div className="text-right">
          {data.length > 0 ? (
            <>
              <div className="text-2xl font-bold font-display text-foreground">
                ${stats.endPrice.toFixed(2)}
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${stats.isPositive ? 'text-gain' : 'text-loss'}`}>
                <TrendingUp className={`w-4 h-4 ${!stats.isPositive && 'rotate-180'}`} />
                {stats.isPositive ? '+' : ''}{stats.change.toFixed(2)}%
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No data yet</p>
          )}
        </div>
      </div>

      <div className="h-48">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Price history will appear as trading occurs
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(188 85% 40%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(188 85% 40%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 10 }}
                tickFormatter={(value) => value}
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
                stroke="hsl(188 85% 40%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPrice)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
