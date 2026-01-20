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
  card_code?: string | null; // Full card code e.g. EB03-053, OP01-016
}

/**
 * Extracts card code from name for One Piece cards
 * Matches patterns like: EB03-053, OP01-016, ST01-001
 */
export const extractCardCode = (name: string): string | null => {
  // Match One Piece card codes: 2-3 letters + 2 digits + hyphen + 3 digits
  const match = name.match(/\b([A-Z]{2,3}\d{1,2}-\d{2,3})\b/i);
  return match ? match[1].toUpperCase() : null;
};

/**
 * Checks if category is One Piece
 */
export const isOnePieceCategory = (category: string): boolean => {
  const normalized = category.toLowerCase().replace(/[^a-z]/g, '');
  return normalized === 'onepiece' || normalized === 'one-piece' || normalized === 'onepiecetcg';
};

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
 * For One Piece: Uses card_code directly (e.g., eb03-053)
 * For other TCGs: Uses name-set-number format
 */
export const generateCardSlug = (card: CardSlugData): string => {
  // For One Piece, use card-name + card_code for SEO-friendly URLs
  // e.g., "monkey-d-luffy-op01-003" or "sanji-op01-013"
  if (isOnePieceCategory(card.category)) {
    const cardCode = card.card_code || extractCardCode(card.name);
    if (cardCode) {
      // Format: name-code (e.g., sanji-op01-013)
      const namePart = normalizeSlug(card.name.replace(/\s*[A-Z]{2,3}\d{1,2}-\d{2,3}\s*/i, '').trim());
      return namePart ? `${namePart}-${cardCode.toLowerCase()}` : cardCode.toLowerCase();
    }
    // Fallback for One Piece without card code: include set name for uniqueness
    const parts: string[] = [];
    parts.push(normalizeSlug(card.name));
    if (card.set_name) {
      parts.push(normalizeSlug(card.set_name));
    }
    return parts.join('-');
  }
  
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
 * For One Piece: /cards/one-piece/{card_code}
 * For other TCGs: /cards/:category/:slug
 */
export const generateCardUrl = (card: CardSlugData): string => {
  const categorySlug = normalizeCategory(card.category);
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
 * Parses a One Piece card code from slug
 * Returns the card code if it matches the OP pattern (anywhere in the slug)
 * Handles: eb03-053, nami-op01-016-romance-dawn, op01016, etc.
 */
export const parseOnePieceCardCode = (slug: string): string | null => {
  // Normalize slug for matching
  const normalized = slug.toLowerCase();
  
  // Pattern 1: Card code with hyphen (EB03-053, OP01-016)
  const hyphenMatch = normalized.match(/\b([a-z]{2,3})(\d{1,2})-(\d{2,3})\b/i);
  if (hyphenMatch) {
    return `${hyphenMatch[1].toUpperCase()}${hyphenMatch[2]}-${hyphenMatch[3]}`;
  }
  
  // Pattern 2: Card code without hyphen but in specific format (eb03053, op01016)
  const compactMatch = normalized.match(/\b([a-z]{2,3})(\d{1,2})(\d{3})\b/i);
  if (compactMatch) {
    return `${compactMatch[1].toUpperCase()}${compactMatch[2]}-${compactMatch[3]}`;
  }
  
  return null;
};

/**
 * Parses a slug back to search components
 * This is a best-effort reverse of generateCardSlug
 */
export const parseSlug = (slug: string): {
  searchTerms: string;
  possibleYear?: string;
  possibleCardNumber?: string;
  onePieceCardCode?: string;
} => {
  // First try to extract One Piece card code from anywhere in the slug
  const onePieceCode = parseOnePieceCardCode(slug);
  if (onePieceCode) {
    return {
      searchTerms: onePieceCode,
      onePieceCardCode: onePieceCode,
    };
  }
  
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
 * Reverse mapping from URL slugs to database category values
 */
export const URL_TO_DB_CATEGORY: Record<string, string> = {
  'one-piece': 'onepiece',
  'pokemon': 'pokemon',
  'mtg': 'mtg',
  'yugioh': 'yugioh',
  'sports': 'sports',
  'lorcana': 'lorcana',
  'figures': 'figures',
  'sealed': 'sealed',
  'nba': 'nba',
  'nfl': 'nfl',
  'mlb': 'mlb',
  'videogames': 'videogames',
  'coaching': 'coaching',
  'lol-riftbound': 'lol-riftbound',
};

/**
 * Normalizes category for URLs
 */
export const normalizeCategory = (category: string): string => {
  const normalized = normalizeSlug(category);
  return CATEGORY_SLUG_MAP[normalized] || normalized;
};

/**
 * Converts URL category slug back to database category
 */
export const urlCategoryToDbCategory = (urlCategory: string): string => {
  const normalized = urlCategory.toLowerCase();
  return URL_TO_DB_CATEGORY[normalized] || normalized;
};
