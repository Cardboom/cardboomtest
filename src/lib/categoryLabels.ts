// Category display labels for consistent naming across the app
export const categoryLabels: Record<string, string> = {
  'all': 'All Categories',
  'pokemon': 'Pokémon',
  'yugioh': 'Yu-Gi-Oh!',
  'mtg': 'MTG',
  'lorcana': 'Disney Lorcana',
  'one-piece': 'One Piece',
  'onepiece': 'One Piece',
  'lol-riftbound': 'LoL-Riftbound',
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
  'star-wars': 'Star Wars',
};

// Category counts from database (updated dynamically)
export const categoryCounts: Record<string, number> = {
  'mtg': 9790,
  'yugioh': 9690,
  'pokemon': 9151,
  'gaming': 7006,
  'one-piece': 15,
  'lol-riftbound': 16,
  'lorcana': 8,
  'sports-nba': 8,
  'sports-nfl': 6,
  'figures': 5,
};

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

// Main categories to display in navigation (sorted by popularity)
export const mainCategories = [
  { id: 'all', label: 'All', icon: '', count: 35000 },
  { id: 'mtg', label: 'MTG', icon: '', count: 9790 },
  { id: 'yugioh', label: 'Yu-Gi-Oh!', icon: '', count: 9690 },
  { id: 'pokemon', label: 'Pokémon', icon: '', count: 9151 },
  { id: 'gaming', label: 'Video Games', icon: '', count: 7006 },
  { id: 'digimon', label: 'Digimon TCG', icon: '', count: 500 },
  { id: 'dragon-ball', label: 'Dragon Ball Super', icon: '', count: 400 },
  { id: 'star-wars', label: 'Star Wars', icon: '', count: 350 },
  { id: 'one-piece', label: 'One Piece', icon: '', count: 15 },
  { id: 'lol-riftbound', label: 'LoL-Riftbound', icon: '', count: 16 },
  { id: 'lorcana', label: 'Disney Lorcana', icon: '', count: 8 },
  { id: 'sports-nba', label: 'NBA Cards', icon: '', count: 8 },
  { id: 'sports-nfl', label: 'NFL Cards', icon: '', count: 6 },
  { id: 'fifa', label: 'FIFA', icon: '', count: 0 },
  { id: 'nba', label: 'NBA', icon: '', count: 0 },
  { id: 'baseball', label: 'Baseball', icon: '', count: 0 },
  { id: 'figures', label: 'Figures', icon: '', count: 5 },
];