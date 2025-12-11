import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PriceData {
  price: number;
  change: number;
  source: string;
  timestamp: string;
}

interface PricesResponse {
  prices: Record<string, PriceData>;
  timestamp: string;
}

interface UseLivePricesOptions {
  productIds: string[];
  refreshInterval?: number; // ms
  enabled?: boolean;
}

export const useLivePrices = ({ productIds, refreshInterval = 30000, enabled = true }: UseLivePricesOptions) => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPrices = useCallback(async () => {
    if (!enabled || productIds.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('fetch-prices', {
        body: { productIds, source: 'all' }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      const response = data as PricesResponse;
      setPrices(response.prices);
      setLastUpdated(new Date(response.timestamp));
    } catch (err) {
      console.error('Error fetching live prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      setIsLoading(false);
    }
  }, [productIds, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Refresh interval
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPrices, refreshInterval, enabled]);

  const getPrice = useCallback((productId: string) => {
    return prices[productId] || null;
  }, [prices]);

  return {
    prices,
    isLoading,
    error,
    lastUpdated,
    getPrice,
    refetch: fetchPrices,
  };
};