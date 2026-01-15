import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PriceData {
  price: number;
  change: number;
  source: string;
  timestamp: string;
  updated?: boolean;
}

interface PriceContextType {
  prices: Record<string, PriceData>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  getPrice: (productId: string) => PriceData | null;
  refetch: () => Promise<void>;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

// Product ID to market_items name mapping
const productIdToMarketItem: Record<string, string> = {
  'tcg-charizard-1st': 'Charizard 1st Edition',
  'tcg-pikachu-illustrator': 'Pikachu Illustrator',
  'tcg-psa10-mewtwo': 'Mewtwo Rainbow',
  'tcg-black-lotus': 'Black Lotus',
  'mtg-mox-sapphire': 'Black Lotus',
  'yugioh-blue-eyes': 'Blue-Eyes White Dragon',
  'yugioh-dark-magician': 'Dark Magician',
  'nba-lebron-2003': 'LeBron James Rookie',
  'nba-jordan-fleer': 'Michael Jordan Fleer',
  'nba-luka-prizm': 'Luka Dončić Prizm',
  'football-mahomes-prizm': 'Patrick Mahomes Prizm',
  'football-brady-rookie': 'Tom Brady Contenders',
  'football-chase-auto': "Ja'Marr Chase Optic",
  'onepiece-luffy-alt': 'Monkey D. Luffy',
  'onepiece-shanks-manga': 'Shanks',
  'lorcana-elsa-enchanted': 'Elsa - Snow Queen',
  'lorcana-mickey-enchanted': 'Mickey Mouse',
  'figure-kaws-companion': 'KAWS Companion',
  'figure-bearbrick-1000': 'Bearbrick KAWS',
};

// Reverse mapping for real-time updates
const marketItemToProductId: Record<string, string> = Object.entries(productIdToMarketItem)
  .reduce((acc, [key, value]) => ({ ...acc, [value]: key }), {});

// All product IDs we want to track
const ALL_PRODUCT_IDS = Object.keys(productIdToMarketItem);

interface ExtendedPriceData extends PriceData {
  minPrice?: number;
  maxPrice?: number;
  liquidity?: string;
  salesCount?: number;
}

export const PriceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prices, setPrices] = useState<Record<string, ExtendedPriceData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const previousPrices = useRef<Record<string, number>>({});
  const fetchInProgress = useRef(false);
  const fetchCount = useRef(0);

  const fetchPrices = useCallback(async (retryCount = 0) => {
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;
    setIsLoading(true);
    
    // Don't clear error on retry, only on fresh fetch
    if (retryCount === 0) {
      setError(null);
    }

    fetchCount.current += 1;
    const maxRetries = 2;

    try {
      const { data, error: functionError } = await supabase.functions.invoke('fetch-prices', {
        body: { productIds: ALL_PRODUCT_IDS, source: 'all' }
      });

      if (functionError) {
        // Retry on transient errors
        if (retryCount < maxRetries && (functionError.message?.includes('500') || functionError.message?.includes('network') || functionError.message?.includes('timeout'))) {
          console.warn(`Retrying fetch-prices (attempt ${retryCount + 2}/${maxRetries + 1})...`);
          fetchInProgress.current = false;
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return fetchPrices(retryCount + 1);
        }
        throw new Error(functionError.message);
      }

      const newPrices: Record<string, PriceData> = {};
      
      for (const [id, priceData] of Object.entries(data?.prices || {})) {
        const typedData = priceData as PriceData;
        const previousPrice = previousPrices.current[id];
        const updated = previousPrice !== undefined && previousPrice !== typedData.price;
        
        newPrices[id] = {
          ...typedData,
          updated,
        };
        
        previousPrices.current[id] = typedData.price;
      }

      setPrices(newPrices);
      setLastUpdated(new Date());
      setError(null);

      // Clear the 'updated' flag after animation
      setTimeout(() => {
        setPrices(prev => {
          const cleared: Record<string, PriceData> = {};
          for (const [id, data] of Object.entries(prev)) {
            cleared[id] = { ...data, updated: false };
          }
          return cleared;
        });
      }, 500);

    } catch (err) {
      // Only log if this is the final attempt
      if (retryCount >= maxRetries) {
        console.error('Error fetching live prices:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch prices');
      }
    } finally {
      setIsLoading(false);
      fetchInProgress.current = false;
    }
  }, []);

  // Defer initial fetch to reduce critical path - 4 second delay
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPrices();
    }, 4000);
    
    // Start interval after initial fetch
    const interval = setInterval(fetchPrices, 10000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchPrices]);

  // Real-time subscription for market_items changes
  useEffect(() => {
    const channel = supabase
      .channel('market-prices-realtime-global')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'market_items',
        },
        (payload) => {
          const updatedItem = payload.new as { 
            name: string; 
            current_price: number; 
            change_24h: number;
          };
          
          const productId = marketItemToProductId[updatedItem.name];
          if (productId) {
            setPrices(prev => ({
              ...prev,
              [productId]: {
                price: Number(updatedItem.current_price),
                change: Number(updatedItem.change_24h) || 0,
                source: 'realtime',
                timestamp: new Date().toISOString(),
                updated: true,
              }
            }));
            setLastUpdated(new Date());

            // Clear updated flag
            setTimeout(() => {
              setPrices(prev => ({
                ...prev,
                [productId]: { ...prev[productId], updated: false }
              }));
            }, 500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getPrice = useCallback((productId: string) => {
    return prices[productId] || null;
  }, [prices]);

  const value = useMemo(() => ({
    prices,
    isLoading,
    error,
    lastUpdated,
    getPrice,
    refetch: fetchPrices,
  }), [prices, isLoading, error, lastUpdated, getPrice, fetchPrices]);

  return (
    <PriceContext.Provider value={value}>
      {children}
    </PriceContext.Provider>
  );
};

export const usePrices = () => {
  const context = useContext(PriceContext);
  if (!context) {
    throw new Error('usePrices must be used within a PriceProvider');
  }
  return context;
};
