import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  user_id: string;
  tier: 'free' | 'pro' | 'enterprise';
  price_monthly: number;
  started_at: string;
  expires_at: string | null;
  auto_renew: boolean;
  billing_cycle?: 'monthly' | 'yearly';
}

export const useSubscription = (userId?: string) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  // Monthly prices
  const PRO_PRICE = 9.99;
  const ENTERPRISE_PRICE = 29.99;
  
  // Yearly prices (11 months - 1 month free)
  const PRO_YEARLY_PRICE = PRO_PRICE * 11;
  const ENTERPRISE_YEARLY_PRICE = ENTERPRISE_PRICE * 11;
  
  // Enterprise perks
  const ENTERPRISE_FREE_GRADINGS_PER_MONTH = 1;

  useEffect(() => {
    if (userId) {
      fetchSubscription();
    }
  }, [userId]);

  const fetchSubscription = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Check if expired
      if (data && data.expires_at && new Date(data.expires_at) < new Date()) {
        setSubscription({ ...data, tier: 'free' } as Subscription);
      } else {
        setSubscription(data as Subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  // Use useMemo to recalculate when subscription changes
  const isPro = useMemo(() => {
    if (!subscription) return false;
    if (subscription.tier !== 'pro' && subscription.tier !== 'enterprise') return false;
    if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) return false;
    return true;
  }, [subscription]);

  const isEnterprise = useMemo(() => {
    if (!subscription) return false;
    if (subscription.tier !== 'enterprise') return false;
    if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) return false;
    return true;
  }, [subscription]);

  const subscribe = async (tier: 'pro' | 'enterprise' = 'pro', billingCycle: 'monthly' | 'yearly' = 'monthly') => {
    if (!userId) {
      toast.error('Please sign in to subscribe');
      return false;
    }

    // Calculate price based on tier and billing cycle
    let price: number;
    if (tier === 'enterprise') {
      price = billingCycle === 'yearly' ? ENTERPRISE_YEARLY_PRICE : ENTERPRISE_PRICE;
    } else {
      price = billingCycle === 'yearly' ? PRO_YEARLY_PRICE : PRO_PRICE;
    }
    
    const tierLabel = tier === 'enterprise' ? 'Enterprise' : 'Pro';
    const cycleLabel = billingCycle === 'yearly' ? 'Annual' : 'Monthly';

    try {
      // Get user's wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (walletError) throw walletError;
      
      if (!wallet) {
        toast.error('Wallet not found. Please contact support.');
        return false;
      }

      if (Number(wallet.balance) < price) {
        toast.error(`Insufficient balance. You need $${price.toFixed(2)} for ${tierLabel} ${cycleLabel} subscription.`);
        return false;
      }

      // Deduct from wallet
      const newBalance = Number(wallet.balance) - price;
      const { error: deductError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', wallet.id);

      if (deductError) throw deductError;

      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          wallet_id: wallet.id,
          type: 'withdrawal',
          amount: -price,
          description: `${tierLabel} Subscription - ${cycleLabel}`,
        });

      // Calculate expiry based on billing cycle
      const expiresAt = new Date();
      if (billingCycle === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setDate(expiresAt.getDate() + 30);
      }

      // Create or update subscription
      const { data: existingSub } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      const subscriptionData = {
        tier: tier,
        price_monthly: tier === 'enterprise' ? ENTERPRISE_PRICE : PRO_PRICE,
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        auto_renew: true,
      };

      if (existingSub) {
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update(subscriptionData)
          .eq('user_id', userId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            ...subscriptionData,
          });

        if (insertError) throw insertError;
      }

      const savings = billingCycle === 'yearly' ? ' You saved 1 month free!' : '';
      toast.success(`Welcome to ${tierLabel}! Enjoy reduced fees and premium features.${savings}`);
      await fetchSubscription();
      return true;

    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || 'Failed to subscribe. Please try again.');
      return false;
    }
  };

  const cancelAutoRenew = async () => {
    if (!userId || !subscription) return false;

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ auto_renew: false })
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Auto-renewal cancelled. Your Pro benefits will remain until expiry.');
      await fetchSubscription();
      return true;
    } catch (error: any) {
      toast.error('Failed to cancel auto-renewal');
      return false;
    }
  };

  const getFeeRates = () => {
    if (isEnterprise) {
      return {
        buyerFeeRate: 0.03, // 3% for Enterprise
        sellerFeeRate: 0.045, // 4.5% for Enterprise
        cardFeeRate: 0.045, // 4.5% for Enterprise
        wireFeeRate: 0.01, // 1% for Enterprise
      };
    }
    if (isPro) {
      return {
        buyerFeeRate: 0.045, // 4.5% for Pro
        sellerFeeRate: 0.06, // 6% for Pro
        cardFeeRate: 0.055, // 5.5% for Pro
        wireFeeRate: 0.02, // 2% for Pro
      };
    }
    return {
      buyerFeeRate: 0.06, // 6% standard
      sellerFeeRate: 0.085, // 8.5% standard
      cardFeeRate: 0.07, // 7% standard
      wireFeeRate: 0.03, // 3% standard
    };
  };

  return {
    subscription,
    loading,
    isPro,
    isEnterprise,
    subscribe,
    cancelAutoRenew,
    getFeeRates,
    PRO_PRICE,
    ENTERPRISE_PRICE,
    PRO_YEARLY_PRICE,
    ENTERPRISE_YEARLY_PRICE,
    ENTERPRISE_FREE_GRADINGS_PER_MONTH,
    refetch: fetchSubscription,
  };
};
