import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Turkey Payment Compliance Hook
 * 
 * Implements geo-specific payment rules for users in Türkiye:
 * - Card payments: ONLY for Gems top-up (closed-loop credits)
 * - IBAN/Bank transfers: ONLY for direct product purchases (order-specific)
 * - No wallet funding via IBAN
 * - No product purchases via card
 * 
 * This ensures CardBoom does not operate as a payment institution in Turkey.
 */

export interface TurkeyComplianceConfig {
  /** Whether user is subject to Turkey compliance rules */
  isTurkishResident: boolean;
  
  /** Payment method restrictions */
  allowCardForGems: boolean;        // Card → Gems only
  allowCardForProducts: boolean;    // Card → Products (blocked for TR)
  allowIBANForProducts: boolean;    // IBAN → Products only
  allowIBANForWallet: boolean;      // IBAN → Wallet (blocked for TR)
  allowWithdrawals: boolean;        // Withdrawals (blocked for TR)
  
  /** Loading state */
  loading: boolean;
  
  /** User's country code */
  countryCode: string | null;
}

// Terminology for Turkish users (avoid banking language)
export const TR_TERMINOLOGY = {
  topUp: 'Top Up Boom Coins',
  topUpCard: 'Top Up Boom Coins (Credit Card)',
  buyIBAN: 'Buy with Bank Transfer (IBAN)',
  gems: 'CardBoom Boom Coins',
  gemsDescription: 'Prepaid platform credits for CardBoom services',
  
  // Forbidden terms - never use for TR users
  forbidden: ['deposit', 'wallet funding', 'cash balance', 'withdraw', 'withdrawal'],
} as const;

export const useTurkeyCompliance = (): TurkeyComplianceConfig => {
  const [loading, setLoading] = useState(true);
  const [countryCode, setCountryCode] = useState<string | null>(null);

  const fetchUserCountry = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('country_code')
        .eq('id', user.id)
        .single();

      setCountryCode(profile?.country_code || 'TR'); // Default to TR if not set
    } catch (error) {
      console.error('Error fetching user country:', error);
      // Default to TR for safety (strictest rules)
      setCountryCode('TR');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserCountry();
  }, [fetchUserCountry]);

  const isTurkishResident = countryCode === 'TR';

  // Apply Turkey-specific restrictions
  return {
    isTurkishResident,
    
    // Card payments - Gems ONLY for TR, all methods for non-TR
    allowCardForGems: true, // All users can top up gems
    allowCardForProducts: !isTurkishResident, // Non-TR can use card for products
    
    // IBAN payments - Products ONLY for TR (no wallet funding)
    allowIBANForProducts: isTurkishResident, // Only TR users use IBAN for products
    allowIBANForWallet: !isTurkishResident, // Non-TR can fund wallet via IBAN
    
    // Withdrawals - blocked for TR
    allowWithdrawals: !isTurkishResident,
    
    loading,
    countryCode,
  };
};

/**
 * Validate payment method for Turkey compliance
 * Use this in backend edge functions for server-side enforcement
 */
export const validateTurkeyPayment = (
  countryCode: string,
  paymentType: 'card' | 'iban',
  purpose: 'gems' | 'product' | 'wallet'
): { allowed: boolean; error?: string } => {
  const isTR = countryCode === 'TR';

  if (!isTR) {
    return { allowed: true }; // No restrictions for non-TR
  }

  // Turkey rules enforcement
  if (paymentType === 'card') {
    if (purpose === 'gems') {
      return { allowed: true };
    }
    return { 
      allowed: false, 
      error: 'Card payments are only allowed for Gems top-up in Turkey' 
    };
  }

  if (paymentType === 'iban') {
    if (purpose === 'product') {
      return { allowed: true };
    }
    return { 
      allowed: false, 
      error: 'Bank transfers are only allowed for direct product purchases in Turkey' 
    };
  }

  return { allowed: false, error: 'Invalid payment configuration' };
};

/**
 * Get user-friendly payment label based on region
 */
export const getPaymentLabel = (
  isTurkishResident: boolean,
  type: 'cardTopUp' | 'ibanProduct' | 'addFunds'
): string => {
  if (isTurkishResident) {
    switch (type) {
      case 'cardTopUp':
        return TR_TERMINOLOGY.topUpCard;
      case 'ibanProduct':
        return TR_TERMINOLOGY.buyIBAN;
      case 'addFunds':
        return TR_TERMINOLOGY.topUp;
    }
  }

  // Non-TR terminology (standard wallet language allowed)
  switch (type) {
    case 'cardTopUp':
      return 'Credit / Debit Card';
    case 'ibanProduct':
      return 'Wire Transfer (EFT/Havale)';
    case 'addFunds':
      return 'Add Funds';
  }
};
