import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Currency = 'TRY' | 'USD' | 'EUR';

interface ExchangeRates {
  USD_TRY: number;
  USD_EUR: number;
  EUR_TRY: number;
}

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (priceUSD: number) => string;
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
};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem('preferred-currency');
    return (saved as Currency) || 'USD';
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
          setExchangeRates(rates);
        }
      } catch (error) {
        console.log('Using default exchange rates');
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
    localStorage.setItem('preferred-currency', newCurrency);
  };

  const convertToTRY = (priceUSD: number) => {
    return priceUSD * exchangeRates.USD_TRY;
  };

  const convertToEUR = (priceUSD: number) => {
    return priceUSD * exchangeRates.USD_EUR;
  };

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

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency, 
      formatPrice, 
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