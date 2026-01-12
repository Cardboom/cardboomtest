import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Loader2, CheckCircle2, AlertCircle, Zap, Crown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface GradingCountdownPanelProps {
  gradingOrderId: string;
  onComplete?: () => void;
}

interface GradingOrderInfo {
  id: string;
  status: string;
  speed_tier: 'standard' | 'express' | 'priority' | null;
  created_at: string;
  estimated_completion_at: string | null;
  results_visible_at: string | null;
  cbgi_score_0_100: number | null;
  grade_label: string | null;
}

interface SubscriptionInfo {
  tier: 'free' | 'pro' | 'enterprise';
}

// Countdown durations based on SPEED TIER selected during grading (in hours)
// Speed tier is what determines the wait time, NOT subscription tier
const SPEED_TIER_HOURS = {
  standard: 72, // 3 days
  express: 24,  // 1 day  
  priority: 4,  // 4 hours
};

export function GradingCountdownPanel({ gradingOrderId, onComplete }: GradingCountdownPanelProps) {
  const [orderInfo, setOrderInfo] = useState<GradingOrderInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo>({ tier: 'free' });
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch grading order
        const { data: order, error: orderError } = await supabase
          .from('grading_orders')
          .select('id, status, speed_tier, created_at, estimated_completion_at, results_visible_at, cbgi_score_0_100, grade_label')
          .eq('id', gradingOrderId)
          .single();

        if (orderError || !order) {
          console.error('Error fetching grading order:', orderError);
          return;
        }

        setOrderInfo(order as GradingOrderInfo);

        // Check if results are visible (countdown expired and has results)
        const resultsVisibleAt = order.results_visible_at ? new Date(order.results_visible_at).getTime() : null;
        const now = Date.now();
        
        if (order.status === 'completed' && order.cbgi_score_0_100 && resultsVisibleAt && now >= resultsVisibleAt) {
          setIsComplete(true);
          onComplete?.();
          return;
        }

        // Fetch user subscription for display purposes
        const { data: sub } = await supabase
          .from('user_subscriptions')
          .select('tier')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
          .maybeSingle();

        const tier = (sub?.tier as 'free' | 'pro' | 'enterprise') || 'free';
        setSubscription({ tier });

        // Use results_visible_at for countdown (if available), otherwise calculate
        if (resultsVisibleAt) {
          const remaining = Math.max(0, resultsVisibleAt - now);
          setTimeRemaining(remaining);
        } else {
          // Fallback: Calculate countdown from created_at based on speed tier
          const speedTier = order.speed_tier || 'standard';
          const totalHours = SPEED_TIER_HOURS[speedTier as keyof typeof SPEED_TIER_HOURS] || 72;
          
          const createdAt = new Date(order.created_at).getTime();
          const targetTime = createdAt + (totalHours * 60 * 60 * 1000);
          const remaining = Math.max(0, targetTime - now);
          
          setTimeRemaining(remaining);
        }
      } catch (err) {
        console.error('Error in GradingCountdownPanel:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up realtime subscription for order updates
    const channel = supabase
      .channel(`grading-order-${gradingOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'grading_orders',
          filter: `id=eq.${gradingOrderId}`,
        },
        (payload) => {
          const updated = payload.new as GradingOrderInfo;
          setOrderInfo(updated);
          if (updated.status === 'completed') {
            setIsComplete(true);
            onComplete?.();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gradingOrderId, onComplete]);

  // Countdown timer
  useEffect(() => {
    if (isComplete || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          clearInterval(interval);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isComplete, timeRemaining]);

  if (loading) {
    return (
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!orderInfo) return null;

  // Format time remaining
  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  };

  // Calculate progress based on speed tier
  const speedTier = orderInfo.speed_tier || 'standard';
  const totalHours = SPEED_TIER_HOURS[speedTier as keyof typeof SPEED_TIER_HOURS] || 72;
  const totalMs = totalHours * 60 * 60 * 1000;
  const progressPercent = ((totalMs - timeRemaining) / totalMs) * 100;

  const getTierIcon = () => {
    switch (subscription.tier) {
      case 'enterprise': return <Crown className="w-4 h-4 text-amber-400" />;
      case 'pro': return <Sparkles className="w-4 h-4 text-primary" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSpeedBadge = () => {
    if (!orderInfo.speed_tier || orderInfo.speed_tier === 'standard') return null;
    return (
      <Badge variant="outline" className="text-xs gap-1">
        <Zap className="w-3 h-3" />
        {orderInfo.speed_tier === 'priority' ? 'Priority' : 'Express'}
      </Badge>
    );
  };

  if (isComplete) {
    return (
      <Card className="border-gain/50 bg-gain/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-gain" />
            <div>
              <p className="font-medium text-gain">Grading Complete!</p>
              <p className="text-sm text-muted-foreground">
                CBGI Score: {orderInfo.cbgi_score_0_100?.toFixed(1)} • {orderInfo.grade_label}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orderInfo.status === 'in_review') {
    return (
      <Card className="border-amber-500/50 bg-amber-500/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <div>
              <p className="font-medium text-amber-600">Manual Review Required</p>
              <p className="text-sm text-muted-foreground">
                Our team is reviewing your card for accuracy
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getTierIcon()}
            <span className="font-medium text-sm">Grading in Progress</span>
          </div>
          <div className="flex items-center gap-2">
            {getSpeedBadge()}
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs",
                subscription.tier === 'enterprise' && "bg-amber-500/20 text-amber-600",
                subscription.tier === 'pro' && "bg-primary/20 text-primary"
              )}
            >
              {subscription.tier === 'free' ? 'Free' : subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Time remaining</span>
            <span className="font-mono font-medium">
              {timeRemaining > 0 ? formatTime(timeRemaining) : 'Processing...'}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {subscription.tier === 'free' && (
          <p className="text-xs text-muted-foreground">
            💡 Upgrade to Pro for 24h grading or Enterprise for 4h grading
          </p>
        )}
      </CardContent>
    </Card>
  );
}