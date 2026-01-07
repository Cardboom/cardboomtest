import { motion } from 'framer-motion';
import { Droplets, DollarSign, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ExternalExitSignalsProps {
  marketItemId: string;
}

export function ExternalExitSignals({ marketItemId }: ExternalExitSignalsProps) {
  const { data: signals, isLoading } = useQuery({
    queryKey: ['external-liquidity', marketItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_liquidity_signals')
        .select('*')
        .eq('market_item_id', marketItemId)
        .order('is_recommended', { ascending: false });

      if (error) throw error;
      // Only return CardBoom internal signals, filter out external platforms
      return data?.filter((s: any) => s.platform === 'cardboom') || [];
    },
    enabled: !!marketItemId
  });

  const getLiquidityColor = (level: string) => {
    switch (level) {
      case 'very_high': return 'text-green-500 bg-green-500/10';
      case 'high': return 'text-green-400 bg-green-400/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      default: return 'text-red-500 bg-red-500/10';
    }
  };

  // Don't show anything - external signals are disabled
  if (isLoading || !signals || signals.length === 0) {
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-primary" />
          <h4 className="font-semibold">Market Liquidity</h4>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          CardBoom marketplace liquidity analysis
        </p>
      </div>

      {/* Internal Liquidity Only */}
      <div className="p-4 space-y-2">
        {signals.map((signal: any) => (
          <div 
            key={signal.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className="font-medium text-primary">CardBoom</div>
              <Badge variant="outline" className={getLiquidityColor(signal.liquidity_level)}>
                <Droplets className="h-3 w-3 mr-1" />
                {signal.liquidity_level?.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {signal.avg_price && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  {signal.avg_price.toLocaleString()}
                </span>
              )}
              {signal.volume_24h > 0 && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  {signal.volume_24h} sold
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
