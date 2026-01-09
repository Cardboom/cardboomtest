import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Currency = 'TRY' | 'USD' | 'EUR';

interface ExchangeRates {
  USD_TRY: number;
  USD_EUR: number;
  EUR_TRY: number;
  TRY_USD: number;
  TRY_EUR: number;
  EUR_USD: number;
}

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (priceUSD: number) => string;
  formatPriceInCurrency: (amount: number, fromCurrency: Currency) => string;
  convertToUSD: (amount: number, fromCurrency: Currency) => number;
  convertFromUSD: (amountUSD: number, toCurrency: Currency) => number;
  convertCurrency: (amount: number, from: Currency, to: Currency) => number;
  convertToTRY: (priceUSD: number) => number;
  convertToEUR: (priceUSD: number) => number;
  exchangeRates: ExchangeRates;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const DEFAULT_RATES: ExchangeRates = {
  USD_TRY: 42.62,
  USD_EUR: 0.92,
  EUR_TRY: 46.32,
  TRY_USD: 1 / 42.62,
  TRY_EUR: 1 / 46.32,
  EUR_USD: 1 / 0.92,
};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    try {
      const saved = localStorage.getItem('preferred-currency');
      return (saved as Currency) || 'USD';
    } catch {
      return 'USD';
    }
  });
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_RATES);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch exchange rates from database (which may have manual overrides)
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const { data, error } = await supabase
          .from('currency_rates')
          .select('from_currency, to_currency, rate');

        if (!error && data) {
          const rates = { ...DEFAULT_RATES };
          data.forEach((row: { from_currency: string; to_currency: string; rate: number }) => {
            const key = `${row.from_currency}_${row.to_currency}` as keyof ExchangeRates;
            if (key in rates) {
              rates[key] = Number(row.rate);
            }
          });
          // Calculate inverse rates
          rates.TRY_USD = 1 / rates.USD_TRY;
          rates.TRY_EUR = 1 / rates.EUR_TRY;
          rates.EUR_USD = 1 / rates.USD_EUR;
          setExchangeRates(rates);
        }
      } catch {
        // Fallback to default rates silently
      } finally {
        setIsLoading(false);
      }
    };

    fetchExchangeRates();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('currency-rates-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'currency_rates' },
        () => fetchExchangeRates()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    try {
      localStorage.setItem('preferred-currency', newCurrency);
    } catch {
      // Silent fail for private browsing
    }
  };

  // Convert any currency to USD
  const convertToUSD = (amount: number, fromCurrency: Currency): number => {
    if (fromCurrency === 'USD') return amount;
    if (fromCurrency === 'TRY') return amount * exchangeRates.TRY_USD;
    if (fromCurrency === 'EUR') return amount * exchangeRates.EUR_USD;
    return amount;
  };

  // Convert USD to any currency
  const convertFromUSD = (amountUSD: number, toCurrency: Currency): number => {
    if (toCurrency === 'USD') return amountUSD;
    if (toCurrency === 'TRY') return amountUSD * exchangeRates.USD_TRY;
    if (toCurrency === 'EUR') return amountUSD * exchangeRates.USD_EUR;
    return amountUSD;
  };

  // Convert between any two currencies
  const convertCurrency = (amount: number, from: Currency, to: Currency): number => {
    if (from === to) return amount;
    const amountInUSD = convertToUSD(amount, from);
    return convertFromUSD(amountInUSD, to);
  };

  const convertToTRY = (priceUSD: number) => {
    return priceUSD * exchangeRates.USD_TRY;
  };

  const convertToEUR = (priceUSD: number) => {
    return priceUSD * exchangeRates.USD_EUR;
  };

  // Format price that's already in USD to user's preferred currency
  const formatPrice = (priceUSD: number) => {
    if (currency === 'TRY') {
      const tryPrice = priceUSD * exchangeRates.USD_TRY;
      return `₺${tryPrice.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    if (currency === 'EUR') {
      const eurPrice = priceUSD * exchangeRates.USD_EUR;
      return `€${eurPrice.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `$${priceUSD.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Format a price that's in a specific currency to user's preferred display currency
  const formatPriceInCurrency = (amount: number, fromCurrency: Currency): string => {
    // First convert to USD (our base)
    const amountInUSD = convertToUSD(amount, fromCurrency);
    // Then format using user's preferred currency
    return formatPrice(amountInUSD);
  };

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency, 
      formatPrice,
      formatPriceInCurrency,
      convertToUSD,
      convertFromUSD,
      convertCurrency,
      convertToTRY,
      convertToEUR,
      exchangeRates, 
      isLoading 
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};