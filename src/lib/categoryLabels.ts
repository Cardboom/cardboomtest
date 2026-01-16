// Category display labels for consistent naming across the app
export const categoryLabels: Record<string, string> = {
  'all': 'All Categories',
  'pokemon': 'Pokémon',
  'yugioh': 'Yu-Gi-Oh!',
  'yu-gi-oh': 'Yu-Gi-Oh!',
  'mtg': 'Magic: The Gathering',
  'magic': 'Magic: The Gathering',
  'lorcana': 'Disney Lorcana',
  'disney-lorcana': 'Disney Lorcana',
  'one-piece': 'One Piece',
  'onepiece': 'One Piece',
  'lol-riftbound': 'LoL Riftbound',
  'riftbound': 'LoL Riftbound',
  'origins': 'LoL Riftbound',
  'figures': 'Figures & Collectibles',
  'sports-nba': 'NBA Cards',
  'sports-nfl': 'NFL Cards',
  'sports-mlb': 'MLB Cards',
  'sports-wnba': 'WNBA Cards',
  'nba': 'NBA',
  'fifa': 'FIFA',
  'baseball': 'Baseball',
  'gaming': 'Video Games',
  'gamepoints': 'Game Points',
  'digimon': 'Digimon TCG',
  'dragon-ball': 'Dragon Ball Super',
  'dragonball': 'Dragon Ball Super',
  'star-wars': 'Star Wars',
  'starwars': 'Star Wars',
};

// Category counts - these are now fetched dynamically via useCategoryCounts hook
// This static object is kept only for backwards compatibility
export const categoryCounts: Record<string, number> = {};

export const getCategoryLabel = (category: string): string => {
  return categoryLabels[category] || category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
};

// Category icons for UI - using text labels instead of emojis
export const categoryIcons: Record<string, string> = {
  'pokemon': 'PKM',
  'yugioh': 'YGO',
  'mtg': 'MTG',
  'lorcana': 'LOR',
  'one-piece': 'OP',
  'onepiece': 'OP',
  'lol-riftbound': 'LOL',
  'figures': 'FIG',
  'sports-nba': 'NBA',
  'sports-nfl': 'NFL',
  'sports-mlb': 'MLB',
  'sports-wnba': 'WNBA',
  'nba': 'NBA',
  'fifa': 'FIFA',
  'baseball': 'MLB',
  'gaming': 'VG',
  'gamepoints': 'GP',
  'digimon': 'DGM',
  'dragon-ball': 'DBS',
  'star-wars': 'SW',
};

export const getCategoryIcon = (category: string): string => {
  return categoryIcons[category] || 'ALL';
};

// Main categories to display in navigation - counts are now fetched dynamically
export const mainCategories = [
  { id: 'all', label: 'All', icon: '' },
  { id: 'pokemon', label: 'Pokémon', icon: '' },
  { id: 'gaming', label: 'Video Games', icon: '' },
  { id: 'mtg', label: 'MTG', icon: '' },
  { id: 'yugioh', label: 'Yu-Gi-Oh!', icon: '' },
  { id: 'one-piece', label: 'One Piece', icon: '' },
  { id: 'lol-riftbound', label: 'LoL-Riftbound', icon: '' },
  { id: 'lorcana', label: 'Disney Lorcana', icon: '' },
  { id: 'digimon', label: 'Digimon TCG', icon: '' },
  { id: 'dragon-ball', label: 'Dragon Ball Super', icon: '' },
  { id: 'star-wars', label: 'Star Wars', icon: '' },
  { id: 'sports-nba', label: 'NBA Cards', icon: '' },
  { id: 'sports-nfl', label: 'NFL Cards', icon: '' },
  { id: 'fifa', label: 'FIFA', icon: '' },
  { id: 'nba', label: 'NBA', icon: '' },
  { id: 'baseball', label: 'Baseball', icon: '' },
  { id: 'figures', label: 'Figures', icon: '' },
];