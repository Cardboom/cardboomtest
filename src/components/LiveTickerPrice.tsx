import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

interface LiveTickerPriceProps {
  value: number;
  className?: string;
  tickInterval?: number;
  volatility?: number;
}

export const LiveTickerPrice = ({
  value,
  className,
  tickInterval = 2000,
  volatility = 0.002,
}: LiveTickerPriceProps) => {
  const { formatPrice } = useCurrency();
  const [displayValue, setDisplayValue] = useState(value);
  const [isFlashing, setIsFlashing] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const baseValue = useRef(value);
  const animationRef = useRef<number>();
  const intervalRef = useRef<NodeJS.Timeout>();

  // Update base value when prop changes
  useEffect(() => {
    baseValue.current = value;
    setDisplayValue(value);
  }, [value]);

  // Live ticking effect
  useEffect(() => {
    const tick = () => {
      const change = (Math.random() - 0.5) * 2 * volatility * baseValue.current;
      const newValue = displayValue + change;
      
      setDirection(change > 0 ? 'up' : 'down');
      setIsFlashing(true);
      
      // Animate to new value
      const startValue = displayValue;
      const endValue = newValue;
      const startTime = Date.now();
      const duration = 300;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = startValue + (endValue - startValue) * eased;
        
        setDisplayValue(current);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayValue(endValue);
          setTimeout(() => {
            setIsFlashing(false);
            setDirection(null);
          }, 200);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    };

    intervalRef.current = setInterval(tick, tickInterval + Math.random() * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [displayValue, tickInterval, volatility]);

  return (
    <span
      className={cn(
        'inline-block font-mono tabular-nums transition-colors duration-150',
        isFlashing && direction === 'up' && 'text-gain',
        isFlashing && direction === 'down' && 'text-loss',
        className
      )}
    >
      <span className={cn(
        'inline-block transition-transform duration-150',
        isFlashing && direction === 'up' && 'animate-[tick-up_0.15s_ease-out]',
        isFlashing && direction === 'down' && 'animate-[tick-down_0.15s_ease-out]'
      )}>
        {formatPrice(displayValue)}
      </span>
    </span>
  );
};