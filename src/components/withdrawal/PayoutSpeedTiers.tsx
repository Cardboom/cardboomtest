import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Zap, Crown, Rocket, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PayoutSpeedTiersProps {
  className?: string;
}

const PAYOUT_TIERS = {
  free: {
    label: 'Standard',
    days: '3-5 business days',
    icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
  },
  pro: {
    label: 'Next-Day',
    days: '1 business day',
    icon: Zap,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  enterprise: {
    label: 'Instant',
    days: 'Within hours',
    icon: Rocket,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
};

export const PayoutSpeedTiers = ({ className }: PayoutSpeedTiersProps) => {
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTier = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: sub } = await supabase
          .from('user_subscriptions')
          .select('tier, expires_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (sub && sub.tier !== 'free') {
          if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
            setUserTier('free');
          } else {
            setUserTier(sub.tier as 'free' | 'pro' | 'enterprise');
          }
        }
      } catch (error) {
        console.error('Error fetching tier:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTier();
  }, []);

  if (loading) return null;

  const currentTier = PAYOUT_TIERS[userTier];
  const CurrentIcon = currentTier.icon;

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Current payout speed */}
      <div className={cn(
        "p-3 rounded-lg border flex items-center gap-3",
        currentTier.bgColor,
        userTier === 'enterprise' ? 'border-amber-500/30' : 
        userTier === 'pro' ? 'border-primary/30' : 'border-border'
      )}>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          userTier === 'enterprise' ? 'bg-amber-500/20' :
          userTier === 'pro' ? 'bg-primary/20' : 'bg-muted'
        )}>
          <CurrentIcon className={cn("w-5 h-5", currentTier.color)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{currentTier.label} Payout</span>
            {userTier !== 'free' && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs",
                  userTier === 'enterprise' && "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0"
                )}
              >
                {userTier.toUpperCase()}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{currentTier.days}</p>
        </div>
      </div>

      {/* Upgrade prompt for non-Enterprise users */}
      {userTier !== 'enterprise' && (
        <div className="rounded-lg border border-dashed border-primary/40 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Crown className="w-4 h-4 text-primary" />
            <span className="font-medium">Get faster payouts</span>
          </div>
          
          <div className="space-y-1.5">
            {userTier === 'free' && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-primary" />
                  Pro members get next-day payouts
                </span>
                <Badge variant="outline" className="text-xs">$9.99/mo</Badge>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Rocket className="w-3 h-3 text-amber-500" />
                Enterprise gets instant payouts
              </span>
              <Badge variant="outline" className="text-xs">$29.99/mo</Badge>
            </div>
          </div>

          <Button 
            size="sm" 
            variant="outline" 
            className="w-full gap-2 mt-2 border-primary/50 hover:bg-primary/10"
            onClick={handleUpgrade}
          >
            <Crown className="w-4 h-4" />
            Upgrade for faster payouts
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
