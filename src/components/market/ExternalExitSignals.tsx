import { motion } from 'framer-motion';
import { ExternalLink, TrendingUp, Droplets, DollarSign, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ExternalExitSignalsProps {
  marketItemId: string;
}

const PLATFORM_CONFIG: Record<string, { name: string; color: string; url: string }> = {
  tcgplayer: { name: 'TCGPlayer', color: 'text-orange-500', url: 'https://tcgplayer.com' },
  cardmarket: { name: 'Cardmarket', color: 'text-purple-500', url: 'https://cardmarket.com' },
  stockx: { name: 'StockX', color: 'text-green-500', url: 'https://stockx.com' },
  whatnot: { name: 'Whatnot', color: 'text-pink-500', url: 'https://whatnot.com' },
  other: { name: 'Other', color: 'text-muted-foreground', url: '#' }
};

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
      return data;
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

  if (isLoading || !signals || signals.length === 0) {
    return null;
  }

  const recommendedPlatform = signals.find(s => s.is_recommended);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-primary" />
          <h4 className="font-semibold">Exit Surface</h4>
          <Badge variant="outline" className="text-xs ml-auto">
            Cross-Platform
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          We show you where liquidity is highest — even if it's not us
        </p>
      </div>

      {/* Recommended Platform */}
      {recommendedPlatform && (
        <div className="p-4 bg-primary/5 border-b border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-primary font-medium mb-1">Best Exit Right Now</p>
              <div className="flex items-center gap-2">
                <span className={cn("font-bold", PLATFORM_CONFIG[recommendedPlatform.platform]?.color)}>
                  {PLATFORM_CONFIG[recommendedPlatform.platform]?.name}
                </span>
                <Badge className={getLiquidityColor(recommendedPlatform.liquidity_level)}>
                  {recommendedPlatform.liquidity_level?.replace('_', ' ')} liquidity
                </Badge>
              </div>
              {recommendedPlatform.recommendation_reason && (
                <p className="text-xs text-muted-foreground mt-1">
                  {recommendedPlatform.recommendation_reason}
                </p>
              )}
            </div>
            <Button size="sm" variant="outline" className="gap-1">
              View <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* All Platforms */}
      <div className="p-4 space-y-2">
        {signals.map((signal: any) => {
          const config = PLATFORM_CONFIG[signal.platform] || PLATFORM_CONFIG.other;
          
          return (
            <div 
              key={signal.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg",
                signal.is_recommended ? "bg-primary/5 border border-primary/20" : "bg-muted/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("font-medium", config.color)}>
                  {config.name}
                </div>
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
                {signal.spread_percent !== null && (
                  <span className="text-muted-foreground">
                    {signal.spread_percent.toFixed(1)}% spread
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
          );
        })}
      </div>

      <div className="px-4 py-3 bg-muted/30 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Radical trust — we always show you the truth, even when it's not CardBoom
        </p>
      </div>
    </motion.div>
  );
}
