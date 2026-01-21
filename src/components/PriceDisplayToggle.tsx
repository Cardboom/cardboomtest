import { Button } from '@/components/ui/button';
import { useGems } from '@/contexts/GemsContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { DollarSign, Euro } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BoomCoinIcon } from '@/components/icons/BoomCoinIcon';

/**
 * Price Display Toggle
 * 
 * Global navigation toggle for price display:
 * - Coins: Always shows prices in Boom Coins (fixed, never changes)
 * - USD/EUR/TRY: Click to cycle through fiat currencies
 * 
 * Does NOT affect checkout rules - only display.
 */
export const PriceDisplayToggle = () => {
  const { displayMode, setDisplayMode } = useGems();
  const { currency, setCurrency } = useCurrency();

  // Cycle through fiat currencies when clicking the fiat button
  const cycleFiatCurrency = () => {
    // First ensure we're in USD mode
    if (displayMode !== 'usd') {
      setDisplayMode('usd');
    }
    // Then cycle through currencies
    if (currency === 'USD') setCurrency('EUR');
    else if (currency === 'EUR') setCurrency('TRY');
    else setCurrency('USD');
  };

  // Get current fiat display
  const getFiatIcon = () => {
    if (currency === 'EUR') return <Euro className="w-3.5 h-3.5" />;
    if (currency === 'TRY') return <span className="text-xs font-bold">₺</span>;
    return <DollarSign className="w-3.5 h-3.5" />;
  };

  const getFiatLabel = () => {
    return currency;
  };

  const isFiatMode = displayMode === 'usd';

  return (
    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 border border-border">
      {/* Coins Toggle - Fixed, always shows Boom Coins */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDisplayMode('gems')}
        className={cn(
          "h-7 px-2.5 gap-1.5 text-xs font-medium transition-all rounded-md",
          displayMode === 'gems' 
            ? "bg-primary/20 text-primary hover:bg-primary/30 hover:text-primary" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <BoomCoinIcon size="xs" />
        Coins
      </Button>
      
      {/* Fiat Toggle - Cycles through USD/EUR/TRY */}
      <Button
        variant="ghost"
        size="sm"
        onClick={cycleFiatCurrency}
        className={cn(
          "h-7 px-2.5 gap-1.5 text-xs font-medium transition-all rounded-md min-w-[60px]",
          isFiatMode 
            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:text-green-400" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        {getFiatIcon()}
        {getFiatLabel()}
      </Button>
    </div>
  );
};
