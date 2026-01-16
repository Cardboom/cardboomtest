/**
 * Utilities for formatting card names with full variant/set info for SEO
 */

interface CardNameParams {
  name: string;
  variant?: string | null;
  setCode?: string | null;
  cardNumber?: string | null;
  rarity?: string | null;
  setName?: string | null;
}

/**
 * Format a full SEO-friendly card name
 * Examples:
 * - "Dracule Mihawk [Manga] OP14-119" 
 * - "Nami [SP CARD] EB03-053"
 * - "Charizard [Holo] 4/102"
 */
export function formatCardDisplayName({
  name,
  variant,
  setCode,
  cardNumber,
  rarity,
}: CardNameParams): string {
  const parts: string[] = [name];
  
  // Add variant/rarity in brackets if special
  const variantLabel = getVariantLabel(variant, rarity);
  if (variantLabel) {
    parts.push(`[${variantLabel}]`);
  }
  
  // Add set code and card number
  if (setCode && cardNumber) {
    parts.push(`${setCode}-${cardNumber}`);
  } else if (cardNumber) {
    parts.push(`#${cardNumber}`);
  }
  
  return parts.join(' ');
}

/**
 * Get the variant label to display in brackets
 */
function getVariantLabel(variant?: string | null, rarity?: string | null): string | null {
  // Check for special variants first
  if (variant && variant !== 'regular' && variant !== 'standard') {
    // Capitalize variant nicely
    return capitalizeVariant(variant);
  }
  
  // Use rarity for special cards
  if (rarity) {
    const specialRarities = [
      'SEC', 'SR', 'SP', 'SP CARD', 'Manga', 'Alt Art', 'Alternate Art',
      'Holo', 'Reverse Holo', 'Full Art', 'Rainbow', 'Gold', 'Secret',
      'Chase', 'Promo', 'Enchanted', 'VMAX', 'VSTAR', 'GX', 'EX', 'V',
      'Illustration Rare', 'Special Art Rare', 'Ultra Rare', 'Hyper Rare'
    ];
    
    const matchedRarity = specialRarities.find(r => 
      rarity.toLowerCase().includes(r.toLowerCase())
    );
    
    if (matchedRarity) {
      return matchedRarity;
    }
  }
  
  return null;
}

/**
 * Capitalize variant nicely (manga -> Manga, alt_art -> Alt Art)
 */
function capitalizeVariant(variant: string): string {
  return variant
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format short name for tight spaces (ticker, etc.)
 */
export function formatCardShortName({
  name,
  setCode,
  cardNumber,
}: CardNameParams): string {
  const baseName = name.length > 18 ? name.slice(0, 18) + '...' : name;
  
  if (setCode && cardNumber) {
    return `${baseName} ${setCode}-${cardNumber}`;
  }
  
  return baseName;
}

/**
 * Build search query for external price APIs
 */
export function buildPriceSearchQuery({
  name,
  variant,
  setCode,
  cardNumber,
  rarity,
  category,
}: CardNameParams & { category?: string }): string {
  const parts: string[] = [name];
  
  // Add variant info for specific searches
  if (variant && variant !== 'regular') {
    parts.push(variant);
  } else if (rarity && ['Manga', 'Alt Art', 'SEC', 'SP'].some(r => rarity.includes(r))) {
    parts.push(rarity);
  }
  
  // Add set code and number
  if (setCode) {
    parts.push(setCode);
  }
  if (cardNumber) {
    parts.push(cardNumber);
  }
  
  // Add game context
  const gameKeywords: Record<string, string> = {
    'pokemon': 'Pokemon',
    'mtg': 'Magic The Gathering',
    'yugioh': 'Yu-Gi-Oh',
    'onepiece': 'One Piece',
    'lorcana': 'Disney Lorcana',
    'sports': '',
    'nba': 'Basketball',
    'football': 'Football',
  };
  
  if (category && gameKeywords[category]) {
    parts.push(gameKeywords[category]);
  }
  
  return parts.join(' ');
}
