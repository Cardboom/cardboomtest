import { useState, useEffect, memo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface BackgroundRemovedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  enabled?: boolean;
}

// Persistent cache using localStorage
const CACHE_KEY = 'cardboom_bg_removed_cache';
const CACHE_VERSION = 1;
const MAX_CACHE_SIZE = 100;

const getCache = (): Map<string, string> => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.version === CACHE_VERSION) {
        return new Map(parsed.data);
      }
    }
  } catch (e) {
    // Ignore cache errors
  }
  return new Map();
};

const saveCache = (cache: Map<string, string>) => {
  try {
    // Limit cache size
    const entries = Array.from(cache.entries());
    if (entries.length > MAX_CACHE_SIZE) {
      entries.splice(0, entries.length - MAX_CACHE_SIZE);
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      version: CACHE_VERSION,
      data: entries
    }));
  } catch (e) {
    // Ignore cache errors
  }
};

// In-memory cache initialized from localStorage
let processedImageCache: Map<string, string> | null = null;
const getProcessedCache = () => {
  if (!processedImageCache) {
    processedImageCache = getCache();
  }
  return processedImageCache;
};

const processingQueue = new Set<string>();
const failedUrls = new Set<string>();

export const BackgroundRemovedImage = memo(({ 
  src, 
  alt, 
  className,
  fallbackClassName,
  enabled = true 
}: BackgroundRemovedImageProps) => {
  const cache = getProcessedCache();
  const [displaySrc, setDisplaySrc] = useState<string>(() => {
    // Initialize with cached value if available
    if (enabled && src && cache.has(src)) {
      return cache.get(src)!;
    }
    return src;
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!enabled || !src) {
      setDisplaySrc(src);
      return;
    }

    // Check cache first
    if (cache.has(src)) {
      setDisplaySrc(cache.get(src)!);
      return;
    }

    // Skip if already failed
    if (failedUrls.has(src)) {
      setDisplaySrc(src);
      return;
    }

    // Check if already processing this URL
    if (processingQueue.has(src)) {
      // Wait for processing to complete
      const checkCache = setInterval(() => {
        if (cache.has(src)) {
          if (mountedRef.current) {
            setDisplaySrc(cache.get(src)!);
          }
          clearInterval(checkCache);
        } else if (failedUrls.has(src)) {
          if (mountedRef.current) {
            setDisplaySrc(src);
          }
          clearInterval(checkCache);
        }
      }, 500);
      
      return () => clearInterval(checkCache);
    }

    // Start processing
    const processImage = async () => {
      processingQueue.add(src);
      if (mountedRef.current) {
        setIsProcessing(true);
      }
      
      try {
        const { data, error } = await supabase.functions.invoke('remove-card-background', {
          body: { imageUrl: src }
        });
        
        if (error) throw error;
        
        const resultUrl = data?.processedImageUrl || src;
        cache.set(src, resultUrl);
        saveCache(cache);
        
        if (mountedRef.current) {
          setDisplaySrc(resultUrl);
        }
      } catch (err) {
        console.warn('Background removal failed, using original:', err);
        failedUrls.add(src);
        cache.set(src, src);
        saveCache(cache);
        if (mountedRef.current) {
          setDisplaySrc(src);
        }
      } finally {
        processingQueue.delete(src);
        if (mountedRef.current) {
          setIsProcessing(false);
        }
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
        isProcessing && "opacity-70"
      )}
      loading="lazy"
    />
  );
});

BackgroundRemovedImage.displayName = 'BackgroundRemovedImage';

export default BackgroundRemovedImage;
