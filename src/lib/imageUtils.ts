/**
 * Image optimization utilities for responsive image loading
 * Uses Supabase Storage image transformations for thumbnails
 * Keeps full quality for detail pages
 */

const SUPABASE_STORAGE_URL = 'kgffwhyfgkqeevsuhldt.supabase.co/storage/v1/object/public';

/**
 * Get optimized image URL for thumbnails (smaller size)
 * Only transforms Supabase storage URLs - external URLs pass through unchanged
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'origin';
  } = {}
): string {
  if (!url) return '';
  
  const { width = 400, height, quality = 75, format = 'webp' } = options;
  
  // Only optimize Supabase storage URLs
  if (!url.includes(SUPABASE_STORAGE_URL)) {
    return url;
  }
  
  // Supabase image transformation: add render/image/transform path
  // Format: /storage/v1/render/image/public/{bucket}/{path}?width=X&height=Y&quality=Q
  try {
    const urlObj = new URL(url);
    
    // Replace /storage/v1/object/public with /storage/v1/render/image/public
    const transformedPath = urlObj.pathname.replace(
      '/storage/v1/object/public',
      '/storage/v1/render/image/public'
    );
    
    const params = new URLSearchParams();
    if (width) params.set('width', width.toString());
    if (height) params.set('height', height.toString());
    if (quality) params.set('quality', quality.toString());
    if (format !== 'origin') params.set('format', format);
    
    return `${urlObj.origin}${transformedPath}?${params.toString()}`;
  } catch {
    return url;
  }
}

/**
 * Get thumbnail URL - smaller size for cards/lists
 */
export function getThumbnailUrl(url: string | null | undefined): string {
  return getOptimizedImageUrl(url, { width: 400, quality: 70, format: 'webp' });
}

/**
 * Get small thumbnail URL - for avatars and tiny previews
 */
export function getSmallThumbnailUrl(url: string | null | undefined): string {
  return getOptimizedImageUrl(url, { width: 100, quality: 60, format: 'webp' });
}

/**
 * Get medium image URL - for medium-sized displays
 */
export function getMediumImageUrl(url: string | null | undefined): string {
  return getOptimizedImageUrl(url, { width: 600, quality: 80, format: 'webp' });
}

/**
 * Get full quality URL - for detail pages (no transformation)
 */
export function getFullQualityUrl(url: string | null | undefined): string {
  return url || '';
}
