import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PriceData {
  price: number;
  change: number;
  source: string;
  timestamp: string;
  updated?: boolean;
}

interface UseRealtimePricesOptions {
  productIds: string[];
  refreshInterval?: number;
  enabled?: boolean;
}

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

export const useRealtimePrices = ({ 
  productIds, 
  refreshInterval = 3000, 
  enabled = true 
}: UseRealtimePricesOptions) => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const previousPrices = useRef<Record<string, number>>({});

  const fetchPrices = useCallback(async () => {
    if (!enabled || productIds.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('fetch-prices', {
        body: { productIds, source: 'all' }
      });

      if (functionError) throw new Error(functionError.message);

      const newPrices: Record<string, PriceData> = {};
      
      for (const [id, priceData] of Object.entries(data.prices)) {
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
      console.error('Error fetching live prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      setIsLoading(false);
    }
  }, [productIds, enabled]);

  // Initial fetch and interval
  useEffect(() => {
    fetchPrices();
    
    if (!enabled || refreshInterval <= 0) return;

    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPrices, refreshInterval, enabled]);

  // Real-time subscription for market_items changes
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('market-prices-realtime')
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
          if (productId && productIds.includes(productId)) {
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
  }, [enabled, productIds]);

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
