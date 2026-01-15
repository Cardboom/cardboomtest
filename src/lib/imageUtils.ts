/**
 * Image optimization utilities for responsive image loading
 * Uses Supabase Storage image transformations for thumbnails
 * Keeps full quality for detail pages
 */

const SUPABASE_STORAGE_HOST = 'kgffwhyfgkqeevsuhldt.supabase.co';

/**
 * Get optimized image URL for thumbnails (smaller size)
 * Only transforms Supabase storage URLs - external URLs pass through unchanged
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  _options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'origin';
  } = {}
): string {
  // Return original URL - Supabase image transformation not enabled on this project
  return url || '';
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
