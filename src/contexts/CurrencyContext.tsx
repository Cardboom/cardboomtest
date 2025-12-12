import React, { createContext, useContext, useState, useEffect } from 'react';

type Currency = 'TRY' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (priceUSD: number) => string;
  convertToTRY: (priceUSD: number) => number;
  exchangeRate: number;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const DEFAULT_EXCHANGE_RATE = 42.62; // USD to TRY rate

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem('preferred-currency');
    return (saved as Currency) || 'TRY';
  });
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch live exchange rate on mount
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        // Try to fetch from a free exchange rate API
        const response = await fetch(
          'https://api.exchangerate-api.com/v4/latest/USD',
          { signal: AbortSignal.timeout(5000) }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.rates?.TRY) {
            setExchangeRate(data.rates.TRY);
            console.log('Exchange rate updated:', data.rates.TRY);
          }
        }
      } catch (error) {
        console.log('Using default exchange rate:', DEFAULT_EXCHANGE_RATE);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExchangeRate();
    
    // Refresh exchange rate every hour
    const interval = setInterval(fetchExchangeRate, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('preferred-currency', newCurrency);
  };

  const convertToTRY = (priceUSD: number) => {
    return priceUSD * exchangeRate;
  };

  const formatPrice = (priceUSD: number) => {
    if (currency === 'TRY') {
      const tryPrice = priceUSD * exchangeRate;
      return `₺${tryPrice.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `$${priceUSD.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency, 
      formatPrice, 
      convertToTRY,
      exchangeRate, 
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
