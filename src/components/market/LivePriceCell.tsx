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
        initial={isUpdated ? { y: priceIncreased ? 10 : priceDecreased ? -10 : 0, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "font-semibold tabular-nums transition-colors duration-300",
          isUpdated && priceIncreased && "text-gain",
          isUpdated && priceDecreased && "text-loss",
          !isUpdated && "text-foreground",
          className
        )}
      >
        {formatPrice(price)}
      </motion.div>
    </AnimatePresence>
  );
};
