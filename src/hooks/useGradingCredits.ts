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
}

// Check if this is the user's first free signup grading (completely free, no extras)
export const isFirstFreeSignupGrading = (credits: GradingCredits | null): boolean => {
  if (!credits) return false;
  // First free grading: signup credit claimed AND credits remaining > 0 AND this is their first use
  // The signup_credit_claimed flag indicates verification was completed
  // credits_remaining > 0 means they haven't used it yet
  return credits.signup_credit_claimed && credits.credits_remaining > 0;
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

  const grantFirstSubscribeCredit = async () => {
    if (!userId || credits?.first_subscribe_credit_claimed) return false;

    try {
      if (!credits) {
        const { error } = await supabase
          .from('grading_credits')
          .insert({
            user_id: userId,
            credits_remaining: 1,
            first_subscribe_credit_claimed: true,
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('grading_credits')
          .update({
            credits_remaining: credits.credits_remaining + 1,
            first_subscribe_credit_claimed: true,
          })
          .eq('user_id', userId);

        if (error) throw error;
      }

      await supabase.from('grading_credit_history').insert({
        user_id: userId,
        credits_change: 1,
        reason: 'First subscription bonus - 1 free grading',
      });

      toast.success('🎉 You received 1 free grading credit for subscribing!');
      fetchCredits();
      return true;
    } catch (error) {
      console.error('Error granting first subscribe credit:', error);
      return false;
    }
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

    // Pro gets 1 credit per month, Enterprise gets 2 credits per month
    if (subscriptionTier === 'enterprise') {
      creditsToGrant = 2;
    } else if (subscriptionTier === 'pro' || subscriptionTier === 'verified_seller') {
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
          });
        } else {
          await supabase
            .from('grading_credits')
            .update({
              credits_remaining: credits.credits_remaining + creditsToGrant,
              last_monthly_credit_at: now.toISOString(),
            })
            .eq('user_id', userId);
        }

        await supabase.from('grading_credit_history').insert({
          user_id: userId,
          credits_change: creditsToGrant,
          reason: `Monthly ${subscriptionTier} credit (${creditsToGrant}x)`,
        });

        const tierLabel = subscriptionTier === 'enterprise' ? 'Enterprise' : 'Pro';
        toast.success(`🎉 You received ${creditsToGrant} free grading credit${creditsToGrant > 1 ? 's' : ''} for ${tierLabel}!`);
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
    useCredit,
    useCredits,
    checkAndGrantMonthlyCredit,
    refetch: fetchCredits,
  };
};
