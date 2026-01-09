// Content Engine Configuration for CardBoom SEO/AEO Blog Posts

// Game vertical rotation order (rotates daily)
export const GAME_VERTICALS = ['pokemon', 'one-piece', 'mtg', 'sports'] as const;
export type GameVertical = typeof GAME_VERTICALS[number];

// Primary keywords pool (rotated to avoid overlap)
export const PRIMARY_KEYWORDS = [
  'pokemon card grading',
  'one piece card grading',
  'psa vs ai grading',
  'card grading prices',
  'is my pokemon card real',
  'how much is my card worth',
  'best card grading company',
  'tcg card investment',
  'how to spot fake pokemon cards',
  'ai card grading',
  'mtg card grading',
  'sports card grading',
  'card authentication',
  'card centering guide',
  'card condition assessment',
] as const;

// Secondary keywords (always included in articles)
export const SECONDARY_KEYWORDS = [
  'card grading AI',
  'card value estimation',
  'card condition guide',
  'card grading scale',
  'psa, bgs, cgc',
  'CardBoom grading index',
  'AI pre-grading',
] as const;

// Vertical-specific keyword mappings
export const VERTICAL_KEYWORDS: Record<GameVertical, string[]> = {
  pokemon: [
    'pokemon card grading',
    'is my pokemon card real',
    'how to spot fake pokemon cards',
    'charizard card value',
    'pokemon tcg investment',
  ],
  'one-piece': [
    'one piece card grading',
    'one piece tcg value',
    'one piece card authentication',
    'one piece card investment',
  ],
  mtg: [
    'mtg card grading',
    'magic the gathering grading',
    'mtg card value',
    'mtg card authentication',
    'black lotus grading',
  ],
  sports: [
    'sports card grading',
    'nba card grading',
    'baseball card value',
    'football card authentication',
    'rookie card investment',
  ],
};

/**
 * Get the next game vertical based on the day of the year
 * Rotates: Pokemon → One Piece → MTG → Sports
 */
export function getNextVertical(date: Date = new Date()): GameVertical {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return GAME_VERTICALS[dayOfYear % GAME_VERTICALS.length];
}

/**
 * Get vertical-specific keywords for an article
 */
export function getVerticalKeywords(vertical: GameVertical): string[] {
  return VERTICAL_KEYWORDS[vertical] || [];
}

/**
 * Generate JSON-LD FAQ schema from FAQ items
 */
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate Article schema for SEO
 */
export function generateArticleSchema(article: {
  title: string;
  description: string;
  datePublished: string;
  author?: string;
  image?: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.datePublished,
    dateModified: article.datePublished,
    author: {
      '@type': 'Organization',
      name: article.author || 'CardBoom',
    },
    publisher: {
      '@type': 'Organization',
      name: 'CardBoom',
      logo: {
        '@type': 'ImageObject',
        url: 'https://cardboom.com/logo.png',
      },
    },
    image: article.image || 'https://cardboom.com/og-image.png',
  };
}

/**
 * Check if a keyword was recently used (within last N days)
 */
export async function isKeywordRecentlyUsed(
  keyword: string,
  daysToCheck: number = 30
): Promise<boolean> {
  // This would query the content_engine_log table
  // Implementation depends on Supabase client availability
  return false;
}

/**
 * Get display label for a game vertical
 */
export function getVerticalLabel(vertical: GameVertical): string {
  const labels: Record<GameVertical, string> = {
    pokemon: 'Pokémon',
    'one-piece': 'One Piece',
    mtg: 'Magic: The Gathering',
    sports: 'Sports Cards',
  };
  return labels[vertical];
}
