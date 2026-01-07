import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface PriceChangeCellProps {
  value: number;
  isUpdated?: boolean;
  showIcon?: boolean;
  className?: string;
}

export const PriceChangeCell = ({ 
  value, 
  isUpdated = false, 
  showIcon = true,
  className 
}: PriceChangeCellProps) => {
  const isPositive = value >= 0;
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${value}-${isUpdated}`}
        initial={isUpdated ? { y: isPositive ? 10 : -10, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "font-medium tabular-nums",
          isPositive ? "text-gain" : "text-loss",
          isUpdated && "animate-[price-update_0.5s_ease-out]",
          className
        )}
      >
        <span>
          {isPositive ? '+' : ''}{value.toFixed(2)}%
        </span>
      </motion.div>
    </AnimatePresence>
  );
};
