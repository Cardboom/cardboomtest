import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface FeeUpgradeNudgeProps {
  currentBuyerFee: number;
  itemPrice: number;
}

// Fee rates by tier
const FEE_RATES = {
  free: 0.06,      // 6%
  pro: 0.045,      // 4.5%
  enterprise: 0.03 // 3%
};

export const FeeUpgradeNudge = ({ currentBuyerFee, itemPrice }: FeeUpgradeNudgeProps) => {
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTier = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: sub } = await supabase
          .from('user_subscriptions')
          .select('tier, expires_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (sub && sub.tier !== 'free') {
          // Check if expired
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

  // Don't show nudge for Enterprise users (already on highest tier)
  if (userTier === 'enterprise') return null;

  // Calculate savings
  const proFee = itemPrice * FEE_RATES.pro;
  const enterpriseFee = itemPrice * FEE_RATES.enterprise;
  
  const proSavings = currentBuyerFee - proFee;
  const enterpriseSavings = currentBuyerFee - enterpriseFee;

  // Only show if savings are meaningful ($0.10+)
  const showProNudge = userTier === 'free' && proSavings >= 0.10;
  const showEnterpriseNudge = (userTier === 'free' || userTier === 'pro') && enterpriseSavings >= 0.10;

  if (!showProNudge && !showEnterpriseNudge) return null;

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Crown className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Save on fees with CardBoom Pro</span>
      </div>

      <div className="space-y-2">
        {/* Current fee */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            You're paying ({userTier === 'free' ? '6%' : '4.5%'})
          </span>
          <span className="font-medium text-loss">{formatUSD(currentBuyerFee)}</span>
        </div>

        {/* Pro savings for Free users */}
        {showProNudge && userTier === 'free' && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Badge variant="secondary" className="text-xs px-1.5 py-0">PRO</Badge>
              would pay (4.5%)
            </span>
            <span className="font-medium text-gain">{formatUSD(proFee)}</span>
          </div>
        )}

        {/* Enterprise savings */}
        {showEnterpriseNudge && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Badge className="text-xs px-1.5 py-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">ENTERPRISE</Badge>
              would pay (3%)
            </span>
            <span className="font-medium text-gain">{formatUSD(enterpriseFee)}</span>
          </div>
        )}
      </div>

      {/* Savings highlight */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-gain/10 border border-gain/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gain" />
          <span className="text-sm font-semibold text-gain">
            Save {formatUSD(userTier === 'free' ? proSavings : enterpriseSavings)} on this order
          </span>
        </div>
      </div>

      <Button 
        size="sm" 
        variant="outline" 
        className="w-full gap-2 border-primary/50 hover:bg-primary/10"
        onClick={handleUpgrade}
      >
        <Crown className="w-4 h-4" />
        Upgrade & Save
        <ArrowRight className="w-3 h-3" />
      </Button>
    </div>
  );
};
