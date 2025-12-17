import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Zap, Clock, Search, Percent } from 'lucide-react';
import { useReputation } from '@/hooks/useReputation';
import { ReputationBadge } from './ReputationBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export function ReputationCard() {
  const { reputation, isLoading, recentEvents, tierBenefits } = useReputation();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!reputation) {
    return null;
  }

  const nextTierThreshold = {
    bronze: 200,
    silver: 400,
    gold: 600,
    platinum: 800,
    diamond: 1000
  };

  const currentThreshold = nextTierThreshold[reputation.tier];
  const prevThreshold = reputation.tier === 'bronze' ? 0 : 
    nextTierThreshold[Object.keys(nextTierThreshold)[Object.keys(nextTierThreshold).indexOf(reputation.tier) - 1] as keyof typeof nextTierThreshold];
  
  const progress = ((reputation.score - prevThreshold) / (currentThreshold - prevThreshold)) * 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Your Reputation</h3>
          <ReputationBadge tier={reputation.tier} score={reputation.score} showScore />
        </div>

        {/* Progress to next tier */}
        {reputation.tier !== 'diamond' && (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress to next tier</span>
              <span className="font-medium">{currentThreshold - reputation.score} points needed</span>
            </div>
            <Progress value={Math.min(progress, 100)} className="h-2" />
          </div>
        )}

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Fee Discount</span>
            </div>
            <div className="text-lg font-bold text-green-500">
              {reputation.feeDiscount > 0 ? `-${reputation.feeDiscount * 100}%` : 'None'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Withdrawals</span>
            </div>
            <div className="text-lg font-bold capitalize text-blue-500">
              {reputation.withdrawalSpeed}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Search className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Search Boost</span>
            </div>
            <div className="text-lg font-bold text-purple-500">
              {reputation.searchBoost > 0 ? `+${reputation.searchBoost}%` : 'None'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Status</span>
            </div>
            <div className="text-lg font-bold capitalize text-yellow-500">
              {reputation.tier}
            </div>
          </div>
        </div>

        {/* Recent Events */}
        {recentEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Recent Activity</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {recentEvents.slice(0, 5).map((event, index) => (
                <div 
                  key={event.id}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <span className="text-muted-foreground capitalize">
                    {event.event_type.replace(/_/g, ' ')}
                  </span>
                  <span className={cn(
                    "font-medium",
                    event.points_change > 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {event.points_change > 0 ? '+' : ''}{event.points_change}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tier Benefits Footer */}
      <div className="bg-muted/30 p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Complete trades, maintain accurate listings, and avoid disputes to increase reputation
        </p>
      </div>
    </motion.div>
  );
}
