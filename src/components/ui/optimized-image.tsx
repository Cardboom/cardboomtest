/**
 * OptimizedImage Component
 * 
 * Resilient image component with:
 * - Lazy loading
 * - Skeleton placeholders
 * - Error fallback
 * - Aspect ratio boxes (prevents layout shift)
 * - Automatic retry on failure
 * - Error reporting
 */

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { errorReporter } from '@/services/errorReporter';
import { ImageOff, RefreshCw } from 'lucide-react';

export interface OptimizedImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  aspectRatio?: 'square' | '4/3' | '16/9' | '3/4' | 'auto';
  fallbackSrc?: string;
  placeholderText?: string;
  itemId?: string;
  itemName?: string;
  category?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  /** Explicit width for layout stability */
  width?: number;
  /** Explicit height for layout stability */
  height?: number;
}

// Use a transparent pixel as absolute last resort - prefer official images from sync
const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560"%3E%3Crect fill="%23374151" width="400" height="560"/%3E%3Ctext x="200" y="280" text-anchor="middle" fill="%239CA3AF" font-family="system-ui" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  aspectRatio = 'square',
  fallbackSrc = FALLBACK_IMAGE,
  placeholderText,
  itemId,
  itemName,
  category,
  priority = false,
  onLoad,
  onError,
  width,
  height,
}) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState(src);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [isVisible, setIsVisible] = useState(priority);

  // Aspect ratio classes
  const aspectClasses: Record<string, string> = {
    'square': 'aspect-square',
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-video',
    '3/4': 'aspect-[3/4]',
    'auto': '',
  };

  // Set up lazy loading observer
  useEffect(() => {
    if (priority || !imgRef.current) {
      setIsVisible(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '100px',
        threshold: 0.01,
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority]);

  // Reset state when src changes
  useEffect(() => {
    if (src !== currentSrc) {
      setCurrentSrc(src);
      setStatus('loading');
      setRetryCount(0);
    }
  }, [src]);

  // Handle image load
  const handleLoad = () => {
    setStatus('loaded');
    onLoad?.();
  };

  // Handle image error with retry logic
  const handleError = () => {
    if (retryCount < MAX_RETRIES && currentSrc && currentSrc !== fallbackSrc) {
      // Retry with a delay
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        // Force re-render by changing src slightly
        setCurrentSrc(`${currentSrc}${currentSrc.includes('?') ? '&' : '?'}retry=${retryCount + 1}`);
      }, RETRY_DELAY * (retryCount + 1));
      return;
    }

    // Log error
    if (currentSrc && currentSrc !== fallbackSrc) {
      errorReporter.logImageError(currentSrc, itemId, itemName);
    }

    // Use fallback
    if (currentSrc !== fallbackSrc && fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setRetryCount(0);
    } else {
      setStatus('error');
      onError?.();
    }
  };

  // Manual retry handler
  const handleRetry = () => {
    if (src) {
      setCurrentSrc(src);
      setStatus('loading');
      setRetryCount(0);
    }
  };

  // Determine if we should use a generated placeholder
  const showGeneratedPlaceholder = status === 'error' || !currentSrc;

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden bg-muted',
        aspectClasses[aspectRatio],
        className
      )}
    >
      {/* Loading skeleton */}
      {status === 'loading' && isVisible && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted-foreground/10 to-muted" />
      )}

      {/* Actual image */}
      {isVisible && currentSrc && !showGeneratedPlaceholder && (
        <img
          src={currentSrc}
          alt={alt}
          width={width || 400}
          height={height || (aspectRatio === '3/4' ? 533 : aspectRatio === '4/3' ? 300 : aspectRatio === '16/9' ? 225 : 400)}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          )}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* Error/Placeholder state */}
      {showGeneratedPlaceholder && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-secondary to-muted text-muted-foreground p-4">
          {status === 'error' ? (
            <>
              <ImageOff className="w-8 h-8 mb-2 opacity-50" />
              {src && (
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              )}
            </>
          ) : (
            <div className="text-center">
              <div className="text-4xl mb-2 opacity-30">🃏</div>
              {placeholderText && (
                <p className="text-xs font-medium truncate max-w-full">
                  {placeholderText}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Category badge for placeholder */}
      {showGeneratedPlaceholder && category && (
        <div className="absolute top-2 left-2 px-2 py-0.5 text-xs font-medium bg-background/80 rounded backdrop-blur-sm">
          {category}
        </div>
      )}
    </div>
  );
};

/**
 * Preload an image
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload: ${src}`));
    img.src = src;
  });
}

/**
 * Check if image URL is valid/loadable
 */
export async function isImageValid(src: string): Promise<boolean> {
  try {
    await preloadImage(src);
    return true;
  } catch {
    return false;
  }
}

export default OptimizedImage;
