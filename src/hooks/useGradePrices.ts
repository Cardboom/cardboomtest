import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CardGrade = 'raw' | 'psa10' | 'psa9' | 'psa8' | 'psa7' | 'psa6' | 'bgs10' | 'bgs9_5' | 'cgc10';

export interface GradePriceData {
  grade: string;
  current_price: number;
  change_24h: number | null;
  change_7d: number | null;
  change_30d: number | null;
  last_sale_price: number | null;
  sales_count_30d: number | null;
  avg_days_to_sell: number | null;
}

interface UseGradePricesOptions {
  marketItemId: string;
  enabled?: boolean;
}

// Grade display labels
export const GRADE_LABELS: Record<string, string> = {
  raw: 'Raw',
  psa10: 'PSA 10',
  psa9: 'PSA 9',
  psa8: 'PSA 8',
  psa7: 'PSA 7',
  psa6: 'PSA 6',
  bgs10: 'BGS 10',
  bgs9_5: 'BGS 9.5',
  cgc10: 'CGC 10',
};

// Grade multipliers for estimating prices when grade-specific data isn't available
export const GRADE_MULTIPLIERS: Record<string, number> = {
  raw: 0.15,
  psa6: 0.25,
  psa7: 0.35,
  psa8: 0.50,
  psa9: 0.75,
  psa10: 1.0,
  bgs9_5: 0.90,
  bgs10: 1.20,
  cgc10: 0.95,
};

export const useGradePrices = ({ marketItemId, enabled = true }: UseGradePricesOptions) => {
  const [prices, setPrices] = useState<Record<string, GradePriceData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGradePrices = useCallback(async () => {
    if (!enabled || !marketItemId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('market_item_grades')
        .select('*')
        .eq('market_item_id', marketItemId);

      if (fetchError) throw fetchError;

      const priceMap: Record<string, GradePriceData> = {};
      data?.forEach((item) => {
        priceMap[item.grade] = {
          grade: item.grade,
          current_price: item.current_price,
          change_24h: item.change_24h,
          change_7d: item.change_7d,
          change_30d: item.change_30d,
          last_sale_price: item.last_sale_price,
          sales_count_30d: item.sales_count_30d,
          avg_days_to_sell: item.avg_days_to_sell,
        };
      });

      setPrices(priceMap);
    } catch (err) {
      console.error('Error fetching grade prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch grade prices');
    } finally {
      setIsLoading(false);
    }
  }, [marketItemId, enabled]);

  useEffect(() => {
    fetchGradePrices();
  }, [fetchGradePrices]);

  const getPriceForGrade = useCallback((grade: string, basePrice?: number): number | null => {
    // First check if we have actual grade-specific data
    if (prices[grade]) {
      return prices[grade].current_price;
    }

    // If we have a base price, estimate using multipliers
    if (basePrice) {
      const multiplier = GRADE_MULTIPLIERS[grade] || 1;
      return Math.round(basePrice * multiplier);
    }

    return null;
  }, [prices]);

  const getGradeData = useCallback((grade: string): GradePriceData | null => {
    return prices[grade] || null;
  }, [prices]);

  return {
    prices,
    isLoading,
    error,
    getPriceForGrade,
    getGradeData,
    refetch: fetchGradePrices,
  };
};

// Helper function to estimate price by grade without hook
export const estimatePriceByGrade = (basePrice: number, grade: string): number => {
  const multiplier = GRADE_MULTIPLIERS[grade] || 1;
  return Math.round(basePrice * multiplier);
};

// Format grade for display
export const formatGrade = (grade: string): string => {
  return GRADE_LABELS[grade] || grade.toUpperCase();
};
