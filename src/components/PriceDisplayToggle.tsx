import { Button } from '@/components/ui/button';
import { useGems } from '@/contexts/GemsContext';
import { Gem, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Price Display Toggle
 * 
 * Allows users to switch between Gems and USD display modes
 * for marketplace prices. Does NOT affect checkout rules.
 */
export const PriceDisplayToggle = () => {
  const { displayMode, setDisplayMode } = useGems();

  return (
    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 border border-border">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDisplayMode('gems')}
        className={cn(
          "h-7 px-2.5 gap-1.5 text-xs font-medium transition-all rounded-md",
          displayMode === 'gems' 
            ? "bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:text-sky-400" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <Gem className="w-3.5 h-3.5" />
        Gems
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDisplayMode('usd')}
        className={cn(
          "h-7 px-2.5 gap-1.5 text-xs font-medium transition-all rounded-md",
          displayMode === 'usd' 
            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:text-green-400" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <DollarSign className="w-3.5 h-3.5" />
        USD
      </Button>
    </div>
  );
};
