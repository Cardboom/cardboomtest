import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';

export const CurrencyToggle = () => {
  const { currency, setCurrency } = useCurrency();

  const cycleCurrency = () => {
    if (currency === 'USD') setCurrency('EUR');
    else if (currency === 'EUR') setCurrency('TRY');
    else setCurrency('USD');
  };

  const getSymbol = () => {
    if (currency === 'TRY') return '₺';
    if (currency === 'EUR') return '€';
    return '$';
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleCurrency}
      className="text-muted-foreground hover:text-foreground font-bold h-8 w-8"
    >
      {getSymbol()}
    </Button>
  );
};