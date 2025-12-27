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
}

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

  const checkAndGrantMonthlyCredit = async (subscriptionTier: string) => {
    if (!userId) return false;

    const now = new Date();
    const lastCredit = credits?.last_monthly_credit_at 
      ? new Date(credits.last_monthly_credit_at) 
      : null;

    let shouldGrant = false;
    let monthsRequired = 0;

    if (subscriptionTier === 'verified_seller') {
      monthsRequired = 1;
    } else if (subscriptionTier === 'pro') {
      monthsRequired = 2;
    }

    if (monthsRequired > 0) {
      if (!lastCredit) {
        shouldGrant = true;
      } else {
        const monthsDiff = (now.getTime() - lastCredit.getTime()) / (1000 * 60 * 60 * 24 * 30);
        shouldGrant = monthsDiff >= monthsRequired;
      }
    }

    if (shouldGrant) {
      try {
        if (!credits) {
          await supabase.from('grading_credits').insert({
            user_id: userId,
            credits_remaining: 1,
            last_monthly_credit_at: now.toISOString(),
          });
        } else {
          await supabase
            .from('grading_credits')
            .update({
              credits_remaining: credits.credits_remaining + 1,
              last_monthly_credit_at: now.toISOString(),
            })
            .eq('user_id', userId);
        }

        await supabase.from('grading_credit_history').insert({
          user_id: userId,
          credits_change: 1,
          reason: `Monthly ${subscriptionTier} credit`,
        });

        toast.success('🎉 You received your monthly free grading credit!');
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
    checkAndGrantMonthlyCredit,
    refetch: fetchCredits,
  };
};
