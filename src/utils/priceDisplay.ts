/**
 * Price Display Utilities
 * 
 * Implements CardBoom's trust-first pricing philosophy:
 * - Never show fake prices
 * - Show "Insufficient data" when we don't have verified data
 * - Clear hierarchy: verified > estimated > listing_only > insufficient_data
 */

export type PriceStatus = 'verified' | 'estimated' | 'listing_only' | 'pending' | 'insufficient_data';

export interface PriceDisplayResult {
  hasPrice: boolean;
  displayPrice: number | null;
  priceLabel: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  showListingMedian: boolean;
}

/**
 * Determines how to display a market item's price based on price_status
 */
export function getPriceDisplay(
  currentPrice: number | null | undefined,
  priceStatus: PriceStatus | string | null | undefined,
  verifiedPrice?: number | null,
  listingMedianPrice?: number | null,
  listingSampleCount?: number
): PriceDisplayResult {
  const status = (priceStatus || 'pending') as PriceStatus;
  
  // Verified or estimated prices are trustworthy
  if (status === 'verified' && verifiedPrice && verifiedPrice > 0) {
    return {
      hasPrice: true,
      displayPrice: verifiedPrice,
      priceLabel: 'Market Price',
      confidence: 'high',
      showListingMedian: false,
    };
  }
  
  if (status === 'verified' && currentPrice && currentPrice > 0) {
    return {
      hasPrice: true,
      displayPrice: currentPrice,
      priceLabel: 'Market Price',
      confidence: 'high',
      showListingMedian: false,
    };
  }
  
  if (status === 'estimated' && currentPrice && currentPrice > 0) {
    return {
      hasPrice: true,
      displayPrice: currentPrice,
      priceLabel: 'Est. Price',
      confidence: 'medium',
      showListingMedian: true,
    };
  }
  
  // Listing-only: show listing median if available
  if (status === 'listing_only' && listingMedianPrice && listingMedianPrice > 0 && (listingSampleCount || 0) >= 3) {
    return {
      hasPrice: true,
      displayPrice: listingMedianPrice,
      priceLabel: 'Listing Median',
      confidence: 'low',
      showListingMedian: true,
    };
  }
  
  // Insufficient data or pending: don't show price
  return {
    hasPrice: false,
    displayPrice: null,
    priceLabel: 'Insufficient data',
    confidence: 'none',
    showListingMedian: (listingSampleCount || 0) >= 1,
  };
}

/**
 * Format price for display, handling null/undefined/0 cases
 */
export function formatPriceOrDash(
  price: number | null | undefined,
  formatFn: (price: number) => string
): string {
  if (price === null || price === undefined || price === 0) {
    return '—';
  }
  return formatFn(price);
}

/**
 * Check if a grade price should be displayed
 */
export function hasGradePrice(price: number | null | undefined): boolean {
  return price !== null && price !== undefined && price > 0;
}
