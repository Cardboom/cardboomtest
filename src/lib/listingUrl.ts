/**
 * Listing URL Utilities for CardBoom
 * Generates SEO-friendly URLs for listings
 */

import { normalizeSlug, normalizeCategory } from './seoSlug';

export interface ListingUrlData {
  id: string;
  category: string;
  slug?: string | null;
  title?: string;
  set_name?: string | null;
  card_number?: string | null;
}

/**
 * Generates a slug from listing data (client-side fallback)
 * The canonical slug is generated server-side via trigger
 */
export function generateListingSlug(listing: {
  title: string;
  set_name?: string | null;
  card_number?: string | null;
}): string {
  const parts: string[] = [];
  
  // Title (required)
  parts.push(normalizeSlug(listing.title));
  
  // Set name
  if (listing.set_name) {
    parts.push(normalizeSlug(listing.set_name));
  }
  
  // Card number
  if (listing.card_number) {
    const num = listing.card_number.replace(/[^0-9a-zA-Z]/g, '');
    if (num) parts.push(num);
  }
  
  return parts.join('-').substring(0, 150);
}

/**
 * Generates the SEO-friendly URL for a listing
 * Format: /listing/:category/:slug
 */
export function generateListingUrl(listing: ListingUrlData): string {
  const categorySlug = normalizeCategory(listing.category);
  
  // Use stored slug if available, otherwise generate one
  const slug = listing.slug || (
    listing.title 
      ? generateListingSlug({ title: listing.title, set_name: listing.set_name, card_number: listing.card_number }) + '-' + listing.id.substring(0, 8)
      : listing.id
  );
  
  return `/listing/${categorySlug}/${slug}`;
}

/**
 * Generates a legacy UUID-based URL (for backward compatibility)
 */
export function generateLegacyListingUrl(listingId: string): string {
  return `/listing/${listingId}`;
}

/**
 * Checks if a string is a valid UUID
 */
export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Parse listing URL params to determine fetch strategy
 */
export function parseListingParams(params: {
  id?: string;
  category?: string;
  slug?: string;
}): {
  type: 'uuid' | 'slug';
  uuid?: string;
  category?: string;
  slug?: string;
} {
  // If we have category and slug params, it's the new SEO format
  if (params.category && params.slug) {
    return {
      type: 'slug',
      category: params.category,
      slug: params.slug,
    };
  }
  
  // If id looks like a UUID, use it directly
  if (params.id && isUUID(params.id)) {
    return {
      type: 'uuid',
      uuid: params.id,
    };
  }
  
  // Fallback - treat id as slug (shouldn't happen often)
  return {
    type: 'uuid',
    uuid: params.id,
  };
}

/**
 * Helper to navigate to a listing with SEO URL
 */
export function getListingNavigateUrl(listing: ListingUrlData): string {
  return generateListingUrl(listing);
}
