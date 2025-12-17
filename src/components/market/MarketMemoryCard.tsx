import { motion } from 'framer-motion';
import { History, TrendingUp, TrendingDown, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MarketMemoryCardProps {
  marketItemId?: string;
  category?: string;
  currentPrice: number;
}

export function MarketMemoryCard({ marketItemId, category, currentPrice }: MarketMemoryCardProps) {
  const { data: memories, isLoading } = useQuery({
    queryKey: ['market-memory', marketItemId, category],
    queryFn: async () => {
      let query = supabase
        .from('market_memory')
        .select('*')
        .order('event_date', { ascending: false })
        .limit(5);

      if (marketItemId) {
        query = query.eq('market_item_id', marketItemId);
      } else if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!(marketItemId || category)
  });

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'price_peak': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'price_bottom': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'recovery': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'crash': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'rotation_spike': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <History className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventLabel = (eventType: string) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  if (isLoading || !memories || memories.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Market Memory</h4>
            <Badge variant="outline" className="text-xs ml-auto">
              Historical Context
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Markets remember. Learn from history.
          </p>
        </div>

        <div className="p-4 space-y-3">
          {memories.map((memory: any, index: number) => (
            <Tooltip key={memory.id}>
              <TooltipTrigger asChild>
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                >
                  <div className="mt-0.5">
                    {getEventIcon(memory.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {getEventLabel(memory.event_type)}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          memory.confidence === 'high' && "border-green-500/50 text-green-500",
                          memory.confidence === 'medium' && "border-yellow-500/50 text-yellow-500",
                          memory.confidence === 'low' && "border-muted-foreground/50"
                        )}
                      >
                        {memory.confidence}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {memory.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(memory.event_date).toLocaleDateString()}
                      </span>
                      {memory.recovery_days && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {memory.recovery_days}d recovery
                        </span>
                      )}
                      {memory.price_at_event && (
                        <span>${memory.price_at_event.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-sm">{memory.description}</p>
                {memory.recovery_days && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Recovery time: {memory.recovery_days} days
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="px-4 py-3 bg-muted/30 border-t border-border">
          <p className="text-xs text-muted-foreground text-center italic">
            "Those who cannot remember the past are condemned to repeat it"
          </p>
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
