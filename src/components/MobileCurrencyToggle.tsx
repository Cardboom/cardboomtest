import { Button } from '@/components/ui/button';
import { useGems } from '@/contexts/GemsContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { DollarSign, Euro } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BoomCoinIcon } from '@/components/icons/BoomCoinIcon';

/**
 * Compact Mobile Currency Toggle
 * Small toggle for mobile header - cycles between Coins and current fiat
 */
export const MobileCurrencyToggle = () => {
  const { displayMode, setDisplayMode } = useGems();
  const { currency, setCurrency } = useCurrency();

  const handleToggle = () => {
    if (displayMode === 'gems') {
      // Switch to fiat
      setDisplayMode('usd');
    } else {
      // Cycle fiat currencies or switch to coins
      if (currency === 'USD') setCurrency('EUR');
      else if (currency === 'EUR') setCurrency('TRY');
      else {
        setCurrency('USD');
        setDisplayMode('gems');
      }
    }
  };

  const getCurrentIcon = () => {
    if (displayMode === 'gems') {
      return <BoomCoinIcon size="xs" />;
    }
    if (currency === 'EUR') return <Euro className="w-3.5 h-3.5" />;
    if (currency === 'TRY') return <span className="text-[10px] font-bold">₺</span>;
    return <DollarSign className="w-3.5 h-3.5" />;
  };

  const getCurrentLabel = () => {
    if (displayMode === 'gems') return '';
    return currency;
  };

  const isCoins = displayMode === 'gems';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className={cn(
        "h-8 px-2 gap-1 text-xs font-medium transition-all rounded-lg",
        isCoins 
          ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" 
          : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
      )}
    >
      {getCurrentIcon()}
      {getCurrentLabel()}
    </Button>
  );
};
