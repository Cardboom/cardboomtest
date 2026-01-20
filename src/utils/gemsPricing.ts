/**
 * Boom Coins Pricing Utilities
 * 
 * Core pricing logic for CardBoom's Boom Coins system.
 * 
 * Rules:
 * - 1 Boom Coin = $0.001 USD (internal face value) - 1000 coins = $1
 * - Top-up markup: +12% standard, +8% Pro, +5% Enterprise
 * - Marketplace: display prices in Boom Coins (derived from USD)
 * - IBAN checkout: USD only
 * - Card checkout: Boom Coins only (for TR users)
 * 
 * UPDATED: Divided by 10x (was $0.01, now $0.001)
 */

export type SubscriptionTier = 'free' | 'lite' | 'pro' | 'enterprise';

// Face value: 1 Coin = $0.105 USD (~9.5 coins per $1, $5 = 47.5 coins)
// Updated: $5 = 47.5 coins as requested
export const GEM_FACE_VALUE_USD = 0.105263;

// Markup percentages for Coins top-up
export const GEMS_MARKUP_PERCENT = {
  free: 12,
  lite: 10,
  pro: 8,
  enterprise: 5,
} as const;

/**
 * Convert USD price to Coins (face value, no markup)
 * Formula: Coins = USD / 0.001 = USD × 1000
 */
export const usdToGems = (usd: number): number => {
  return Math.round(usd / GEM_FACE_VALUE_USD);
};

/**
 * Convert Gems to USD (face value)
 * Formula: USD = Gems × 0.01
 */
export const gemsToUsd = (gems: number): number => {
  return gems * GEM_FACE_VALUE_USD;
};

/**
 * Get markup percentage for a subscription tier
 */
export const getMarkupPercent = (tier: SubscriptionTier): number => {
  return GEMS_MARKUP_PERCENT[tier] || GEMS_MARKUP_PERCENT.free;
};

/**
 * Calculate what user pays in USD to receive X Gems (includes markup)
 */
export const getGemsTopUpCostUSD = (gems: number, tier: SubscriptionTier = 'free'): number => {
  const faceValueUSD = gems * GEM_FACE_VALUE_USD;
  const markup = 1 + getMarkupPercent(tier) / 100;
  return faceValueUSD * markup;
};

/**
 * Calculate how many Gems user receives for a USD payment (after markup)
 */
export const getGemsFromPaymentUSD = (usd: number, tier: SubscriptionTier = 'free'): number => {
  const markup = 1 + getMarkupPercent(tier) / 100;
  const afterMarkup = usd / markup;
  return Math.floor(afterMarkup / GEM_FACE_VALUE_USD);
};

/**
 * Format Boom Coins amount (number only - use BoomCoinIcon separately for display)
 */
export const formatGems = (gems: number): string => {
  const rounded = Math.round(gems);
  return rounded.toLocaleString();
};

/**
 * Format Boom Coins amount without emoji
 */
export const formatGemsPlain = (gems: number): string => {
  const rounded = Math.round(gems);
  return rounded.toLocaleString();
};

/**
 * Format USD amount
 */
export const formatUSD = (usd: number): string => {
  return `$${usd.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

/**
 * Validate payment method against checkout rules
 * - Card payments: Gems only (for TR users)
 * - IBAN payments: USD only
 */
export type PaymentMethod = 'card' | 'iban' | 'wallet';

export interface CheckoutValidation {
  isValid: boolean;
  errorMessage?: string;
  allowedCurrency: 'gems' | 'usd';
}

export const validateCheckoutPayment = (
  method: PaymentMethod,
  isTurkishResident: boolean
): CheckoutValidation => {
  if (method === 'iban') {
    return {
      isValid: true,
      allowedCurrency: 'usd',
    };
  }
  
  if (method === 'card' && isTurkishResident) {
    return {
      isValid: true,
      allowedCurrency: 'gems',
    };
  }
  
  // Wallet payments use USD balance but can display in Gems
  return {
    isValid: true,
    allowedCurrency: 'usd',
  };
};

/**
 * Get tier-specific messaging for Boom Coins pricing
 */
export const getTierPricingMessage = (tier: SubscriptionTier): string => {
  switch (tier) {
    case 'enterprise':
      return 'Enterprise pricing applied (5% markup)';
    case 'pro':
      return 'Pro member discount applied (8% markup)';
    case 'lite':
      return 'Lite member discount applied (10% markup)';
    default:
      return 'Standard pricing (12% markup)';
  }
};

/**
 * Calculate potential savings by upgrading tier
 */
export const calculateUpgradeSavings = (
  gemsAmount: number,
  currentTier: SubscriptionTier,
  targetTier: SubscriptionTier
): number => {
  const currentCost = getGemsTopUpCostUSD(gemsAmount, currentTier);
  const targetCost = getGemsTopUpCostUSD(gemsAmount, targetTier);
  return currentCost - targetCost;
};
