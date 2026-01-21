import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GradingSpeedTier {
  price: number;
  daysMin: number;
  daysMax: number;
}

export interface GradingPricing {
  standard: GradingSpeedTier;
  express: GradingSpeedTier;
  priority: GradingSpeedTier;
  referralCommissionRate: number;
  creatorRevenueShare: number;
  launchDiscount: number; // 0-1 (e.g., 0.5 = 50% off)
  launchDiscountEndsAt: string | null;
  isLoading: boolean;
}

// Default fallback values - 50% launch discount active for 1st year
const LAUNCH_END_DATE = '2027-01-21T00:00:00Z'; // 1 year from launch

const DEFAULT_PRICING: Omit<GradingPricing, 'isLoading'> = {
  standard: { price: 18, daysMin: 20, daysMax: 25 },
  express: { price: 35, daysMin: 7, daysMax: 10 },
  priority: { price: 75, daysMin: 2, daysMax: 3 },
  referralCommissionRate: 0.10,
  creatorRevenueShare: 0.15,
  launchDiscount: 0.50, // 50% off for launch
  launchDiscountEndsAt: LAUNCH_END_DATE,
};

export function useGradingPricing(): GradingPricing {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['grading-pricing-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', [
          'grading_price_standard',
          'grading_price_express',
          'grading_price_priority',
          'grading_days_standard_min',
          'grading_days_standard_max',
          'grading_days_express_min',
          'grading_days_express_max',
          'grading_days_priority_min',
          'grading_days_priority_max',
          'grading_referral_commission_rate',
          'grading_creator_revenue_share'
        ]);
      
      if (error) {
        console.error('Error fetching grading pricing:', error);
        return null;
      }
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  if (!settings || isLoading) {
    return { ...DEFAULT_PRICING, isLoading };
  }

  const getValue = (key: string, defaultVal: number): number => {
    const setting = settings.find(s => s.key === key);
    if (!setting) return defaultVal;
    const val = typeof setting.value === 'string' ? setting.value.replace(/"/g, '') : String(setting.value);
    return parseFloat(val) || defaultVal;
  };

  // Check if launch discount is still active
  const launchDiscountEndsAt = DEFAULT_PRICING.launchDiscountEndsAt;
  const isLaunchActive = launchDiscountEndsAt ? new Date() < new Date(launchDiscountEndsAt) : false;
  const launchDiscount = isLaunchActive ? DEFAULT_PRICING.launchDiscount : 0;

  return {
    standard: {
      price: getValue('grading_price_standard', DEFAULT_PRICING.standard.price),
      daysMin: getValue('grading_days_standard_min', DEFAULT_PRICING.standard.daysMin),
      daysMax: getValue('grading_days_standard_max', DEFAULT_PRICING.standard.daysMax),
    },
    express: {
      price: getValue('grading_price_express', DEFAULT_PRICING.express.price),
      daysMin: getValue('grading_days_express_min', DEFAULT_PRICING.express.daysMin),
      daysMax: getValue('grading_days_express_max', DEFAULT_PRICING.express.daysMax),
    },
    priority: {
      price: getValue('grading_price_priority', DEFAULT_PRICING.priority.price),
      daysMin: getValue('grading_days_priority_min', DEFAULT_PRICING.priority.daysMin),
      daysMax: getValue('grading_days_priority_max', DEFAULT_PRICING.priority.daysMax),
    },
    referralCommissionRate: getValue('grading_referral_commission_rate', DEFAULT_PRICING.referralCommissionRate),
    creatorRevenueShare: getValue('grading_creator_revenue_share', DEFAULT_PRICING.creatorRevenueShare),
    launchDiscount,
    launchDiscountEndsAt,
    isLoading,
  };
}

// Export for static usage where hooks can't be used
export const GRADING_SPEED_TIERS_DEFAULT = {
  standard: DEFAULT_PRICING.standard,
  express: DEFAULT_PRICING.express,
  priority: DEFAULT_PRICING.priority,
};

export const GRADING_PRICE_USD_DEFAULT = DEFAULT_PRICING.standard.price;
