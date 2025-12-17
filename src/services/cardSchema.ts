/**
 * Card Schema Validation
 * 
 * Strict schema for card/collectible data used everywhere.
 * Enforces validation on ingest/import and edits.
 */

export interface CardSchema {
  // Required fields
  id: string;
  name: string;
  category: string;
  
  // Pricing (at least one required)
  currentPrice?: number;
  basePrice?: number;
  
  // Card identification
  tcg?: string;          // pokemon, mtg, yugioh, lorcana, one-piece
  setName?: string;      // Base Set, LOB-001, etc
  cardNumber?: string;   // 004/102
  
  // Card details
  rarity?: string;       // common, uncommon, rare, mythic, legendary, grail
  language?: string;     // english, japanese, korean, etc
  condition?: string;    // raw, near-mint, excellent, good, played
  variant?: string;      // holo, reverse-holo, full-art, alternate-art
  
  // Image
  imageUrl?: string;
  
  // Grading (optional)
  gradingCompany?: string; // PSA, BGS, CGC
  grade?: string;          // 10, 9.5, 9, etc
  
  // Additional metadata
  edition?: string;       // 1st Edition, Unlimited, etc
  foil?: boolean;
  releaseDate?: string;   // ISO date
  artist?: string;
  archetype?: string;     // For Yu-Gi-Oh (Dragon, Spellcaster, etc)
  region?: string;        // For regional variants
  
  // External references
  externalId?: string;
  dataSource?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedData: Partial<CardSchema>;
}

/**
 * Validate card data against schema
 */
export function validateCardData(data: Partial<CardSchema>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const normalizedData: Partial<CardSchema> = { ...data };
  
  // Required fields
  if (!data.id) {
    errors.push('Missing required field: id');
  }
  
  if (!data.name || data.name.trim() === '') {
    errors.push('Missing required field: name');
  } else {
    normalizedData.name = data.name.trim();
  }
  
  if (!data.category || data.category.trim() === '') {
    errors.push('Missing required field: category');
  } else {
    normalizedData.category = normalizeCategory(data.category);
  }
  
  // Price validation
  if (data.currentPrice !== undefined) {
    if (typeof data.currentPrice !== 'number' || isNaN(data.currentPrice)) {
      errors.push('currentPrice must be a valid number');
    } else if (data.currentPrice < 0) {
      errors.push('currentPrice cannot be negative');
    }
  }
  
  // Image URL validation
  if (data.imageUrl) {
    if (!isValidImageUrl(data.imageUrl)) {
      warnings.push('imageUrl may be invalid or use http instead of https');
    }
    // Ensure https
    if (data.imageUrl.startsWith('http://')) {
      normalizedData.imageUrl = data.imageUrl.replace('http://', 'https://');
    }
  }
  
  // Grade validation
  if (data.grade && data.gradingCompany) {
    const validGrades = getValidGrades(data.gradingCompany);
    if (!validGrades.includes(data.grade)) {
      warnings.push(`Grade ${data.grade} may not be valid for ${data.gradingCompany}`);
    }
  }
  
  // Rarity normalization
  if (data.rarity) {
    normalizedData.rarity = normalizeRarity(data.rarity);
  }
  
  // Condition normalization
  if (data.condition) {
    normalizedData.condition = normalizeCondition(data.condition);
  }
  
  // Language normalization
  if (data.language) {
    normalizedData.language = normalizeLanguage(data.language);
  }
  
  // Warnings for missing recommended fields
  if (!data.imageUrl) {
    warnings.push('Missing imageUrl - placeholder will be used');
  }
  
  if (!data.rarity) {
    warnings.push('Missing rarity - may affect filtering');
  }
  
  if (!data.setName) {
    warnings.push('Missing setName - affects searchability');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    normalizedData,
  };
}

/**
 * Normalize category to standard format
 */
export function normalizeCategory(category: string): string {
  const lower = category.toLowerCase().trim();
  
  const categoryMap: Record<string, string> = {
    'pokemon': 'pokemon',
    'pokémon': 'pokemon',
    'pkmn': 'pokemon',
    'mtg': 'mtg',
    'magic': 'mtg',
    'magic the gathering': 'mtg',
    'magic: the gathering': 'mtg',
    'yugioh': 'yugioh',
    'yu-gi-oh': 'yugioh',
    'yu-gi-oh!': 'yugioh',
    'ygo': 'yugioh',
    'lorcana': 'lorcana',
    'disney lorcana': 'lorcana',
    'onepiece': 'one-piece',
    'one piece': 'one-piece',
    'one-piece': 'one-piece',
    'sports-nba': 'sports-nba',
    'nba': 'sports-nba',
    'basketball': 'sports-nba',
    'sports-nfl': 'sports-nfl',
    'nfl': 'sports-nfl',
    'football': 'sports-nfl',
    'sports-mlb': 'sports-mlb',
    'mlb': 'sports-mlb',
    'baseball': 'sports-mlb',
    'figures': 'figures',
    'collectibles': 'figures',
    'gaming': 'gaming',
    'lol-riftbound': 'lol-riftbound',
    'riftbound': 'lol-riftbound',
  };
  
  return categoryMap[lower] || lower;
}

/**
 * Normalize rarity to standard format
 */
export function normalizeRarity(rarity: string): string {
  const lower = rarity.toLowerCase().trim();
  
  const rarityMap: Record<string, string> = {
    'c': 'common',
    'common': 'common',
    'u': 'uncommon',
    'uc': 'uncommon',
    'uncommon': 'uncommon',
    'r': 'rare',
    'rare': 'rare',
    'sr': 'super-rare',
    'super rare': 'super-rare',
    'ur': 'ultra-rare',
    'ultra rare': 'ultra-rare',
    'secret': 'secret-rare',
    'secret rare': 'secret-rare',
    'scr': 'secret-rare',
    'm': 'mythic',
    'mythic': 'mythic',
    'mythic rare': 'mythic',
    'legendary': 'legendary',
    'l': 'legendary',
    'grail': 'grail',
    'enchanted': 'enchanted',
    'alt art': 'alternate-art',
    'alternate art': 'alternate-art',
  };
  
  return rarityMap[lower] || rarity;
}

/**
 * Normalize condition to standard format
 */
export function normalizeCondition(condition: string): string {
  const lower = condition.toLowerCase().trim();
  
  const conditionMap: Record<string, string> = {
    'raw': 'raw',
    'ungraded': 'raw',
    'nm': 'near-mint',
    'near mint': 'near-mint',
    'near-mint': 'near-mint',
    'mint': 'mint',
    'm': 'mint',
    'ex': 'excellent',
    'excellent': 'excellent',
    'exc': 'excellent',
    'gd': 'good',
    'good': 'good',
    'g': 'good',
    'pl': 'played',
    'played': 'played',
    'lp': 'lightly-played',
    'lightly played': 'lightly-played',
    'mp': 'moderately-played',
    'moderately played': 'moderately-played',
    'hp': 'heavily-played',
    'heavily played': 'heavily-played',
    'dmg': 'damaged',
    'damaged': 'damaged',
  };
  
  return conditionMap[lower] || condition;
}

/**
 * Normalize language to standard format
 */
export function normalizeLanguage(language: string): string {
  const lower = language.toLowerCase().trim();
  
  const languageMap: Record<string, string> = {
    'en': 'english',
    'eng': 'english',
    'english': 'english',
    'jp': 'japanese',
    'jpn': 'japanese',
    'japanese': 'japanese',
    'kr': 'korean',
    'kor': 'korean',
    'korean': 'korean',
    'cn': 'chinese',
    'chi': 'chinese',
    'chinese': 'chinese',
    'de': 'german',
    'ger': 'german',
    'german': 'german',
    'fr': 'french',
    'fre': 'french',
    'french': 'french',
    'it': 'italian',
    'ita': 'italian',
    'italian': 'italian',
    'es': 'spanish',
    'spa': 'spanish',
    'spanish': 'spanish',
    'pt': 'portuguese',
    'por': 'portuguese',
    'portuguese': 'portuguese',
  };
  
  return languageMap[lower] || language;
}

/**
 * Get valid grades for a grading company
 */
function getValidGrades(company: string): string[] {
  const grades: Record<string, string[]> = {
    'PSA': ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1', 'Auth'],
    'BGS': ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5.5', '5'],
    'CGC': ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5', '4', '3', '2', '1'],
    'SGC': ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5', '4', '3', '2', '1'],
  };
  
  return grades[company.toUpperCase()] || [];
}

/**
 * Check if URL is a valid image URL
 */
function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * Fill missing fields with "Unknown" values
 */
export function fillUnknownFields(data: Partial<CardSchema>): CardSchema {
  return {
    id: data.id || `unknown_${Date.now()}`,
    name: data.name || 'Unknown Card',
    category: data.category || 'unknown',
    currentPrice: data.currentPrice,
    basePrice: data.basePrice,
    tcg: data.tcg || 'Unknown',
    setName: data.setName || 'Unknown Set',
    cardNumber: data.cardNumber,
    rarity: data.rarity || 'Unknown',
    language: data.language || 'english',
    condition: data.condition || 'Unknown',
    variant: data.variant,
    imageUrl: data.imageUrl,
    gradingCompany: data.gradingCompany,
    grade: data.grade,
    edition: data.edition,
    foil: data.foil,
    releaseDate: data.releaseDate,
    artist: data.artist,
    archetype: data.archetype,
    region: data.region,
    externalId: data.externalId,
    dataSource: data.dataSource,
  };
}

export const cardSchema = {
  validate: validateCardData,
  normalizeCategory,
  normalizeRarity,
  normalizeCondition,
  normalizeLanguage,
  fillUnknownFields,
};

export default cardSchema;
