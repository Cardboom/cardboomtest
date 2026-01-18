/**
 * Catalog Image Resolution Utility
 * 
 * Provides a centralized, stable image resolution strategy for all card displays.
 * Priority: catalog_variants.image_url → catalog_cards.image_url → game-specific fallback
 * 
 * RULES:
 * - NEVER hotlink external images (eBay, Google, wikis, APIs)
 * - Sample listings must use canonical card images (never store their own)
 * - User listings can upload photos but search/card pages still use canonical images
 * - All images should be WebP 512x512 in our own storage
 */

// Game-specific fallback placeholders
const GAME_FALLBACKS: Record<string, string> = {
  onepiece: '/placeholders/onepiece-card.webp',
  pokemon: '/placeholders/pokemon-card.webp',
  mtg: '/placeholders/mtg-card.webp',
  lorcana: '/placeholders/lorcana-card.webp',
  riftbound: '/placeholders/riftbound-card.webp',
  yugioh: '/placeholders/yugioh-card.webp',
  digimon: '/placeholders/digimon-card.webp',
};

// Generic fallback
const DEFAULT_FALLBACK = '/placeholder.svg';

// External URL patterns that should never be used directly
const BLOCKED_URL_PATTERNS = [
  /ebay\.com/i,
  /ebayimg\.com/i,
  /tcgplayer\.com/i,
  /pricecharting\.com/i,
  /google\.(com|co\.\w+)/i,
  /googleapis\.com/i,
  /wikia\.com/i,
  /fandom\.com/i,
  /pokellector\.com/i,
  /cardmarket\.com/i,
];

export interface ImageResolutionContext {
  // Primary sources (in priority order)
  variantImageUrl?: string | null;
  catalogImageUrl?: string | null;
  listingImageUrl?: string | null;
  
  // Fallback context
  game?: string | null;
  
  // Control flags
  allowListingImage?: boolean; // Only true on listing detail pages
}

/**
 * Checks if a URL is an external hotlink that should be blocked
 */
export function isBlockedExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  // Allow our own storage URLs
  if (url.startsWith('/') || url.includes('supabase.co')) {
    return false;
  }
  
  // Check against blocked patterns
  return BLOCKED_URL_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Resolves the correct image URL for a card based on priority rules
 * 
 * Priority:
 * 1. catalog_variants.image_url (if exists)
 * 2. catalog_cards.image_url
 * 3. listing image (ONLY if allowListingImage is true - for detail pages only)
 * 4. Game-specific fallback placeholder
 * 5. Default fallback
 */
export function resolveCardImage(context: ImageResolutionContext): string {
  const { 
    variantImageUrl, 
    catalogImageUrl, 
    listingImageUrl, 
    game,
    allowListingImage = false 
  } = context;
  
  // Priority 1: Variant image (if exists and not blocked)
  if (variantImageUrl && !isBlockedExternalUrl(variantImageUrl)) {
    return variantImageUrl;
  }
  
  // Priority 2: Catalog card image (if exists and not blocked)
  if (catalogImageUrl && !isBlockedExternalUrl(catalogImageUrl)) {
    return catalogImageUrl;
  }
  
  // Priority 3: Listing image (ONLY if explicitly allowed - for detail pages)
  if (allowListingImage && listingImageUrl && !isBlockedExternalUrl(listingImageUrl)) {
    return listingImageUrl;
  }
  
  // Priority 4: Game-specific fallback
  if (game) {
    const normalizedGame = game.toLowerCase().replace(/[^a-z]/g, '');
    if (GAME_FALLBACKS[normalizedGame]) {
      return GAME_FALLBACKS[normalizedGame];
    }
  }
  
  // Priority 5: Default fallback
  return DEFAULT_FALLBACK;
}

/**
 * Get fallback image for a specific game
 */
export function getGameFallbackImage(game: string | null | undefined): string {
  if (!game) return DEFAULT_FALLBACK;
  
  const normalizedGame = game.toLowerCase().replace(/[^a-z]/g, '');
  return GAME_FALLBACKS[normalizedGame] || DEFAULT_FALLBACK;
}

/**
 * Resolves image for search results (catalog images only, no listing images)
 */
export function resolveSearchImage(
  catalogImageUrl: string | null | undefined,
  variantImageUrl: string | null | undefined,
  game: string | null | undefined
): string {
  return resolveCardImage({
    variantImageUrl,
    catalogImageUrl,
    game,
    allowListingImage: false, // Never show listing images in search
  });
}

/**
 * Resolves image for card page (catalog images only, no listing images)
 */
export function resolveCardPageImage(
  catalogImageUrl: string | null | undefined,
  variantImageUrl: string | null | undefined,
  game: string | null | undefined
): string {
  return resolveCardImage({
    variantImageUrl,
    catalogImageUrl,
    game,
    allowListingImage: false, // Card pages use canonical images
  });
}

/**
 * Resolves image for listing detail page (can show user-uploaded photos)
 */
export function resolveListingDetailImage(
  catalogImageUrl: string | null | undefined,
  variantImageUrl: string | null | undefined,
  listingImageUrl: string | null | undefined,
  game: string | null | undefined
): string {
  return resolveCardImage({
    variantImageUrl,
    catalogImageUrl,
    listingImageUrl,
    game,
    allowListingImage: true, // Detail pages can show listing-specific photos
  });
}

/**
 * Builds the expected storage path for a card image
 * Format: /cards/{game}/{set_code}/{normalized_card_number}.webp
 */
export function buildCardImagePath(
  game: string,
  setCode: string,
  cardNumber: string
): string {
  const normalizedGame = game.toLowerCase().replace(/[^a-z]/g, '');
  const normalizedSet = setCode.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedNumber = cardNumber.toLowerCase().replace(/[^a-z0-9-]/g, '');
  
  return `/cards/${normalizedGame}/${normalizedSet}/${normalizedNumber}.webp`;
}

/**
 * Checks if an image URL points to our own storage
 */
export function isOwnStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  return (
    url.startsWith('/') || 
    url.includes('supabase.co') ||
    url.includes('cardboom.com')
  );
}
