import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

type NormalizedImageType = 'SLAB' | 'RAW' | null;

interface CardMediaNormalizedProps {
  /** Primary image URL - normalized image */
  normalizedImageUrl?: string | null;
  /** Fallback original image URL */
  imageUrl?: string | null;
  /** Image type for aspect ratio selection */
  imageType?: NormalizedImageType;
  /** Alt text for accessibility */
  alt: string;
  /** Optional grade to display as chip */
  grade?: string | null;
  /** Grading company (PSA, BGS, CGC, etc.) */
  gradingCompany?: string | null;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Priority loading (above fold) */
  priority?: boolean;
  /** Show skeleton while loading */
  showSkeleton?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Disable hover effects */
  disableHover?: boolean;
}

/**
 * CardMediaNormalized - Universal card image component
 * 
 * Features:
 * - Automatic aspect ratio based on image type (SLAB: 3:4, RAW: 5:7)
 * - Normalized image with fallback to original
 * - Premium styling with shadows, rounded corners, hover effects
 * - Grade chip overlay (positioned to not cover slab label)
 * - Skeleton loading state
 */
export const CardMediaNormalized: React.FC<CardMediaNormalizedProps> = ({
  normalizedImageUrl,
  imageUrl,
  imageType,
  alt,
  grade,
  gradingCompany,
  className,
  onClick,
  priority = false,
  showSkeleton = true,
  size = 'md',
  disableHover = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Determine the best available image source
  const imageSrc = normalizedImageUrl || imageUrl || null;

  useEffect(() => {
    if (imageSrc !== currentSrc) {
      setCurrentSrc(imageSrc);
      setIsLoading(true);
      setHasError(false);
    }
  }, [imageSrc, currentSrc]);

  // Determine aspect ratio based on image type
  // SLAB: 3:4 (0.75) - accommodates label at top
  // RAW: 5:7 (0.714) - standard card proportions
  const getAspectRatio = () => {
    if (imageType === 'SLAB') return '3 / 4';
    if (imageType === 'RAW') return '5 / 7';
    // Default to 5:7 for unknown types
    return '5 / 7';
  };

  // Size-based dimensions
  const sizeClasses = {
    sm: 'w-16',
    md: 'w-32',
    lg: 'w-48',
    xl: 'w-64',
  };

  // Grade badge color based on grading company
  const getGradeBadgeVariant = () => {
    if (!gradingCompany) return 'secondary';
    const company = gradingCompany.toLowerCase();
    if (company.includes('psa')) return 'destructive'; // Red for PSA
    if (company.includes('bgs') || company.includes('beckett')) return 'default'; // Dark for BGS
    if (company.includes('cgc')) return 'secondary'; // Gray for CGC
    return 'outline';
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    // Try fallback if normalized failed
    if (currentSrc === normalizedImageUrl && imageUrl && imageUrl !== normalizedImageUrl) {
      setCurrentSrc(imageUrl);
      setIsLoading(true);
    } else {
      setHasError(true);
    }
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'rounded-[14px]',
        'border border-border/50',
        'shadow-md',
        'bg-muted/30',
        'transition-all duration-300 ease-out',
        !disableHover && 'hover:shadow-xl hover:-translate-y-1 hover:border-border',
        onClick && 'cursor-pointer',
        sizeClasses[size],
        className
      )}
      style={{ aspectRatio: getAspectRatio() }}
      onClick={onClick}
    >
      {/* Skeleton loader */}
      {showSkeleton && isLoading && (
        <div className="absolute inset-0 overflow-hidden">
          <Skeleton className="w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="text-muted-foreground text-xs text-center p-2">
            <svg
              className="w-8 h-8 mx-auto mb-1 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            No image
          </div>
        </div>
      )}

      {/* Image */}
      {currentSrc && !hasError && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full object-cover object-center',
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
        />
      )}

      {/* Grade chip - positioned at bottom right for slabs, bottom center for raw */}
      {grade && !isLoading && !hasError && (
        <div
          className={cn(
            'absolute',
            imageType === 'SLAB' ? 'bottom-2 right-2' : 'bottom-2 left-1/2 -translate-x-1/2'
          )}
        >
          <Badge
            variant={getGradeBadgeVariant()}
            className="text-xs font-bold px-2 py-0.5 shadow-lg backdrop-blur-sm"
          >
            {gradingCompany ? `${gradingCompany} ` : ''}{grade}
          </Badge>
        </div>
      )}

      {/* Image type indicator (dev mode only) */}
      {import.meta.env.DEV && imageType && (
        <div className="absolute top-1 left-1">
          <Badge variant="outline" className="text-[10px] opacity-50 bg-background/80">
            {imageType}
          </Badge>
        </div>
      )}
    </div>
  );
};

export default CardMediaNormalized;