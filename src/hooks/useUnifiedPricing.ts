import { useCallback, useMemo } from 'react';
import { useGems, PriceDisplayMode } from '@/contexts/GemsContext';
import { useCurrency, Currency } from '@/contexts/CurrencyContext';

/**
 * Unified Pricing Hook
 * 
 * Combines GemsContext and CurrencyContext for consistent pricing across the site.
 * 
 * Rules:
 * - Boom Coins are ALWAYS in fixed USD conversion (1 Boom Coin = $0.001 USD)
 * - When displayMode is 'gems': Show price in Boom Coins (USD × 1000)
 * - When displayMode is 'usd': Show price in selected fiat currency (USD/EUR/TRY)
 * - Turkish users see TRY equivalent with same markup as USD
 * 
 * UPDATED: 10x deflation - was $0.01/coin (100 per $1), now $0.001/coin (1000 per $1)
 */

export interface UnifiedPricingResult {
  /** Current display mode: 'gems' or 'usd' (fiat) */
  displayMode: PriceDisplayMode;
  /** Current fiat currency (only relevant when displayMode is 'usd') */
  fiatCurrency: Currency;
  /** Format a USD price respecting current display mode and currency */
  formatPrice: (priceUSD: number) => string;
  /** Format price with Boom Coins emoji if in coins mode */
  formatPriceWithSymbol: (priceUSD: number) => string;
  /** Format price in Boom Coins (always in USD base, for Turkish users shows TRY equivalent) */
  formatGemsPrice: (priceUSD: number, showTRYEquivalent?: boolean) => string;
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
  /** Get TRY equivalent for gems (for Turkish users) */
  getGemsTRYValue: (gems: number) => number;
}

export const useUnifiedPricing = (): UnifiedPricingResult => {
  const { 
    displayMode, 
    setDisplayMode,
    usdToGems, 
    gemsToUsd,
    formatGems,
    pricing,
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

  // Get TRY value for gems (with same markup applied)
  const getGemsTRYValue = useCallback((gems: number): number => {
    const usdValue = gemsToUsd(gems);
    const withMarkup = usdValue * pricing.markupMultiplier;
    return withMarkup * (exchangeRates.USD_TRY || 42);
  }, [gemsToUsd, pricing.markupMultiplier, exchangeRates.USD_TRY]);

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

  // Format coins price - always USD base, optionally show TRY equivalent
  const formatGemsPrice = useCallback((priceUSD: number, showTRYEquivalent = false): string => {
    const gems = usdToGems(priceUSD);
    const gemsStr = `${Math.round(gems).toLocaleString()} 💣`;
    
    if (showTRYEquivalent) {
      const tryValue = getGemsTRYValue(gems);
      return `${gemsStr} (≈ ₺${Math.round(tryValue).toLocaleString('tr-TR')})`;
    }
    
    return gemsStr;
  }, [usdToGems, getGemsTRYValue]);

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
    formatGemsPrice,
    usdToGems,
    gemsToUsd,
    getDisplayValue,
    isGemsMode,
    setDisplayMode,
    cycleFiatCurrency,
    setFiatCurrency,
    getGemsTRYValue,
  };
};

/**
 * Get currency symbol for current mode
 */
export const usePricingSymbol = () => {
  const { isGemsMode, fiatCurrency } = useUnifiedPricing();
  
  if (isGemsMode) return '💣';
  if (fiatCurrency === 'TRY') return '₺';
  if (fiatCurrency === 'EUR') return '€';
  return '$';
};

/**
 * Get currency label for current mode
 */
export const usePricingLabel = () => {
  const { isGemsMode, fiatCurrency } = useUnifiedPricing();
  
  if (isGemsMode) return 'Coins';
  return fiatCurrency;
};
