import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuctionEligibility {
  canCreate: boolean;
  isVerifiedSeller: boolean;
  isEnterprise: boolean;
  loading: boolean;
  reason: 'verified_seller' | 'enterprise' | 'ineligible' | null;
}

export const useAuctionEligibility = (userId?: string): AuctionEligibility => {
  const [eligibility, setEligibility] = useState<AuctionEligibility>({
    canCreate: false,
    isVerifiedSeller: false,
    isEnterprise: false,
    loading: true,
    reason: null,
  });

  useEffect(() => {
    const checkEligibility = async () => {
      if (!userId) {
        setEligibility({
          canCreate: false,
          isVerifiedSeller: false,
          isEnterprise: false,
          loading: false,
          reason: 'ineligible',
        });
        return;
      }

      try {
        // Check verified seller status
        const { data: verifiedSeller } = await supabase
          .from('verified_sellers')
          .select('verification_status, subscription_active')
          .eq('user_id', userId)
          .single();

        const isVerifiedSeller = 
          verifiedSeller?.verification_status === 'approved' && 
          verifiedSeller?.subscription_active === true;

        // Check enterprise subscription
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('tier, expires_at')
          .eq('user_id', userId)
          .single();

        const isEnterprise = 
          subscription?.tier === 'enterprise' && 
          (!subscription?.expires_at || new Date(subscription.expires_at) > new Date());

        const canCreate = isVerifiedSeller || isEnterprise;
        
        let reason: AuctionEligibility['reason'] = 'ineligible';
        if (isVerifiedSeller) reason = 'verified_seller';
        else if (isEnterprise) reason = 'enterprise';

        setEligibility({
          canCreate,
          isVerifiedSeller,
          isEnterprise,
          loading: false,
          reason: canCreate ? reason : 'ineligible',
        });
      } catch (error) {
        console.error('Error checking auction eligibility:', error);
        setEligibility({
          canCreate: false,
          isVerifiedSeller: false,
          isEnterprise: false,
          loading: false,
          reason: 'ineligible',
        });
      }
    };

    checkEligibility();
  }, [userId]);

  return eligibility;
};
