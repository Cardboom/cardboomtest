import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  user_id: string;
  tier: 'free' | 'pro';
  price_monthly: number;
  started_at: string;
  expires_at: string | null;
  auto_renew: boolean;
}

export const useSubscription = (userId?: string) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const PRO_PRICE = 9.99;

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

  const isPro = () => {
    if (!subscription) return false;
    if (subscription.tier !== 'pro') return false;
    if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) return false;
    return true;
  };

  const subscribe = async () => {
    if (!userId) {
      toast.error('Please sign in to subscribe');
      return false;
    }

    try {
      // Get user's wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (walletError) throw walletError;

      if (Number(wallet.balance) < PRO_PRICE) {
        toast.error(`Insufficient balance. You need $${PRO_PRICE} for Pro subscription.`);
        return false;
      }

      // Deduct from wallet
      const newBalance = Number(wallet.balance) - PRO_PRICE;
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
          amount: -PRO_PRICE,
          description: 'Pro Subscription - Monthly',
        });

      // Calculate expiry (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Create or update subscription
      const { data: existingSub } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingSub) {
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            tier: 'pro',
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            auto_renew: true,
          })
          .eq('user_id', userId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            tier: 'pro',
            price_monthly: PRO_PRICE,
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            auto_renew: true,
          });

        if (insertError) throw insertError;
      }

      toast.success('Welcome to Pro! Enjoy reduced fees and premium features.');
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
    if (isPro()) {
      return {
        buyerFeeRate: 0.025, // 2.5% for Pro
        sellerFeeRate: 0.045, // 4.5% for Pro
        cardFeeRate: 0.045, // 4.5% for Pro (vs standard ~6%)
        wireFeeRate: 0.015, // 1.5% for Pro (vs standard ~3%)
      };
    }
    return {
      buyerFeeRate: 0.05, // 5% standard
      sellerFeeRate: 0.08, // 8% standard
      cardFeeRate: 0.06, // 6% standard
      wireFeeRate: 0.03, // 3% standard
    };
  };

  return {
    subscription,
    loading,
    isPro: isPro(),
    subscribe,
    cancelAutoRenew,
    getFeeRates,
    PRO_PRICE,
    refetch: fetchSubscription,
  };
};
