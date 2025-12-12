import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  status: string;
  reward_amount: number;
  created_at: string;
  completed_at: string | null;
}

export const useReferral = () => {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get user's referral code from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();

      setReferralCode(profile?.referral_code || null);

      // Get referrals made by this user
      const { data: referralData } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      setReferrals(referralData || []);

      // Calculate total earned
      const earned = (referralData || [])
        .filter(r => r.status === 'rewarded')
        .reduce((sum, r) => sum + (r.reward_amount || 0), 0);
      setTotalEarned(earned);
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyReferralCode = async (code: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Login Required',
          description: 'Please log in to apply a referral code',
          variant: 'destructive',
        });
        return false;
      }

      const { data, error } = await supabase.functions.invoke('process-referral', {
        body: {
          referral_code: code,
          referred_user_id: user.id,
        },
      });

      if (error) throw error;

      if (!data.success) {
        toast({
          title: 'Invalid Code',
          description: data.error || 'This referral code is not valid',
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'Referral Applied!',
        description: 'Make your first purchase to unlock rewards',
      });

      return true;
    } catch (error) {
      console.error('Error applying referral code:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply referral code',
        variant: 'destructive',
      });
      return false;
    }
  };

  const copyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast({
        title: 'Copied!',
        description: 'Referral code copied to clipboard',
      });
    }
  };

  const shareReferralLink = () => {
    if (referralCode) {
      const link = `${window.location.origin}/auth?ref=${referralCode}`;
      navigator.clipboard.writeText(link);
      toast({
        title: 'Link Copied!',
        description: 'Share this link with friends',
      });
    }
  };

  useEffect(() => {
    fetchReferralData();
  }, []);

  return {
    referralCode,
    referrals,
    totalEarned,
    loading,
    applyReferralCode,
    copyReferralCode,
    shareReferralLink,
    refetch: fetchReferralData,
  };
};
