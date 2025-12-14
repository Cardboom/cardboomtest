import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
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
        initial={isUpdated ? { scale: 1.2, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "flex items-center gap-1 font-medium",
          isPositive ? "text-gain" : "text-loss",
          isUpdated && "animate-pulse",
          className
        )}
      >
        {showIcon && (
          isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )
        )}
        <span>
          {isPositive ? '+' : ''}{value.toFixed(2)}%
        </span>
      </motion.div>
    </AnimatePresence>
  );
};
