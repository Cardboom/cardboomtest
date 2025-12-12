import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';

export const CurrencyToggle = () => {
  const { currency, setCurrency } = useCurrency();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setCurrency(currency === 'TRY' ? 'USD' : 'TRY')}
      className="text-muted-foreground hover:text-foreground font-medium px-2"
    >
      {currency === 'TRY' ? '₺ TRY' : '$ USD'}
    </Button>
  );
};
