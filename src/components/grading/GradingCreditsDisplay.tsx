import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Gift, Crown, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useGradingCredits } from '@/hooks/useGradingCredits';

interface GradingCreditsDisplayProps {
  userId?: string;
  onUseCredit?: () => void;
}

export const GradingCreditsDisplay: React.FC<GradingCreditsDisplayProps> = ({ 
  userId,
  onUseCredit 
}) => {
  const { creditsRemaining, loading } = useGradingCredits(userId);

  if (loading || !userId) return null;

  if (creditsRemaining <= 0) return null;

  return (
    <motion.div
      className="p-4 rounded-xl border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-orange-500/10"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              Free Grading Credits
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                {creditsRemaining} available
              </Badge>
            </h3>
            <p className="text-sm text-muted-foreground">
              Use your free credit for this grading!
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-yellow-500" />
          <span className="text-2xl font-bold text-yellow-500">{creditsRemaining}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-yellow-500/20 space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="w-4 h-4 text-green-500" />
          <span>Credits applied automatically at checkout</span>
        </div>
        <p className="text-xs text-muted-foreground/70 pl-6">
          Covers base certification only. Speed upgrades & protection bundles are paid separately.
        </p>
      </div>
    </motion.div>
  );
};

export const GradingCreditsBanner: React.FC<{ userId?: string; subscriptionTier?: string }> = ({ 
  userId, 
  subscriptionTier 
}) => {
  if (!subscriptionTier || !['pro', 'verified_seller', 'enterprise'].includes(subscriptionTier)) {
    return null;
  }

  const creditsPerMonth = subscriptionTier === 'enterprise' ? 2 : 1;
  const tierLabel = subscriptionTier === 'enterprise' ? 'Enterprise' : subscriptionTier === 'verified_seller' ? 'Verified Seller' : 'Pro';

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30">
      <Crown className="w-5 h-5 text-purple-500" />
      <span className="text-sm">
        <strong className="text-purple-500">{tierLabel}</strong>
        {' '}perk: {creditsPerMonth} free grading{creditsPerMonth > 1 ? 's' : ''} every month!
      </span>
    </div>
  );
};
