import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Gems Pricing Context
 * 
 * Implements CardBoom's Gems pricing rules:
 * - 1 Gem = $0.01 USD (internal face value)
 * - +12% markup for standard users
 * - +8% markup for Pro subscribers
 * - +5% markup for Enterprise subscribers
 * - Gems display mode for marketplace
 */

export type PriceDisplayMode = 'gems' | 'usd';

export type SubscriptionTier = 'free' | 'lite' | 'pro' | 'enterprise';

interface GemsPricing {
  /** Markup percentage based on subscription tier */
  markupPercent: number;
  /** Raw multiplier (1 + markup/100) */
  markupMultiplier: number;
  /** Subscription tier */
  tier: SubscriptionTier;
  /** Tier display name */
  tierLabel: string;
}

interface GemsContextType {
  /** Current price display mode: gems or usd */
  displayMode: PriceDisplayMode;
  /** Set the display mode */
  setDisplayMode: (mode: PriceDisplayMode) => void;
  /** User's subscription tier */
  subscriptionTier: SubscriptionTier;
  /** Current pricing configuration based on tier */
  pricing: GemsPricing;
  /** Convert USD price to Gems (including markup for top-ups) */
  usdToGems: (usdAmount: number) => number;
  /** Convert Gems to USD (face value, no markup) */
  gemsToUsd: (gemsAmount: number) => number;
  /** Calculate what user pays in USD for X Gems (includes markup) */
  getGemsTopUpCost: (gemsAmount: number) => number;
  /** Calculate how many Gems user receives for USD payment (includes markup) */
  getGemsFromPayment: (usdPayment: number) => number;
  /** Format a USD price for display (respects displayMode) */
  formatPriceDisplay: (priceUSD: number) => string;
  /** Format gems amount with symbol */
  formatGems: (gems: number) => string;
  /** Is loading tier information */
  isLoading: boolean;
}

const GemsContext = createContext<GemsContextType | undefined>(undefined);

// Markup percentages by tier
const MARKUP_BY_TIER: Record<SubscriptionTier, number> = {
  free: 12,      // +12% for standard users
  lite: 10,      // +10% for Lite subscribers
  pro: 8,        // +8% for Pro subscribers
  enterprise: 5, // +5% for Enterprise subscribers
};

const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: 'Standard',
  lite: 'Lite',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

// Base conversion: 1 Gem = $0.01 USD
const GEM_FACE_VALUE_USD = 0.01;

export const GemsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [displayMode, setDisplayModeState] = useState<PriceDisplayMode>(() => {
    try {
      const saved = localStorage.getItem('price-display-mode');
      return (saved as PriceDisplayMode) || 'gems';
    } catch {
      return 'gems';
    }
  });
  
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's subscription tier
  useEffect(() => {
    const fetchSubscriptionTier = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setSubscriptionTier('free');
          setIsLoading(false);
          return;
        }

        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('tier, expires_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (subscription?.tier) {
          // Check if subscription is expired
          const isExpired = subscription.expires_at && new Date(subscription.expires_at) < new Date();
          if (isExpired) {
            setSubscriptionTier('free');
          } else {
            const tier = subscription.tier.toLowerCase() as SubscriptionTier;
            if (tier === 'pro' || tier === 'enterprise') {
              setSubscriptionTier(tier);
            } else {
              setSubscriptionTier('free');
            }
          }
        } else {
          setSubscriptionTier('free');
        }
      } catch (error) {
        console.error('Error fetching subscription tier:', error);
        setSubscriptionTier('free');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptionTier();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchSubscriptionTier();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const setDisplayMode = useCallback((mode: PriceDisplayMode) => {
    setDisplayModeState(mode);
    try {
      localStorage.setItem('price-display-mode', mode);
    } catch {
      // Silent fail for private browsing
    }
  }, []);

  // Calculate pricing based on subscription tier
  const pricing = useMemo((): GemsPricing => {
    const markupPercent = MARKUP_BY_TIER[subscriptionTier];
    return {
      markupPercent,
      markupMultiplier: 1 + markupPercent / 100,
      tier: subscriptionTier,
      tierLabel: TIER_LABELS[subscriptionTier],
    };
  }, [subscriptionTier]);

  // Convert USD to Gems (face value, no markup - for marketplace display)
  const usdToGems = useCallback((usdAmount: number): number => {
    // 1 Gem = $0.01, so $1 = 100 Gems
    return usdAmount / GEM_FACE_VALUE_USD;
  }, []);

  // Convert Gems to USD (face value)
  const gemsToUsd = useCallback((gemsAmount: number): number => {
    return gemsAmount * GEM_FACE_VALUE_USD;
  }, []);

  // Calculate what user pays in USD for X Gems (includes markup)
  const getGemsTopUpCost = useCallback((gemsAmount: number): number => {
    const faceValueUSD = gemsAmount * GEM_FACE_VALUE_USD;
    return faceValueUSD * pricing.markupMultiplier;
  }, [pricing.markupMultiplier]);

  // Calculate how many Gems user receives for USD payment (includes markup)
  const getGemsFromPayment = useCallback((usdPayment: number): number => {
    const afterMarkup = usdPayment / pricing.markupMultiplier;
    return afterMarkup / GEM_FACE_VALUE_USD;
  }, [pricing.markupMultiplier]);

  // Format gems with symbol
  const formatGems = useCallback((gems: number): string => {
    const rounded = Math.round(gems);
    return `${rounded.toLocaleString()} 💎`;
  }, []);

  // Format price for display based on current mode
  const formatPriceDisplay = useCallback((priceUSD: number): string => {
    if (displayMode === 'gems') {
      const gems = usdToGems(priceUSD);
      return formatGems(gems);
    }
    // USD display
    return `$${priceUSD.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }, [displayMode, usdToGems, formatGems]);

  const value = useMemo(() => ({
    displayMode,
    setDisplayMode,
    subscriptionTier,
    pricing,
    usdToGems,
    gemsToUsd,
    getGemsTopUpCost,
    getGemsFromPayment,
    formatPriceDisplay,
    formatGems,
    isLoading,
  }), [
    displayMode,
    setDisplayMode,
    subscriptionTier,
    pricing,
    usdToGems,
    gemsToUsd,
    getGemsTopUpCost,
    getGemsFromPayment,
    formatPriceDisplay,
    formatGems,
    isLoading,
  ]);

  return (
    <GemsContext.Provider value={value}>
      {children}
    </GemsContext.Provider>
  );
};

export const useGems = () => {
  const context = useContext(GemsContext);
  if (!context) {
    throw new Error('useGems must be used within a GemsProvider');
  }
  return context;
};

// Export constants for use elsewhere
export const GEM_FACE_VALUE = GEM_FACE_VALUE_USD;
export const GEMS_MARKUP_RATES = MARKUP_BY_TIER;
