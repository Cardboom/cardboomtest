import { useCallback } from 'react';
import { useGems, PriceDisplayMode } from '@/contexts/GemsContext';
import { useCurrency, Currency } from '@/contexts/CurrencyContext';

/**
 * Unified Pricing Hook
 * 
 * Combines GemsContext and CurrencyContext for consistent pricing across the site.
 * 
 * Rules:
 * - When displayMode is 'gems': Show price in Gems (USD × 100)
 * - When displayMode is 'usd': Show price in selected fiat currency (USD/EUR/TRY)
 * - Gems prices are always fixed (not affected by currency toggle)
 * - Fiat prices respect the current currency selection
 */

export interface UnifiedPricingResult {
  /** Current display mode: 'gems' or 'usd' (fiat) */
  displayMode: PriceDisplayMode;
  /** Current fiat currency (only relevant when displayMode is 'usd') */
  fiatCurrency: Currency;
  /** Format a USD price respecting current display mode and currency */
  formatPrice: (priceUSD: number) => string;
  /** Format price with Gems emoji if in gems mode */
  formatPriceWithSymbol: (priceUSD: number) => string;
  /** Convert USD to Gems (always available) */
  usdToGems: (usd: number) => number;
  /** Convert Gems to USD (always available) */
  gemsToUsd: (gems: number) => number;
  /** Get raw numeric price in current display mode */
  getDisplayValue: (priceUSD: number) => number;
  /** Check if currently showing Gems */
  isGemsMode: boolean;
  /** Set display mode */
  setDisplayMode: (mode: PriceDisplayMode) => void;
  /** Cycle fiat currency (USD -> EUR -> TRY -> USD) */
  cycleFiatCurrency: () => void;
  /** Set specific fiat currency */
  setFiatCurrency: (currency: Currency) => void;
}

export const useUnifiedPricing = (): UnifiedPricingResult => {
  const { 
    displayMode, 
    setDisplayMode,
    usdToGems, 
    gemsToUsd,
    formatGems,
  } = useGems();
  
  const { 
    currency: fiatCurrency, 
    setCurrency: setFiatCurrency,
    formatPrice: formatFiatPrice,
    convertFromUSD,
    exchangeRates,
  } = useCurrency();

  const isGemsMode = displayMode === 'gems';

  // Cycle through fiat currencies
  const cycleFiatCurrency = useCallback(() => {
    if (fiatCurrency === 'USD') setFiatCurrency('EUR');
    else if (fiatCurrency === 'EUR') setFiatCurrency('TRY');
    else setFiatCurrency('USD');
  }, [fiatCurrency, setFiatCurrency]);

  // Format price respecting display mode
  const formatPrice = useCallback((priceUSD: number): string => {
    if (isGemsMode) {
      const gems = usdToGems(priceUSD);
      // Return plain number formatted for gems
      return Math.round(gems).toLocaleString();
    }
    // Use fiat formatting
    return formatFiatPrice(priceUSD);
  }, [isGemsMode, usdToGems, formatFiatPrice]);

  // Format with symbol (Gem emoji or currency symbol)
  const formatPriceWithSymbol = useCallback((priceUSD: number): string => {
    if (isGemsMode) {
      const gems = usdToGems(priceUSD);
      return formatGems(gems);
    }
    return formatFiatPrice(priceUSD);
  }, [isGemsMode, usdToGems, formatGems, formatFiatPrice]);

  // Get raw numeric value in current display
  const getDisplayValue = useCallback((priceUSD: number): number => {
    if (isGemsMode) {
      return Math.round(usdToGems(priceUSD));
    }
    return convertFromUSD(priceUSD, fiatCurrency);
  }, [isGemsMode, usdToGems, convertFromUSD, fiatCurrency]);

  return {
    displayMode,
    fiatCurrency,
    formatPrice,
    formatPriceWithSymbol,
    usdToGems,
    gemsToUsd,
    getDisplayValue,
    isGemsMode,
    setDisplayMode,
    cycleFiatCurrency,
    setFiatCurrency,
  };
};

/**
 * Get currency symbol for current mode
 */
export const usePricingSymbol = () => {
  const { isGemsMode, fiatCurrency } = useUnifiedPricing();
  
  if (isGemsMode) return '💎';
  if (fiatCurrency === 'TRY') return '₺';
  if (fiatCurrency === 'EUR') return '€';
  return '$';
};

/**
 * Get currency label for current mode
 */
export const usePricingLabel = () => {
  const { isGemsMode, fiatCurrency } = useUnifiedPricing();
  
  if (isGemsMode) return 'Gems';
  return fiatCurrency;
};
