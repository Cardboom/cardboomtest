import { ReactNode } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { cn } from '@/lib/utils';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale';
  duration?: number;
}

export const ScrollReveal = ({ 
  children, 
  className,
  delay = 0,
  direction = 'up',
  duration = 600
}: ScrollRevealProps) => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  const getTransform = () => {
    switch (direction) {
      case 'up': return 'translateY(40px)';
      case 'down': return 'translateY(-40px)';
      case 'left': return 'translateX(40px)';
      case 'right': return 'translateX(-40px)';
      case 'scale': return 'scale(0.95)';
      default: return 'translateY(40px)';
    }
  };

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0) translateX(0) scale(1)' : getTransform(),
        transition: `opacity ${duration}ms ease-out ${delay}ms, transform ${duration}ms ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

// Staggered reveal for lists
interface StaggeredRevealProps {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale';
}

export const StaggeredReveal = ({ 
  children, 
  className,
  staggerDelay = 100,
  direction = 'up'
}: StaggeredRevealProps) => {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <ScrollReveal key={index} delay={index * staggerDelay} direction={direction}>
          {child}
        </ScrollReveal>
      ))}
    </div>
  );
};
