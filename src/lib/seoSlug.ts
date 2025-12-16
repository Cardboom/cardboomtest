/**
 * SEO Slug Utilities for CardBoom
 * Generates human-readable, SEO-optimized URLs from card data
 */

export interface CardSlugData {
  name: string;
  set_name?: string | null;
  external_id?: string | null; // card number
  series?: string | null; // can contain year
  category: string;
}

/**
 * Normalizes text for URL slugs:
 * - lowercase
 * - hyphen-separated
 * - removes special characters
 * - trims duplicates
 */
export const normalizeSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .replace(/^-|-$/g, '') // Trim leading/trailing hyphens
    .substring(0, 100); // Limit length
};

/**
 * Extracts year from various string formats
 */
export const extractYear = (text?: string | null): string | null => {
  if (!text) return null;
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? yearMatch[0] : null;
};

/**
 * Generates a canonical SEO slug from card data
 * Format: card-name-set-name-card-number-year
 * Example: charizard-base-set-4-1999
 */
export const generateCardSlug = (card: CardSlugData): string => {
  const parts: string[] = [];
  
  // Card name (required)
  parts.push(normalizeSlug(card.name));
  
  // Set name (if available)
  if (card.set_name) {
    parts.push(normalizeSlug(card.set_name));
  }
  
  // Card number from external_id (if available and numeric)
  if (card.external_id) {
    const cardNum = card.external_id.replace(/[^0-9]/g, '');
    if (cardNum) {
      parts.push(cardNum);
    }
  }
  
  // Year (extracted from series or set_name)
  const year = extractYear(card.series) || extractYear(card.set_name);
  if (year) {
    parts.push(year);
  }
  
  return parts.join('-');
};

/**
 * Generates the full canonical URL path for a card
 * Format: /cards/:category/:slug
 */
export const generateCardUrl = (card: CardSlugData): string => {
  const categorySlug = normalizeSlug(card.category);
  const cardSlug = generateCardSlug(card);
  return `/cards/${categorySlug}/${cardSlug}`;
};

/**
 * Generates URL with query params for variants
 */
export const generateCardUrlWithVariants = (
  card: CardSlugData,
  options?: {
    grade?: string;
    language?: string;
    condition?: string;
  }
): string => {
  const baseUrl = generateCardUrl(card);
  
  if (!options) return baseUrl;
  
  const params = new URLSearchParams();
  if (options.grade) params.set('grade', options.grade.toLowerCase());
  if (options.language) params.set('language', options.language.toLowerCase());
  if (options.condition) params.set('condition', options.condition.toLowerCase());
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

/**
 * Parses a slug back to search components
 * This is a best-effort reverse of generateCardSlug
 */
export const parseSlug = (slug: string): {
  searchTerms: string;
  possibleYear?: string;
  possibleCardNumber?: string;
} => {
  const parts = slug.split('-');
  let possibleYear: string | undefined;
  let possibleCardNumber: string | undefined;
  
  // Check last parts for year (4 digits starting with 19 or 20)
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^(19|20)\d{2}$/.test(parts[i])) {
      possibleYear = parts[i];
      parts.splice(i, 1);
      break;
    }
  }
  
  // Check remaining last parts for card number (pure digits, likely 1-4 digits)
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^\d{1,4}$/.test(parts[i])) {
      possibleCardNumber = parts[i];
      parts.splice(i, 1);
      break;
    }
  }
  
  return {
    searchTerms: parts.join(' '),
    possibleYear,
    possibleCardNumber,
  };
};

/**
 * Checks if two slugs refer to the same card (for redirect detection)
 */
export const slugsMatch = (slug1: string, slug2: string): boolean => {
  return normalizeSlug(slug1) === normalizeSlug(slug2);
};

/**
 * Category mapping for URL normalization
 */
export const CATEGORY_SLUG_MAP: Record<string, string> = {
  'pokemon': 'pokemon',
  'pokemon-tcg': 'pokemon',
  'mtg': 'mtg',
  'magic': 'mtg',
  'magic-the-gathering': 'mtg',
  'yugioh': 'yugioh',
  'yu-gi-oh': 'yugioh',
  'sports': 'sports',
  'sports-cards': 'sports',
  'one-piece': 'one-piece',
  'onepiece': 'one-piece',
  'lorcana': 'lorcana',
  'disney-lorcana': 'lorcana',
  'figures': 'figures',
  'collectible-figures': 'figures',
  'sealed': 'sealed',
  'sealed-products': 'sealed',
};

/**
 * Normalizes category for URLs
 */
export const normalizeCategory = (category: string): string => {
  const normalized = normalizeSlug(category);
  return CATEGORY_SLUG_MAP[normalized] || normalized;
};
