import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';

export const CurrencyToggle = () => {
  const { currency, setCurrency } = useCurrency();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setCurrency(currency === 'TRY' ? 'USD' : 'TRY')}
      className="text-muted-foreground hover:text-foreground font-bold h-8 w-8"
    >
      {currency === 'TRY' ? '₺' : '$'}
    </Button>
  );
};
