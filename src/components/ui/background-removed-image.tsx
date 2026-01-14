import { useState, useEffect, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface BackgroundRemovedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  enabled?: boolean;
}

// Simple in-memory cache for processed images during session
const processedImageCache = new Map<string, string>();
const processingQueue = new Set<string>();

export const BackgroundRemovedImage = memo(({ 
  src, 
  alt, 
  className,
  fallbackClassName,
  enabled = true 
}: BackgroundRemovedImageProps) => {
  const [displaySrc, setDisplaySrc] = useState<string>(src);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!enabled || !src) {
      setDisplaySrc(src);
      return;
    }

    // Check cache first
    const cached = processedImageCache.get(src);
    if (cached) {
      setDisplaySrc(cached);
      return;
    }

    // Check if already processing this URL
    if (processingQueue.has(src)) {
      // Wait for processing to complete
      const checkCache = setInterval(() => {
        const result = processedImageCache.get(src);
        if (result) {
          setDisplaySrc(result);
          clearInterval(checkCache);
        }
      }, 500);
      
      return () => clearInterval(checkCache);
    }

    // Start processing
    const processImage = async () => {
      processingQueue.add(src);
      setIsProcessing(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('remove-card-background', {
          body: { imageUrl: src }
        });
        
        if (error) throw error;
        
        if (data?.processedImageUrl) {
          processedImageCache.set(src, data.processedImageUrl);
          setDisplaySrc(data.processedImageUrl);
        }
      } catch (err) {
        // Silently fall back to original image
        console.warn('Background removal failed, using original:', err);
        processedImageCache.set(src, src); // Cache the original to prevent retries
        setDisplaySrc(src);
      } finally {
        processingQueue.delete(src);
        setIsProcessing(false);
      }
    };

    processImage();
  }, [src, enabled]);

  return (
    <img 
      src={displaySrc}
      alt={alt}
      className={cn(
        className,
        isProcessing && "opacity-80 animate-pulse"
      )}
      loading="lazy"
    />
  );
});

BackgroundRemovedImage.displayName = 'BackgroundRemovedImage';

export default BackgroundRemovedImage;
