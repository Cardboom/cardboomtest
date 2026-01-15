import { useState, useEffect, useRef, ReactNode } from 'react';

interface LazyPanelProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  minHeight?: string;
}

/**
 * Lazy loading wrapper that only renders children when the element
 * becomes visible in the viewport. Helps reduce initial page load
 * by deferring non-critical content.
 */
export const LazyPanel = ({ 
  children, 
  fallback = null,
  rootMargin = '200px',
  minHeight = '200px'
}: LazyPanelProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} style={{ minHeight: isVisible ? 'auto' : minHeight }}>
      {isVisible ? children : fallback}
    </div>
  );
};
