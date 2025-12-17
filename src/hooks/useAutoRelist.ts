import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AutoRelistSettings {
  id: string;
  listingId: string;
  enabled: boolean;
  priceLadderEnabled: boolean;
  priceReductionPercent: number;
  reductionIntervalHours: number;
  minPrice: number | null;
  originalPrice: number;
  currentSuggestedPrice: number | null;
  daysUntilSuggest: number;
}

interface SuggestedPrice {
  price: number;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  basedOn: string;
}

export function useAutoRelist(listingId: string) {
  const [settings, setSettings] = useState<AutoRelistSettings | null>(null);
  const [suggestedPrice, setSuggestedPrice] = useState<SuggestedPrice | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('auto_relist_settings')
        .select('*')
        .eq('listing_id', listingId)
        .single();

      if (data) {
        setSettings({
          id: data.id,
          listingId: data.listing_id,
          enabled: data.enabled,
          priceLadderEnabled: data.price_ladder_enabled,
          priceReductionPercent: data.price_reduction_percent,
          reductionIntervalHours: data.reduction_interval_hours,
          minPrice: data.min_price,
          originalPrice: data.original_price,
          currentSuggestedPrice: data.current_suggested_price,
          daysUntilSuggest: data.days_until_suggest
        });
      }
    } catch (error) {
      // No settings exist yet
    }
  }, [listingId]);

  const calculateSuggestedPrice = useCallback(async (currentPrice: number, category: string) => {
    try {
      // Get recent sold comps
      const { data: recentSales } = await supabase
        .from('orders')
        .select('price, created_at')
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentSales && recentSales.length >= 5) {
        // Calculate trimmed mean (drop top/bottom 10%)
        const prices = recentSales.map(s => s.price).sort((a, b) => a - b);
        const trimCount = Math.floor(prices.length * 0.1);
        const trimmedPrices = prices.slice(trimCount, prices.length - trimCount);
        const avgPrice = trimmedPrices.reduce((a, b) => a + b, 0) / trimmedPrices.length;

        // Suggest slightly below average for faster sale
        const suggested = Math.round(avgPrice * 0.95 * 100) / 100;

        setSuggestedPrice({
          price: suggested,
          reason: currentPrice > suggested 
            ? `Your price is ${Math.round((currentPrice - suggested) / suggested * 100)}% above recent comps`
            : 'Your price is competitive',
          confidence: recentSales.length >= 10 ? 'high' : 'medium',
          basedOn: `${recentSales.length} recent sales`
        });
      } else {
        // Not enough data - suggest small reduction
        const suggested = Math.round(currentPrice * 0.95 * 100) / 100;
        setSuggestedPrice({
          price: suggested,
          reason: 'Limited market data - suggesting 5% reduction',
          confidence: 'low',
          basedOn: 'Limited sales data'
        });
      }
    } catch (error) {
      console.error('Error calculating suggested price:', error);
    }
  }, []);

  const enableAutoRelist = useCallback(async (
    sellerId: string,
    originalPrice: number,
    options: {
      priceLadderEnabled?: boolean;
      priceReductionPercent?: number;
      reductionIntervalHours?: number;
      minPrice?: number;
      daysUntilSuggest?: number;
    } = {}
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('auto_relist_settings')
        .upsert({
          listing_id: listingId,
          seller_id: sellerId,
          enabled: true,
          original_price: originalPrice,
          price_ladder_enabled: options.priceLadderEnabled ?? false,
          price_reduction_percent: options.priceReductionPercent ?? 2,
          reduction_interval_hours: options.reductionIntervalHours ?? 48,
          min_price: options.minPrice,
          days_until_suggest: options.daysUntilSuggest ?? 7,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'listing_id'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Auto-relist enabled');
      await fetchSettings();
    } catch (error) {
      console.error('Error enabling auto-relist:', error);
      toast.error('Failed to enable auto-relist');
    } finally {
      setIsLoading(false);
    }
  }, [listingId, fetchSettings]);

  const disableAutoRelist = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase
        .from('auto_relist_settings')
        .update({ enabled: false, price_ladder_enabled: false })
        .eq('listing_id', listingId);

      toast.success('Auto-relist disabled');
      await fetchSettings();
    } catch (error) {
      console.error('Error disabling auto-relist:', error);
      toast.error('Failed to disable auto-relist');
    } finally {
      setIsLoading(false);
    }
  }, [listingId, fetchSettings]);

  const applyPriceReduction = useCallback(async (newPrice: number) => {
    setIsLoading(true);
    try {
      // Update listing price
      await supabase
        .from('listings')
        .update({ price: newPrice, updated_at: new Date().toISOString() })
        .eq('id', listingId);

      // Update auto-relist settings
      await supabase
        .from('auto_relist_settings')
        .update({ 
          current_suggested_price: null,
          last_reduction_at: new Date().toISOString()
        })
        .eq('listing_id', listingId);

      toast.success('Price updated');
      await fetchSettings();
    } catch (error) {
      console.error('Error applying price reduction:', error);
      toast.error('Failed to update price');
    } finally {
      setIsLoading(false);
    }
  }, [listingId, fetchSettings]);

  return {
    settings,
    suggestedPrice,
    isLoading,
    fetchSettings,
    calculateSuggestedPrice,
    enableAutoRelist,
    disableAutoRelist,
    applyPriceReduction
  };
}
