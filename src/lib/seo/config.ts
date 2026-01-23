/**
 * Programmatic SEO Configuration
 * Centralized configuration for all SEO-related settings
 */

import type { VerticalConfig, PageTemplateConfig, PageIntent } from './types';

// ============= Site Configuration =============
export const SITE_CONFIG = {
  name: 'CardBoom',
  url: 'https://cardboom.com',
  defaultImage: '/og-image.png',
  twitterHandle: '@cardboom',
  foundingYear: 2025,
  locale: 'en_US',
} as const;

// ============= Preconnect Domains =============
export const PRECONNECT_DOMAINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://kgffwhyfgkqeevsuhldt.supabase.co',
  'https://images.ygoprodeck.com',
  'https://images.tcggo.com',
] as const;

// ============= Vertical/Category Configuration =============
export const VERTICAL_CONFIG: Record<string, VerticalConfig> = {
  pokemon: {
    slug: 'pokemon',
    dbKey: 'pokemon',
    displayName: 'Pokémon',
    pluralName: 'Pokémon Cards',
    description: 'Buy and sell Pokémon TCG cards including vintage Base Set, Sword & Shield, Scarlet & Violet, and rare Japanese exclusives.',
    keywords: ['pokemon cards', 'pokemon tcg', 'charizard', 'pikachu', 'japanese pokemon cards', 'psa pokemon', 'pokemon grading'],
    faqs: [
      { question: 'How do I know if my Pokémon cards are authentic?', answer: 'CardBoom uses AI-powered authentication and partners with PSA, BGS, and CGC for professional grading. All sellers are verified.' },
      { question: 'What are the most valuable Pokémon cards?', answer: 'Base Set Charizard, 1st Edition Holos, and Japanese exclusives are among the most valuable. Check our price guide for current values.' },
    ],
  },
  mtg: {
    slug: 'mtg',
    dbKey: 'mtg',
    displayName: 'Magic: The Gathering',
    pluralName: 'MTG Cards',
    description: 'Find Magic: The Gathering cards from all sets. Alpha, Beta, Modern, Legacy, and Commander staples at competitive prices.',
    keywords: ['mtg cards', 'magic the gathering', 'black lotus', 'commander cards', 'modern mtg', 'legacy mtg'],
    faqs: [
      { question: 'What MTG formats are supported?', answer: 'We support all formats including Standard, Modern, Legacy, Vintage, Commander/EDH, and Pioneer.' },
    ],
  },
  yugioh: {
    slug: 'yugioh',
    dbKey: 'yugioh',
    displayName: 'Yu-Gi-Oh!',
    pluralName: 'Yu-Gi-Oh! Cards',
    description: 'Shop Yu-Gi-Oh! cards including Blue-Eyes White Dragon, Dark Magician, and tournament-ready competitive decks.',
    keywords: ['yugioh cards', 'yu-gi-oh', 'blue-eyes white dragon', 'dark magician', 'yugioh tcg', 'yugioh meta'],
  },
  onepiece: {
    slug: 'one-piece',
    dbKey: 'onepiece',
    displayName: 'One Piece',
    pluralName: 'One Piece Cards',
    description: 'One Piece TCG cards featuring Luffy, Zoro, and the Straw Hat crew. Find rare pulls and complete your collection.',
    keywords: ['one piece cards', 'one piece tcg', 'luffy card', 'manga cards', 'anime tcg', 'one piece grading'],
    faqs: [
      { question: 'How are One Piece cards identified?', answer: 'One Piece cards use unique card codes like OP01-016. Our system strictly enforces these codes for accurate identification.' },
    ],
  },
  lorcana: {
    slug: 'lorcana',
    dbKey: 'lorcana',
    displayName: 'Disney Lorcana',
    pluralName: 'Lorcana Cards',
    description: 'Disney Lorcana trading cards featuring beloved Disney characters. Find enchanted rare cards and starter decks.',
    keywords: ['lorcana cards', 'disney lorcana', 'disney tcg', 'lorcana enchanted', 'lorcana grading'],
  },
  nba: {
    slug: 'nba',
    dbKey: 'nba',
    displayName: 'NBA',
    pluralName: 'NBA Cards',
    description: 'NBA basketball cards including rookies, autographs, and legendary players. Topps, Panini, and premium parallels.',
    keywords: ['nba cards', 'basketball cards', 'nba rookie cards', 'panini prizm', 'sports cards'],
  },
  nfl: {
    slug: 'nfl',
    dbKey: 'nfl',
    displayName: 'NFL',
    pluralName: 'NFL Cards',
    description: 'NFL football cards featuring rookies, autographs, and Hall of Famers. Patrick Mahomes, premium parallels, and vintage.',
    keywords: ['nfl cards', 'football cards', 'nfl rookie cards', 'panini football', 'sports trading cards'],
  },
  mlb: {
    slug: 'mlb',
    dbKey: 'mlb',
    displayName: 'MLB',
    pluralName: 'Baseball Cards',
    description: 'MLB baseball cards including rookies, vintage legends, and modern stars. Topps, Bowman, and premium inserts.',
    keywords: ['baseball cards', 'mlb cards', 'topps baseball', 'rookie cards', 'vintage baseball cards'],
  },
  figures: {
    slug: 'figures',
    dbKey: 'figures',
    displayName: 'Figures',
    pluralName: 'Collectible Figures',
    description: 'Collectible figures and toys including Funko Pop, anime figures, and limited edition statues.',
    keywords: ['collectible figures', 'funko pop', 'anime figures', 'limited edition collectibles'],
  },
  digimon: {
    slug: 'digimon',
    dbKey: 'digimon',
    displayName: 'Digimon',
    pluralName: 'Digimon Cards',
    description: 'Digimon TCG cards featuring classic and new Digimon. Find rare alternate arts and competitive deck staples.',
    keywords: ['digimon cards', 'digimon tcg', 'digimon card game'],
  },
  dragonball: {
    slug: 'dragonball',
    dbKey: 'dragonball',
    displayName: 'Dragon Ball',
    pluralName: 'Dragon Ball Cards',
    description: 'Dragon Ball Super Card Game and DBS Fusion World cards. Goku, Vegeta, and Saiyan collectibles.',
    keywords: ['dragon ball cards', 'dbs cards', 'goku cards', 'anime trading cards'],
  },
};

// ============= URL to DB Category Mapping =============
export const URL_TO_DB_CATEGORY: Record<string, string> = {
  'pokemon': 'pokemon',
  'pokemon-cards': 'pokemon',
  'one-piece': 'onepiece',
  'onepiece': 'onepiece',
  'onepiece-cards': 'onepiece',
  'mtg': 'mtg',
  'mtg-cards': 'mtg',
  'magic': 'mtg',
  'magic-the-gathering': 'mtg',
  'yugioh': 'yugioh',
  'yugioh-cards': 'yugioh',
  'yu-gi-oh': 'yugioh',
  'lorcana': 'lorcana',
  'lorcana-cards': 'lorcana',
  'nba': 'nba',
  'nba-cards': 'nba',
  'nfl': 'nfl',
  'nfl-cards': 'nfl',
  'mlb': 'mlb',
  'mlb-cards': 'mlb',
  'baseball': 'mlb',
  'football': 'nfl',
  'basketball': 'nba',
  'lol-riftbound': 'lol-riftbound',
  'riftbound': 'lol-riftbound',
  'figures': 'figures',
  'videogames': 'videogames',
  'digimon': 'digimon',
  'dragonball': 'dragonball',
};

// ============= Page Template Configurations =============
export const PAGE_TEMPLATES: Record<PageIntent, PageTemplateConfig> = {
  product: {
    intent: 'product',
    schemaTypes: ['Product', 'BreadcrumbList', 'AggregateOffer'],
    generateFAQs: true,
    generateRelated: true,
    indexable: true,
    cacheStrategy: 'revalidate',
    revalidateSeconds: 3600, // 1 hour
  },
  category: {
    intent: 'category',
    schemaTypes: ['CollectionPage', 'BreadcrumbList', 'ItemList'],
    generateFAQs: true,
    generateRelated: true,
    indexable: true,
    cacheStrategy: 'revalidate',
    revalidateSeconds: 1800, // 30 minutes
  },
  collection: {
    intent: 'collection',
    schemaTypes: ['CollectionPage', 'BreadcrumbList', 'FAQPage'],
    generateFAQs: true,
    generateRelated: true,
    indexable: true,
    cacheStrategy: 'static',
  },
  comparison: {
    intent: 'comparison',
    schemaTypes: ['WebPage', 'Dataset', 'FAQPage', 'BreadcrumbList'],
    generateFAQs: true,
    generateRelated: true,
    indexable: true,
    cacheStrategy: 'static',
  },
  guide: {
    intent: 'guide',
    schemaTypes: ['WebPage', 'FAQPage', 'BreadcrumbList'],
    generateFAQs: true,
    generateRelated: true,
    indexable: true,
    cacheStrategy: 'static',
  },
  faq: {
    intent: 'faq',
    schemaTypes: ['FAQPage', 'BreadcrumbList'],
    generateFAQs: false, // FAQs are the main content
    generateRelated: true,
    indexable: true,
    cacheStrategy: 'static',
  },
  article: {
    intent: 'article',
    schemaTypes: ['Article', 'BreadcrumbList'],
    generateFAQs: true,
    generateRelated: true,
    indexable: true,
    cacheStrategy: 'static',
  },
  landing: {
    intent: 'landing',
    schemaTypes: ['WebPage', 'FAQPage', 'BreadcrumbList'],
    generateFAQs: true,
    generateRelated: true,
    indexable: true,
    cacheStrategy: 'static',
  },
  profile: {
    intent: 'profile',
    schemaTypes: ['WebPage'],
    generateFAQs: false,
    generateRelated: false,
    indexable: true,
    cacheStrategy: 'dynamic',
  },
  transactional: {
    intent: 'transactional',
    schemaTypes: [],
    generateFAQs: false,
    generateRelated: false,
    indexable: false,
    cacheStrategy: 'dynamic',
  },
};

// ============= Noindex Paths =============
export const NOINDEX_PATHS = [
  '/auth',
  '/wallet',
  '/vault',
  '/sell',
  '/profile',
  '/messages',
  '/trades',
  '/portfolio',
  '/admin',
  '/order-success',
  '/grading/new',
  '/grading/orders',
  '/buy-orders',
  '/account-settings',
  '/settings',
] as const;

// ============= Filter Params that trigger noindex =============
export const NOINDEX_PARAMS = [
  'sort',
  'order',
  'filter',
  'min_price',
  'max_price',
  'condition',
  'grade',
  'grading_company',
  'language',
  'page', // Page 2+ should be noindex
] as const;

// ============= Indexable filter params =============
export const INDEX_PARAMS = [
  'category',
  'search',
  'q',
  'game',
] as const;

// ============= Title Templates =============
export const TITLE_TEMPLATES: Record<PageIntent, string> = {
  product: '{name} - Price & Market Data | {site}',
  category: 'Buy {name} Online - Best Prices | {site}',
  collection: '{name} | {site}',
  comparison: '{name} - Comparison | {site}',
  guide: '{name} | {site} Guide',
  faq: '{name} - FAQ | {site}',
  article: '{name} | {site}',
  landing: '{name} | {site}',
  profile: '{name} | {site}',
  transactional: '{name} | {site}',
};

// ============= Description Templates =============
export const DESCRIPTION_TEMPLATES: Record<PageIntent, string> = {
  product: 'Shop {name} {priceInfo}. {condition}. Verified sellers, buyer protection. Free shipping on orders $50+.',
  category: 'Buy {name} at the best prices. Verified sellers, secure payments, buyer protection. Browse thousands of cards on {site}.',
  collection: 'Explore our curated collection of {name}. {description}',
  comparison: 'Compare {name}. Data-driven analysis to help you make informed decisions.',
  guide: 'Learn about {name}. Comprehensive guide with expert insights and practical tips.',
  faq: 'Find answers to common questions about {name}. Expert answers from {site}.',
  article: '{description}',
  landing: '{description}',
  profile: 'View {name} on {site}. {description}',
  transactional: '{name} on {site}.',
};

// ============= Max Lengths =============
export const SEO_LIMITS = {
  titleMax: 60,
  descriptionMax: 160,
  keywordsMax: 10,
  faqsMax: 10,
} as const;
