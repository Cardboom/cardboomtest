/**
 * Category name formatting utility
 * Converts internal category names to proper display names
 */

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'pokemon': 'Pokémon',
  'mtg': 'Magic: The Gathering',
  'magic': 'Magic: The Gathering',
  'yugioh': 'Yu-Gi-Oh!',
  'yu-gi-oh': 'Yu-Gi-Oh!',
  'onepiece': 'One Piece',
  'one-piece': 'One Piece',
  'lorcana': 'Disney Lorcana',
  'disney-lorcana': 'Disney Lorcana',
  'nba': 'NBA',
  'nfl': 'NFL',
  'mlb': 'MLB',
  'fifa': 'FIFA',
  'baseball': 'Baseball',
  'football': 'Football',
  'soccer': 'Soccer',
  'hockey': 'Hockey',
  'figures': 'Figures & Collectibles',
  'tcg': 'TCG',
  'gaming': 'Video Games',
  'gamepoints': 'Game Points',
  'lol-riftbound': 'LoL Riftbound',
  'riftbound': 'LoL Riftbound',
  'origins': 'LoL Riftbound',
  'flesh-and-blood': 'Flesh & Blood',
  'star-wars': 'Star Wars',
  'starwars': 'Star Wars',
  'sports': 'Sports',
  'sports-nba': 'NBA Cards',
  'sports-nfl': 'NFL Cards',
  'sports-mlb': 'MLB Cards',
  'sports-wnba': 'WNBA Cards',
  'digimon': 'Digimon TCG',
  'weiss-schwarz': 'Weiss Schwarz',
  'union-arena': 'Union Arena',
  'battle-spirits': 'Battle Spirits',
  'cardfight': 'Cardfight!! Vanguard',
  'buddyfight': 'Buddyfight',
  'dragon-ball': 'Dragon Ball Super',
  'dragonball': 'Dragon Ball Super',
  'naruto': 'Naruto',
  'my-hero': 'My Hero Academia',
  'sorcery': 'Sorcery',
  'metazoo': 'MetaZoo',
  'fab': 'Flesh & Blood',
};

/**
 * Formats a category name for display
 * @param category - Internal category name (e.g., 'onepiece', 'mtg')
 * @returns Properly formatted display name (e.g., 'One Piece', 'MTG')
 */
export function formatCategoryName(category: string): string {
  if (!category) return '';
  
  const lower = category.toLowerCase().trim();
  
  // Check for exact match in our map
  if (CATEGORY_DISPLAY_NAMES[lower]) {
    return CATEGORY_DISPLAY_NAMES[lower];
  }
  
  // Fallback: capitalize first letter of each word
  return category
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Gets the category display name with proper casing
 * Alias for formatCategoryName
 */
export const getCategoryDisplayName = formatCategoryName;
