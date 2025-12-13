import { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

interface AnimatedPriceProps {
  value: number;
  className?: string;
  showTrend?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AnimatedPrice = ({
  value,
  className,
  showTrend = true,
  size = 'md',
}: AnimatedPriceProps) => {
  const { formatPrice } = useCurrency();
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const prevValue = useRef(value);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (value !== prevValue.current && prevValue.current !== 0) {
      const startValue = prevValue.current;
      const endValue = value;
      const startTime = Date.now();
      const duration = 600;
      
      setDirection(value > prevValue.current ? 'up' : 'down');
      setIsAnimating(true);

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const eased = 1 - Math.pow(1 - progress, 4);
        const current = startValue + (endValue - startValue) * eased;
        
        setDisplayValue(current);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayValue(endValue);
          setTimeout(() => {
            setIsAnimating(false);
            setDirection(null);
          }, 400);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
      prevValue.current = value;
    } else {
      setDisplayValue(value);
      prevValue.current = value;
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value]);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold transition-all duration-300',
        sizeClasses[size],
        isAnimating && direction === 'up' && 'text-gain',
        isAnimating && direction === 'down' && 'text-loss',
        !isAnimating && 'text-foreground',
        isAnimating && 'scale-105',
        className
      )}
    >
      {formatPrice(displayValue)}
      {showTrend && isAnimating && direction === 'up' && (
        <TrendingUp className={cn(iconSize[size], 'animate-bounce text-gain')} />
      )}
      {showTrend && isAnimating && direction === 'down' && (
        <TrendingDown className={cn(iconSize[size], 'animate-bounce text-loss')} />
      )}
    </span>
  );
};
