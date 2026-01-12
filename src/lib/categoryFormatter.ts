/**
 * Category name formatting utility
 * Converts internal category names to proper display names
 */

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'pokemon': 'Pokémon',
  'mtg': 'MTG',
  'yugioh': 'Yu-Gi-Oh!',
  'onepiece': 'One Piece',
  'lorcana': 'Lorcana',
  'nba': 'NBA',
  'nfl': 'NFL',
  'mlb': 'MLB',
  'football': 'Football',
  'soccer': 'Soccer',
  'hockey': 'Hockey',
  'figures': 'Figures',
  'tcg': 'TCG',
  'gaming': 'Gaming',
  'gamepoints': 'Game Points',
  'lol-riftbound': 'LoL Riftbound',
  'flesh-and-blood': 'Flesh & Blood',
  'star-wars': 'Star Wars',
  'sports': 'Sports',
  'digimon': 'Digimon',
  'weiss-schwarz': 'Weiss Schwarz',
  'union-arena': 'Union Arena',
  'battle-spirits': 'Battle Spirits',
  'cardfight': 'Cardfight!! Vanguard',
  'buddyfight': 'Buddyfight',
  'dragon-ball': 'Dragon Ball',
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
