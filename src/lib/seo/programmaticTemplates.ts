/**
 * Programmatic SEO Page Templates
 * Define templates for scalable page generation
 */

import type { SEOPageData, PageIntent, FAQItem } from './types';
import { VERTICAL_CONFIG, URL_TO_DB_CATEGORY } from './config';

// ============= Template Types =============
export interface PageTemplate {
  slug: string;
  intent: PageIntent;
  generateData: (params: Record<string, string>) => SEOPageData;
  patterns?: RegExp[];
}

// ============= Long-tail Deal Templates =============
export const DEAL_TEMPLATES: Record<string, (category: string) => SEOPageData> = {
  // Price-based templates
  'under-10': (category) => ({
    intent: 'collection',
    entityName: `${getCategoryName(category)} Under $10`,
    identifier: `deals/${category}-cards-under-10`,
    category: normalizeCategory(category),
    keywords: [`cheap ${category} cards`, `${category} cards under 10 dollars`, `budget ${category}`],
    faqs: generateDealFAQs(category, 'under $10'),
  }),
  
  'under-50': (category) => ({
    intent: 'collection',
    entityName: `${getCategoryName(category)} Under $50`,
    identifier: `deals/${category}-cards-under-50`,
    category: normalizeCategory(category),
    keywords: [`affordable ${category} cards`, `${category} cards under 50`, `${category} deals`],
    faqs: generateDealFAQs(category, 'under $50'),
  }),
  
  'under-100': (category) => ({
    intent: 'collection',
    entityName: `${getCategoryName(category)} Under $100`,
    identifier: `deals/${category}-cards-under-100`,
    category: normalizeCategory(category),
    keywords: [`${category} cards under 100`, `mid-range ${category}`, `${category} investments`],
    faqs: generateDealFAQs(category, 'under $100'),
  }),

  // Grade-based templates
  'psa-10': (category) => ({
    intent: 'collection',
    entityName: `PSA 10 ${getCategoryName(category)}`,
    identifier: `deals/psa-10-${category}-cards`,
    category: normalizeCategory(category),
    keywords: [`psa 10 ${category}`, `gem mint ${category}`, `graded ${category} cards`],
    faqs: generateGradeFAQs(category, 'PSA 10'),
  }),
  
  'psa-9': (category) => ({
    intent: 'collection',
    entityName: `PSA 9 ${getCategoryName(category)}`,
    identifier: `deals/psa-9-${category}-cards`,
    category: normalizeCategory(category),
    keywords: [`psa 9 ${category}`, `mint ${category}`, `graded ${category}`],
    faqs: generateGradeFAQs(category, 'PSA 9'),
  }),
  
  'bgs-10': (category) => ({
    intent: 'collection',
    entityName: `BGS 10 ${getCategoryName(category)}`,
    identifier: `deals/bgs-10-${category}-cards`,
    category: normalizeCategory(category),
    keywords: [`bgs 10 ${category}`, `black label ${category}`, `perfect ${category}`],
    faqs: generateGradeFAQs(category, 'BGS 10'),
  }),
  
  'raw': (category) => ({
    intent: 'collection',
    entityName: `Raw ${getCategoryName(category)}`,
    identifier: `deals/raw-${category}-cards`,
    category: normalizeCategory(category),
    keywords: [`ungraded ${category}`, `raw ${category} cards`, `${category} to grade`],
    faqs: generateRawFAQs(category),
  }),

  // Condition-based templates  
  'vintage': (category) => ({
    intent: 'collection',
    entityName: `Vintage ${getCategoryName(category)}`,
    identifier: `deals/vintage-${category}-cards`,
    category: normalizeCategory(category),
    keywords: [`vintage ${category}`, `old ${category} cards`, `classic ${category}`, `retro ${category}`],
    faqs: generateVintageFAQs(category),
  }),
  
  'japanese': (category) => ({
    intent: 'collection',
    entityName: `Japanese ${getCategoryName(category)}`,
    identifier: `deals/japanese-${category}-cards`,
    category: normalizeCategory(category),
    keywords: [`japanese ${category}`, `japan exclusive ${category}`, `jp ${category} cards`],
    faqs: generateJapaneseFAQs(category),
  }),
  
  'first-edition': (category) => ({
    intent: 'collection',
    entityName: `First Edition ${getCategoryName(category)}`,
    identifier: `deals/first-edition-${category}-cards`,
    category: normalizeCategory(category),
    keywords: [`first edition ${category}`, `1st edition ${category}`, `shadowless ${category}`],
    faqs: generateFirstEditionFAQs(category),
  }),
};

// ============= Character/Card Name Templates =============
export const POPULAR_CARDS: Record<string, string[]> = {
  pokemon: ['charizard', 'pikachu', 'mewtwo', 'mew', 'blastoise', 'venusaur', 'gengar', 'alakazam', 'dragonite', 'lugia'],
  yugioh: ['blue-eyes-white-dragon', 'dark-magician', 'exodia', 'red-eyes-black-dragon', 'black-luster-soldier'],
  onepiece: ['luffy', 'zoro', 'shanks', 'nami', 'sanji', 'ace', 'law', 'kaido', 'whitebeard'],
  mtg: ['black-lotus', 'mox-sapphire', 'time-walk', 'ancestral-recall', 'underground-sea'],
};

export function generateCardDealData(category: string, cardSlug: string): SEOPageData {
  const cardName = cardSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  return {
    intent: 'collection',
    entityName: `${cardName} Cards`,
    identifier: `deals/${cardSlug}-cards`,
    category: normalizeCategory(category),
    keywords: [`${cardName} card`, `buy ${cardName}`, `${cardName} price`, `${cardName} for sale`],
    faqs: [
      {
        question: `How much is a ${cardName} card worth?`,
        answer: `${cardName} card values vary based on condition, edition, and grading. Use our price tracker to see current market values across all variants.`,
      },
      {
        question: `Where can I buy authentic ${cardName} cards?`,
        answer: `CardBoom offers verified ${cardName} cards from trusted sellers with buyer protection. All purchases are guaranteed authentic.`,
      },
      {
        question: `What's the best ${cardName} card to invest in?`,
        answer: `High-grade (PSA 10) first edition ${cardName} cards typically hold the best investment value. Check our market analysis for detailed trends.`,
      },
    ],
  };
}

// ============= URL Pattern Matching =============
export const LONGTAIL_PATTERNS = [
  // /deals/pokemon-cards-under-10
  {
    pattern: /^\/deals\/([a-z-]+)-cards-under-(\d+)$/,
    extract: (match: RegExpMatchArray) => ({
      template: `under-${match[2]}`,
      category: match[1].replace(/-cards$/, ''),
    }),
  },
  // /deals/psa-10-pokemon-cards
  {
    pattern: /^\/deals\/(psa|bgs|cgc)-(\d+)-([a-z-]+)-cards$/,
    extract: (match: RegExpMatchArray) => ({
      template: `${match[1]}-${match[2]}`,
      category: match[3].replace(/-cards$/, ''),
    }),
  },
  // /deals/vintage-pokemon-cards
  {
    pattern: /^\/deals\/(vintage|japanese|first-edition|raw)-([a-z-]+)-cards$/,
    extract: (match: RegExpMatchArray) => ({
      template: match[1],
      category: match[2].replace(/-cards$/, ''),
    }),
  },
  // /deals/charizard-cards
  {
    pattern: /^\/deals\/([a-z-]+)-cards$/,
    extract: (match: RegExpMatchArray) => ({
      template: 'card-name',
      cardSlug: match[1],
    }),
  },
];

// Type for extracted URL params
type ExtractedParams = 
  | { template: string; category: string; cardSlug?: never }
  | { template: string; cardSlug: string; category?: never };

/**
 * Parse a URL and return the appropriate SEO data
 */
export function parseUrlForSEO(pathname: string): SEOPageData | null {
  for (const { pattern, extract } of LONGTAIL_PATTERNS) {
    const match = pathname.match(pattern);
    if (match) {
      const params = extract(match) as ExtractedParams;
      
      if (params.template === 'card-name' && 'cardSlug' in params && params.cardSlug) {
        // Determine category from popular cards
        const category = Object.entries(POPULAR_CARDS).find(
          ([_, cards]) => cards.includes(params.cardSlug)
        )?.[0] || 'pokemon';
        return generateCardDealData(category, params.cardSlug);
      }
      
      if ('category' in params && params.category) {
        const templateFn = DEAL_TEMPLATES[params.template];
        if (templateFn) {
          return templateFn(params.category);
        }
      }
    }
  }
  
  return null;
}

// ============= Helper Functions =============
function normalizeCategory(category: string): string {
  return URL_TO_DB_CATEGORY[category] || category;
}

function getCategoryName(category: string): string {
  const normalized = normalizeCategory(category);
  const config = VERTICAL_CONFIG[normalized];
  return config?.pluralName || `${category} Cards`;
}

function generateDealFAQs(category: string, priceRange: string): FAQItem[] {
  const name = getCategoryName(category);
  return [
    {
      question: `Are ${name} ${priceRange} worth buying?`,
      answer: `Absolutely! Many great ${name} can be found ${priceRange}. These often include playable cards, minor rarities, and collection starters. Our marketplace shows real-time prices to help you find the best deals.`,
    },
    {
      question: `How do I verify authenticity on budget ${name}?`,
      answer: `All sellers on CardBoom are verified. We offer buyer protection on every purchase, and our AI grading helps assess card condition before you buy.`,
    },
    {
      question: `What's the best ${name} ${priceRange} to buy?`,
      answer: `Browse our curated collection of ${name} ${priceRange}, sorted by popularity and value retention. Check our price charts to find cards with good investment potential.`,
    },
  ];
}

function generateGradeFAQs(category: string, grade: string): FAQItem[] {
  const name = getCategoryName(category);
  return [
    {
      question: `Why buy ${grade} ${name}?`,
      answer: `${grade} ${name} represent the highest quality available. They're professionally authenticated, protected in slabs, and typically hold or increase in value over time.`,
    },
    {
      question: `How much do ${grade} ${name} cost?`,
      answer: `${grade} ${name} prices vary widely based on the specific card, edition, and rarity. Use our price tracker to compare current market values across different ${name}.`,
    },
    {
      question: `Where can I buy verified ${grade} ${name}?`,
      answer: `CardBoom offers verified ${grade} ${name} from trusted sellers. Each graded card comes with authentication verification and our buyer protection guarantee.`,
    },
  ];
}

function generateRawFAQs(category: string): FAQItem[] {
  const name = getCategoryName(category);
  return [
    {
      question: `Should I buy raw ${name} or graded?`,
      answer: `Raw ${name} are more affordable and great for players or collectors who want to get their own cards graded. If you plan to grade, buying raw can offer better value.`,
    },
    {
      question: `How do I assess raw ${name} condition?`,
      answer: `Our AI-powered pre-grading tool helps estimate the condition of raw cards. Sellers also provide detailed photos and condition descriptions.`,
    },
    {
      question: `Is it worth grading raw ${name}?`,
      answer: `It depends on the card's value and condition. Use our grading ROI calculator to see if grading makes financial sense for your specific cards.`,
    },
  ];
}

function generateVintageFAQs(category: string): FAQItem[] {
  const name = getCategoryName(category);
  return [
    {
      question: `What qualifies as vintage ${name}?`,
      answer: `Vintage ${name} typically refers to cards from the first few years of the game's release. For Pokémon, this means WOTC era (1999-2003). For MTG, it's cards from the 90s.`,
    },
    {
      question: `Are vintage ${name} a good investment?`,
      answer: `Vintage ${name} have historically shown strong value appreciation, especially high-grade examples of iconic cards. However, like all collectibles, research is important.`,
    },
    {
      question: `How do I authenticate vintage ${name}?`,
      answer: `Look for professional grading (PSA, BGS, CGC), buy from verified sellers, and use our authentication guides. CardBoom offers buyer protection on all purchases.`,
    },
  ];
}

function generateJapaneseFAQs(category: string): FAQItem[] {
  const name = getCategoryName(category);
  return [
    {
      question: `Why are Japanese ${name} popular?`,
      answer: `Japanese ${name} often have unique artwork, earlier release dates, and different textures or holofoil patterns. Many collectors prefer the original Japanese versions.`,
    },
    {
      question: `Are Japanese ${name} more valuable?`,
      answer: `It depends on the card. Some Japanese exclusives command premium prices, while others may be more affordable than their English counterparts.`,
    },
    {
      question: `Can I play with Japanese ${name}?`,
      answer: `Tournament rules vary by game and region. Japanese ${name} are popular for casual play and collecting, but check official rules for competitive use.`,
    },
  ];
}

function generateFirstEditionFAQs(category: string): FAQItem[] {
  const name = getCategoryName(category);
  return [
    {
      question: `What makes First Edition ${name} special?`,
      answer: `First Edition ${name} were printed in the initial production run and are marked with a "1st Edition" stamp. They're rarer and more valuable than unlimited prints.`,
    },
    {
      question: `How do I identify First Edition ${name}?`,
      answer: `Look for the "1st Edition" stamp, usually located on the left side of the card. The card may also have different holo patterns or be shadowless (for early Pokémon).`,
    },
    {
      question: `Are First Edition ${name} worth the premium?`,
      answer: `For collectors and investors, First Edition ${name} often hold value better than unlimited prints. High-grade First Edition cards of iconic characters are especially sought after.`,
    },
  ];
}

// ============= Generate All Possible URLs =============
export function generateAllDealUrls(): string[] {
  const urls: string[] = [];
  const categories = Object.keys(VERTICAL_CONFIG);
  const templates = Object.keys(DEAL_TEMPLATES);
  
  // Category + template combinations
  for (const category of categories) {
    for (const template of templates) {
      const config = VERTICAL_CONFIG[category];
      const slug = config?.slug || category;
      
      if (template.startsWith('under-')) {
        urls.push(`/deals/${slug}-cards-${template}`);
      } else if (template.startsWith('psa-') || template.startsWith('bgs-')) {
        urls.push(`/deals/${template}-${slug}-cards`);
      } else {
        urls.push(`/deals/${template}-${slug}-cards`);
      }
    }
  }
  
  // Popular card URLs
  for (const [category, cards] of Object.entries(POPULAR_CARDS)) {
    for (const card of cards) {
      urls.push(`/deals/${card}-cards`);
    }
  }
  
  return urls;
}
