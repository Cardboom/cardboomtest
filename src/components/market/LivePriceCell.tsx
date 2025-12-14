import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';

interface LivePriceCellProps {
  price: number;
  previousPrice?: number;
  isUpdated?: boolean;
  className?: string;
}

export const LivePriceCell = ({ 
  price, 
  previousPrice,
  isUpdated = false, 
  className 
}: LivePriceCellProps) => {
  const { formatPrice } = useCurrency();
  const priceIncreased = previousPrice !== undefined && price > previousPrice;
  const priceDecreased = previousPrice !== undefined && price < previousPrice;
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${price}-${isUpdated}`}
        initial={isUpdated ? { scale: 1.1, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "font-semibold transition-colors duration-300",
          isUpdated && priceIncreased && "text-gain bg-gain/10 px-2 py-0.5 rounded",
          isUpdated && priceDecreased && "text-loss bg-loss/10 px-2 py-0.5 rounded",
          !isUpdated && "text-foreground",
          className
        )}
      >
        {formatPrice(price)}
      </motion.div>
    </AnimatePresence>
  );
};
