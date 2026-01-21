import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GradingCredits {
  id: string;
  user_id: string;
  credits_remaining: number;
  last_monthly_credit_at: string | null;
  first_deposit_credit_claimed: boolean;
  first_subscribe_credit_claimed: boolean;
  signup_credit_claimed: boolean;
  lite_credit_claimed?: boolean;
  monthly_credits_tier?: string | null;
}

// Monthly credits per subscription tier (pre-grading only)
export const MONTHLY_GRADING_CREDITS = {
  lite: 1,
  pro: 2,
  enterprise: 3,
} as const;

// Helper to determine if this is the user's first free signup grading
export const isFirstFreeSignupGrading = (credits: GradingCredits | null): boolean => {
  if (!credits) return false;
  // First free = signup credit was claimed AND they still have credits from it
  return credits.signup_credit_claimed && credits.credits_remaining > 0;
};

// Helper to check if user has any free grading credits available
export const hasAvailableGradingCredits = (credits: GradingCredits | null): boolean => {
  if (!credits) return false;
  return credits.credits_remaining > 0;
};

export const useGradingCredits = (userId?: string) => {
  const [credits, setCredits] = useState<GradingCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('grading_credits')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching grading credits:', error);
      }

      setCredits(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const grantFirstDepositCredit = async () => {
    if (!userId || credits?.first_deposit_credit_claimed) return false;

    try {
      // Check if record exists
      if (!credits) {
        // Create new record with first deposit credit
        const { error } = await supabase
          .from('grading_credits')
          .insert({
            user_id: userId,
            credits_remaining: 1,
            first_deposit_credit_claimed: true,
          });

        if (error) throw error;
      } else {
        // Update existing record
        const { error } = await supabase
          .from('grading_credits')
          .update({
            credits_remaining: credits.credits_remaining + 1,
            first_deposit_credit_claimed: true,
          })
          .eq('user_id', userId);

        if (error) throw error;
      }

      // Log the credit
      await supabase.from('grading_credit_history').insert({
        user_id: userId,
        credits_change: 1,
        reason: 'First deposit bonus - $5 grading credit',
      });

      toast.success('🎉 You received 1 free grading credit for your first deposit!');
      fetchCredits();
      return true;
    } catch (error) {
      console.error('Error granting first deposit credit:', error);
      return false;
    }
  };

  // Grant credits when subscribing to a tier
  // Lite: +1 credit, Pro: +2 credits, Enterprise: +3 credits
  const grantSubscriptionCredits = async (tier: 'lite' | 'pro' | 'enterprise') => {
    if (!userId) return false;

    // Check if this tier's credits have already been claimed
    const creditField = tier === 'lite' ? 'lite_credit_claimed' : 'first_subscribe_credit_claimed';
    if (credits && (credits as any)[creditField]) return false;

    const creditsToGrant = MONTHLY_GRADING_CREDITS[tier];

    try {
      if (!credits) {
        const { error } = await supabase
          .from('grading_credits')
          .insert({
            user_id: userId,
            credits_remaining: creditsToGrant,
            [creditField]: true,
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('grading_credits')
          .update({
            credits_remaining: credits.credits_remaining + creditsToGrant,
            [creditField]: true,
          })
          .eq('user_id', userId);

        if (error) throw error;
      }

      await supabase.from('grading_credit_history').insert({
        user_id: userId,
        credits_change: creditsToGrant,
        reason: `${tier.charAt(0).toUpperCase() + tier.slice(1)} subscription bonus - ${creditsToGrant} free grading${creditsToGrant > 1 ? 's' : ''}`,
      });

      toast.success(`🎉 You received ${creditsToGrant} free grading credit${creditsToGrant > 1 ? 's' : ''} for subscribing to ${tier.charAt(0).toUpperCase() + tier.slice(1)}!`);
      fetchCredits();
      return true;
    } catch (error) {
      console.error('Error granting subscription credits:', error);
      return false;
    }
  };

  const grantFirstSubscribeCredit = async () => {
    // Legacy function - now use grantSubscriptionCredits
    return grantSubscriptionCredits('pro');
  };

  const useCredit = async () => {
    if (!userId || !credits || credits.credits_remaining <= 0) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('grading_credits')
        .update({
          credits_remaining: credits.credits_remaining - 1,
        })
        .eq('user_id', userId);

      if (error) throw error;

      await supabase.from('grading_credit_history').insert({
        user_id: userId,
        credits_change: -1,
        reason: 'Used for grading order',
      });

      fetchCredits();
      return true;
    } catch (error) {
      console.error('Error using credit:', error);
      return false;
    }
  };

  // Use multiple credits at once (for batch orders)
  const useCredits = async (count: number) => {
    if (!userId || !credits || credits.credits_remaining < count || count <= 0) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('grading_credits')
        .update({
          credits_remaining: credits.credits_remaining - count,
        })
        .eq('user_id', userId);

      if (error) throw error;

      await supabase.from('grading_credit_history').insert({
        user_id: userId,
        credits_change: -count,
        reason: `Used ${count} credit${count > 1 ? 's' : ''} for grading order`,
      });

      fetchCredits();
      return true;
    } catch (error) {
      console.error('Error using credits:', error);
      return false;
    }
  };

  const checkAndGrantMonthlyCredit = async (subscriptionTier: string) => {
    if (!userId) return false;

    const now = new Date();
    const lastCredit = credits?.last_monthly_credit_at 
      ? new Date(credits.last_monthly_credit_at) 
      : null;

    let shouldGrant = false;
    let creditsToGrant = 0;

    // Credits per tier: Lite=1, Pro=2, Enterprise=3
    if (subscriptionTier === 'enterprise') {
      creditsToGrant = 3;
    } else if (subscriptionTier === 'pro' || subscriptionTier === 'verified_seller') {
      creditsToGrant = 2;
    } else if (subscriptionTier === 'lite') {
      creditsToGrant = 1;
    }

    if (creditsToGrant > 0) {
      if (!lastCredit) {
        shouldGrant = true;
      } else {
        // Check if a month has passed since last credit
        const monthsDiff = (now.getTime() - lastCredit.getTime()) / (1000 * 60 * 60 * 24 * 30);
        shouldGrant = monthsDiff >= 1;
      }
    }

    if (shouldGrant) {
      try {
        if (!credits) {
          await supabase.from('grading_credits').insert({
            user_id: userId,
            credits_remaining: creditsToGrant,
            last_monthly_credit_at: now.toISOString(),
            monthly_credits_tier: subscriptionTier,
          });
        } else {
          await supabase
            .from('grading_credits')
            .update({
              credits_remaining: credits.credits_remaining + creditsToGrant,
              last_monthly_credit_at: now.toISOString(),
              monthly_credits_tier: subscriptionTier,
            })
            .eq('user_id', userId);
        }

        await supabase.from('grading_credit_history').insert({
          user_id: userId,
          credits_change: creditsToGrant,
          reason: `Monthly ${subscriptionTier} credit (${creditsToGrant}x)`,
        });

        const tierLabel = subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1);
        toast.success(`🎉 You received ${creditsToGrant} free AI pre-grading credit${creditsToGrant > 1 ? 's' : ''} for ${tierLabel}!`);
        fetchCredits();
        return true;
      } catch (error) {
        console.error('Error granting monthly credit:', error);
      }
    }

    return false;
  };

  return {
    credits,
    loading,
    creditsRemaining: credits?.credits_remaining || 0,
    grantFirstDepositCredit,
    grantFirstSubscribeCredit,
    grantSubscriptionCredits,
    useCredit,
    useCredits,
    checkAndGrantMonthlyCredit,
    refetch: fetchCredits,
  };
};
