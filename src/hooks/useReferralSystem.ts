import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReferralCommission {
  id: string;
  event_type: string;
  source_amount: number;
  commission_rate: number;
  commission_amount: number;
  created_at: string;
}

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
  totalCommissionEarned: number;
  pendingCommission: number;
  totalDepositVolume: number;
  totalTradeVolume: number;
  tier: string;
  commissionRate: number;
  referralCode: string | null;
  recentCommissions: ReferralCommission[];
}

interface Referral {
  id: string;
  referred_id: string;
  status: string;
  reward_amount: number;
  referred_deposit_total: number;
  referred_trade_volume: number;
  commission_earned: number;
  created_at: string;
  completed_at: string | null;
}

const TIER_THRESHOLDS = {
  bronze: { minVolume: 0, rate: 0.05 },
  silver: { minVolume: 10000, rate: 0.075 },
  gold: { minVolume: 50000, rate: 0.10 },
  platinum: { minVolume: 200000, rate: 0.125 },
  diamond: { minVolume: 500000, rate: 0.15 }
};

export const useReferralSystem = () => {
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    pendingReferrals: 0,
    totalCommissionEarned: 0,
    pendingCommission: 0,
    totalDepositVolume: 0,
    totalTradeVolume: 0,
    tier: 'bronze',
    commissionRate: 0.05,
    referralCode: null,
    recentCommissions: []
  });
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const calculateTier = (totalVolume: number) => {
    if (totalVolume >= TIER_THRESHOLDS.diamond.minVolume) return 'diamond';
    if (totalVolume >= TIER_THRESHOLDS.platinum.minVolume) return 'platinum';
    if (totalVolume >= TIER_THRESHOLDS.gold.minVolume) return 'gold';
    if (totalVolume >= TIER_THRESHOLDS.silver.minVolume) return 'silver';
    return 'bronze';
  };

  const fetchReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get user's referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();

      // Get all referrals
      const { data: referralData } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      const allReferrals = referralData || [];
      setReferrals(allReferrals as Referral[]);

      // Get recent commissions
      const { data: commissions } = await supabase
        .from('referral_commissions')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Calculate stats
      const totalDepositVolume = allReferrals.reduce((sum, r) => sum + (Number(r.referred_deposit_total) || 0), 0);
      const totalTradeVolume = allReferrals.reduce((sum, r) => sum + (Number(r.referred_trade_volume) || 0), 0);
      const totalVolume = totalDepositVolume + totalTradeVolume;
      const tier = calculateTier(totalVolume);
      const commissionRate = TIER_THRESHOLDS[tier as keyof typeof TIER_THRESHOLDS].rate;

      const totalCommissionEarned = (commissions || []).reduce(
        (sum, c) => sum + (Number(c.commission_amount) || 0), 0
      );

      setStats({
        totalReferrals: allReferrals.length,
        activeReferrals: allReferrals.filter(r => r.status === 'completed' || r.status === 'rewarded').length,
        pendingReferrals: allReferrals.filter(r => r.status === 'pending').length,
        totalCommissionEarned,
        pendingCommission: 0, // Can be calculated from pending referral rewards
        totalDepositVolume,
        totalTradeVolume,
        tier,
        commissionRate,
        referralCode: profile?.referral_code || null,
        recentCommissions: (commissions || []) as ReferralCommission[]
      });
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
        description: 'Deposit funds and trade to unlock rewards for both of you!',
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
    if (stats.referralCode) {
      navigator.clipboard.writeText(stats.referralCode);
      toast({
        title: 'Copied!',
        description: 'Referral code copied to clipboard',
      });
    }
  };

  const shareReferralLink = async () => {
    if (!stats.referralCode) return;
    
    const link = `${window.location.origin}/auth?ref=${stats.referralCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join CardBoom',
          text: 'Join me on CardBoom - the best collectibles marketplace! Use my referral code to get started.',
          url: link,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(link);
          toast({
            title: 'Link Copied!',
            description: 'Share this link with friends',
          });
        }
      }
    } else {
      await navigator.clipboard.writeText(link);
      toast({
        title: 'Link Copied!',
        description: 'Share this link with friends',
      });
    }
  };

  const getTierInfo = () => {
    return {
      current: stats.tier,
      rate: stats.commissionRate,
      thresholds: TIER_THRESHOLDS,
      nextTier: getNextTier(stats.tier),
      volumeToNextTier: getVolumeToNextTier(stats.tier, stats.totalDepositVolume + stats.totalTradeVolume)
    };
  };

  const getNextTier = (currentTier: string) => {
    const tiers = Object.keys(TIER_THRESHOLDS);
    const currentIndex = tiers.indexOf(currentTier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  };

  const getVolumeToNextTier = (currentTier: string, currentVolume: number) => {
    const nextTier = getNextTier(currentTier);
    if (!nextTier) return 0;
    return TIER_THRESHOLDS[nextTier as keyof typeof TIER_THRESHOLDS].minVolume - currentVolume;
  };

  useEffect(() => {
    fetchReferralData();
  }, []);

  return {
    ...stats,
    referrals,
    loading,
    applyReferralCode,
    copyReferralCode,
    shareReferralLink,
    getTierInfo,
    refetch: fetchReferralData
  };
};
