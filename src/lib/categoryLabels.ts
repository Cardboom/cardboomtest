// Category display labels for consistent naming across the app
export const categoryLabels: Record<string, string> = {
  'all': 'All Categories',
  'pokemon': 'Pokémon TCG',
  'yugioh': 'Yu-Gi-Oh!',
  'mtg': 'Magic: The Gathering',
  'lorcana': 'Disney Lorcana',
  'one-piece': 'One Piece TCG',
  'onepiece': 'One Piece TCG',
  'lol-riftbound': 'LoL Riftbound',
  'figures': 'Figures & Collectibles',
  'sports-nba': 'NBA Cards',
  'sports-nfl': 'NFL Cards',
  'sports-mlb': 'MLB Cards',
  'sports-wnba': 'WNBA Cards',
  'nba': 'NBA',
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

// Category icons for UI
export const categoryIcons: Record<string, string> = {
  'pokemon': '⚡',
  'yugioh': '🔮',
  'mtg': '🪄',
  'lorcana': '✨',
  'one-piece': '🏴‍☠️',
  'onepiece': '🏴‍☠️',
  'lol-riftbound': '🎮',
  'figures': '🎨',
  'sports-nba': '🏀',
  'sports-nfl': '🏈',
  'sports-mlb': '⚾',
  'sports-wnba': '🏀',
  'nba': '🏀',
  'gaming': '🎮',
  'gamepoints': '🎮',
  'digimon': '🦖',
  'dragon-ball': '🐉',
  'star-wars': '⭐',
};

export const getCategoryIcon = (category: string): string => {
  return categoryIcons[category] || '📦';
};

// Main categories to display in navigation (sorted by count)
export const mainCategories = [
  { id: 'all', label: 'All', icon: '📦', count: 35000 },
  { id: 'mtg', label: 'Magic: The Gathering', icon: '🪄', count: 9790 },
  { id: 'yugioh', label: 'Yu-Gi-Oh!', icon: '🔮', count: 9690 },
  { id: 'pokemon', label: 'Pokémon TCG', icon: '⚡', count: 9151 },
  { id: 'gaming', label: 'Video Games', icon: '🎮', count: 7006 },
  { id: 'one-piece', label: 'One Piece TCG', icon: '🏴‍☠️', count: 15 },
  { id: 'lol-riftbound', label: 'LoL Riftbound', icon: '🎮', count: 16 },
  { id: 'lorcana', label: 'Disney Lorcana', icon: '✨', count: 8 },
  { id: 'sports-nba', label: 'NBA Cards', icon: '🏀', count: 8 },
  { id: 'sports-nfl', label: 'NFL Cards', icon: '🏈', count: 6 },
  { id: 'figures', label: 'Figures', icon: '🎨', count: 5 },
];