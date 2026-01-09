import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
  formatFn?: (value: number) => string;
}

export const AnimatedCounter = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 800,
  className,
  formatFn,
}: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const prevValue = useRef(value);
  const animationRef = useRef<number>();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (value !== prevValue.current) {
      const startValue = prevValue.current;
      const endValue = value;
      const startTime = Date.now();
      
      setDirection(value > prevValue.current ? 'up' : 'down');
      setIsAnimating(true);

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function - easeOutExpo for snappy feel
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = startValue + (endValue - startValue) * eased;
        
        setDisplayValue(current);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayValue(endValue);
          timeoutRef.current = setTimeout(() => {
            setIsAnimating(false);
            setDirection(null);
          }, 300);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
      prevValue.current = value;
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, duration]);

  const formattedValue = formatFn 
    ? formatFn(displayValue)
    : displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  return (
    <span
      className={cn(
        'inline-flex items-center tabular-nums transition-all duration-300',
        isAnimating && direction === 'up' && 'text-gain',
        isAnimating && direction === 'down' && 'text-loss',
        isAnimating && 'animate-[price-update_0.5s_ease-out]',
        className
      )}
    >
      <span className="relative">
        {prefix}{formattedValue}{suffix}
      </span>
    </span>
  );
};
