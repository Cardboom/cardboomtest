import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Gift, Crown, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGradingCredits } from '@/hooks/useGradingCredits';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface GradingCreditsDisplayProps {
  userId?: string;
  onUseCredit?: () => void;
}

export const GradingCreditsDisplay: React.FC<GradingCreditsDisplayProps> = ({ 
  userId,
  onUseCredit 
}) => {
  const { creditsRemaining, credits, loading } = useGradingCredits(userId);
  const [needsVerification, setNeedsVerification] = useState(false);
  const navigate = useNavigate();

  // Check if user has phone and national ID
  useEffect(() => {
    const checkVerification = async () => {
      if (!userId) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone, national_id')
        .eq('id', userId)
        .single();
      
      if (profile) {
        const hasPhone = profile.phone && profile.phone.trim() !== '';
        const hasNationalId = profile.national_id && profile.national_id.trim() !== '';
        setNeedsVerification(!hasPhone || !hasNationalId);
      }
    };
    
    checkVerification();
  }, [userId]);

  if (loading || !userId) return null;

  // Show pending signup credit if user hasn't claimed it yet
  if (!credits?.signup_credit_claimed && needsVerification) {
    return (
      <motion.div
        className="p-4 rounded-xl border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-orange-500/10"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                Unlock Free Grading
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Pending
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground">
                Verify phone & ID to claim your free credit!
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10"
            onClick={() => navigate('/settings')}
          >
            Verify <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </motion.div>
    );
  }

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
          {credits?.signup_credit_claimed && creditsRemaining === 1
            ? "First signup grading is completely free - includes everything!"
            : "Covers base certification only. Speed upgrades & protection bundles are paid separately."
          }
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
