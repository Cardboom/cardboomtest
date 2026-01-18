import { useSubscription } from '@/hooks/useSubscription';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface SellerFeeDisplayProps {
  userId?: string;
}

export const SellerFeeDisplay = ({ userId }: SellerFeeDisplayProps) => {
  const { subscription, loading, getFeeRates, isLite, isPro, isEnterprise } = useSubscription(userId);

  const { sellerFeeRate, sellerFeeRateOver } = getFeeRates();

  const getTierLabel = () => {
    if (isEnterprise) return 'Enterprise';
    if (isPro) return 'Pro';
    if (isLite) return 'Lite';
    return 'Free';
  };

  const feePercentUnder = (sellerFeeRate * 100).toFixed(sellerFeeRate * 100 % 1 === 0 ? 0 : 2);
  const feePercentOver = (sellerFeeRateOver * 100).toFixed(sellerFeeRateOver * 100 % 1 === 0 ? 0 : 2);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="px-4 py-2 rounded-lg bg-background/80 border border-border cursor-help">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Seller Fee
              <Info className="h-3 w-3" />
            </p>
            <p className="text-lg font-bold text-foreground">
              {loading ? '...' : `${feePercentUnder}%`}
            </p>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 text-sm">
            <p className="font-semibold">{getTierLabel()} Tier Fees</p>
            <div className="space-y-1 text-xs">
              <p>• Up to $7,500: <span className="font-medium">{feePercentUnder}%</span></p>
              <p>• Over $7,500: <span className="font-medium">{feePercentOver}%</span></p>
            </div>
            {!isPro && !isEnterprise && (
              <p className="text-primary text-xs mt-2">
                Upgrade to reduce fees →
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
