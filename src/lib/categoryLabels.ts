// Category display labels for consistent naming across the app
export const categoryLabels: Record<string, string> = {
  'all': 'All Categories',
  'pokemon': 'Pokémon',
  'yugioh': 'Yu-Gi-Oh!',
  'mtg': 'Magic: The Gathering',
  'lorcana': 'Disney Lorcana',
  'one-piece': 'One Piece',
  'lol-riftbound': 'LoL Riftbound',
  'figures': 'Figures & Collectibles',
  'sports-nba': 'NBA',
  'sports-nfl': 'NFL',
  'sports-mlb': 'MLB',
  'sports-wnba': 'WNBA',
  'nba': 'NBA',
  'gaming': 'Gaming',
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
  'lol-riftbound': '🎮',
  'figures': '🎨',
  'sports-nba': '🏀',
  'sports-nfl': '🏈',
  'sports-mlb': '⚾',
  'sports-wnba': '🏀',
  'nba': '🏀',
  'gaming': '🎮',
};

export const getCategoryIcon = (category: string): string => {
  return categoryIcons[category] || '📦';
};
