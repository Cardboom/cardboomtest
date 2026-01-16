/**
 * SEO Utilities for CardBoom
 * Centralized functions for generating structured data, meta tags, and SEO-friendly content
 */

// Base URL for the site
export const SITE_URL = 'https://cardboom.com';
export const SITE_NAME = 'CardBoom';

// Category display names and slugs
export const CATEGORY_SEO_DATA: Record<string, { 
  name: string; 
  pluralName: string;
  description: string;
  keywords: string[];
}> = {
  pokemon: {
    name: 'Pokemon',
    pluralName: 'Pokemon Cards',
    description: 'Buy and sell Pokemon TCG cards including vintage Base Set, Sword & Shield, Scarlet & Violet, and rare Japanese exclusives.',
    keywords: ['pokemon cards', 'pokemon tcg', 'charizard', 'pikachu', 'japanese pokemon cards', 'psa pokemon'],
  },
  mtg: {
    name: 'Magic: The Gathering',
    pluralName: 'MTG Cards',
    description: 'Find Magic: The Gathering cards from all sets. Alpha, Beta, Modern, Legacy, and Commander staples at competitive prices.',
    keywords: ['mtg cards', 'magic the gathering', 'black lotus', 'commander cards', 'modern mtg'],
  },
  yugioh: {
    name: 'Yu-Gi-Oh!',
    pluralName: 'Yu-Gi-Oh! Cards',
    description: 'Shop Yu-Gi-Oh! cards including Blue-Eyes White Dragon, Dark Magician, and tournament-ready competitive decks.',
    keywords: ['yugioh cards', 'yu-gi-oh', 'blue-eyes white dragon', 'dark magician', 'yugioh tcg'],
  },
  onepiece: {
    name: 'One Piece',
    pluralName: 'One Piece Cards',
    description: 'One Piece TCG cards featuring Luffy, Zoro, and the Straw Hat crew. Find rare pulls and complete your collection.',
    keywords: ['one piece cards', 'one piece tcg', 'luffy card', 'manga cards', 'anime tcg'],
  },
  lorcana: {
    name: 'Disney Lorcana',
    pluralName: 'Lorcana Cards',
    description: 'Disney Lorcana trading cards featuring beloved Disney characters. Find enchanted rare cards and starter decks.',
    keywords: ['lorcana cards', 'disney lorcana', 'disney tcg', 'lorcana enchanted'],
  },
  nba: {
    name: 'NBA',
    pluralName: 'NBA Cards',
    description: 'NBA basketball cards including rookies, autographs, and legendary players. Topps, Panini, and premium parallels.',
    keywords: ['nba cards', 'basketball cards', 'nba rookie cards', 'panini prizm', 'sports cards'],
  },
  football: {
    name: 'Football',
    pluralName: 'Football Cards',
    description: 'NFL and soccer football cards. Find Patrick Mahomes, rookie cards, and international soccer star collectibles.',
    keywords: ['football cards', 'nfl cards', 'soccer cards', 'panini football', 'sports trading cards'],
  },
  figures: {
    name: 'Figures',
    pluralName: 'Collectible Figures',
    description: 'Collectible figures and toys including Funko Pop, anime figures, and limited edition statues.',
    keywords: ['collectible figures', 'funko pop', 'anime figures', 'limited edition collectibles'],
  },
  digimon: {
    name: 'Digimon',
    pluralName: 'Digimon Cards',
    description: 'Digimon TCG cards featuring classic and new Digimon. Find rare alternate arts and competitive deck staples.',
    keywords: ['digimon cards', 'digimon tcg', 'digimon card game'],
  },
  dragonball: {
    name: 'Dragon Ball',
    pluralName: 'Dragon Ball Cards',
    description: 'Dragon Ball Super Card Game and DBS Fusion World cards. Goku, Vegeta, and Saiyan collectibles.',
    keywords: ['dragon ball cards', 'dbs cards', 'goku cards', 'anime trading cards'],
  },
};

/**
 * Generate BreadcrumbList structured data
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

/**
 * Generate Product structured data with full AggregateOffer support
 */
export function generateProductSchema(product: {
  name: string;
  description: string;
  image?: string;
  category: string;
  sku?: string;
  lowPrice?: number;
  highPrice?: number;
  offerCount?: number;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  ratingValue?: number;
  reviewCount?: number;
  condition?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description,
    "image": product.image,
    "sku": product.sku,
    "brand": {
      "@type": "Brand",
      "name": CATEGORY_SEO_DATA[product.category]?.name || product.category,
    },
    "category": CATEGORY_SEO_DATA[product.category]?.pluralName || product.category,
    ...(product.condition && {
      "itemCondition": `https://schema.org/${product.condition === 'new' ? 'NewCondition' : 'UsedCondition'}`,
    }),
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "USD",
      "lowPrice": product.lowPrice,
      "highPrice": product.highPrice || product.lowPrice,
      "offerCount": product.offerCount || 0,
      "availability": `https://schema.org/${product.availability || 'OutOfStock'}`,
    },
    ...(product.ratingValue && product.reviewCount && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": product.ratingValue,
        "reviewCount": product.reviewCount,
        "bestRating": 5,
        "worstRating": 1,
      },
    }),
  };
}

/**
 * Generate CollectionPage structured data for category pages
 */
export function generateCollectionPageSchema(category: string, itemCount: number) {
  const categoryData = CATEGORY_SEO_DATA[category];
  
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `Buy ${categoryData?.pluralName || category} Online`,
    "description": categoryData?.description || `Shop ${category} cards and collectibles at the best prices.`,
    "url": `${SITE_URL}/buy/${category}-cards`,
    "numberOfItems": itemCount,
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": itemCount,
      "itemListElement": [], // Populated dynamically on the page
    },
    "isPartOf": {
      "@type": "WebSite",
      "name": SITE_NAME,
      "url": SITE_URL,
    },
  };
}

/**
 * Generate FAQ structured data
 */
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };
}

/**
 * Generate Article structured data
 */
export function generateArticleSchema(article: {
  headline: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.headline,
    "description": article.description,
    "image": article.image,
    "datePublished": article.datePublished,
    "dateModified": article.dateModified || article.datePublished,
    "author": {
      "@type": "Organization",
      "name": SITE_NAME,
      "url": SITE_URL,
    },
    "publisher": {
      "@type": "Organization",
      "name": SITE_NAME,
      "url": SITE_URL,
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_URL}/logo.png`,
      },
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": article.url.startsWith('http') ? article.url : `${SITE_URL}${article.url}`,
    },
  };
}

/**
 * Generate title tag following SEO best practices
 * Product: [Card Name] - Buy/Sell [Condition] | CardBoom
 * Category: Buy [Category] Cards Online - Best Prices | CardBoom
 */
export function generateTitle(options: {
  type: 'product' | 'category' | 'article' | 'page';
  name: string;
  category?: string;
  condition?: string;
}): string {
  const { type, name, category, condition } = options;
  let title = '';
  
  switch (type) {
    case 'product':
      title = condition 
        ? `${name} - Buy ${condition} | ${SITE_NAME}`
        : `${name} - Price & Value | ${SITE_NAME}`;
      break;
    case 'category':
      title = `Buy ${name} Online - Best Prices | ${SITE_NAME}`;
      break;
    case 'article':
      title = `${name} | ${SITE_NAME} Blog`;
      break;
    default:
      title = `${name} | ${SITE_NAME}`;
  }
  
  // Ensure title is under 60 characters
  if (title.length > 60) {
    title = title.substring(0, 57) + '...';
  }
  
  return title;
}

/**
 * Generate meta description following SEO best practices
 * Include price range, condition, and CTA - 150-160 chars max
 */
export function generateMetaDescription(options: {
  type: 'product' | 'category' | 'article';
  name: string;
  category?: string;
  lowPrice?: number;
  highPrice?: number;
  condition?: string;
  excerpt?: string;
}): string {
  const { type, name, category, lowPrice, highPrice, condition, excerpt } = options;
  let description = '';
  
  switch (type) {
    case 'product':
      const priceRange = lowPrice && highPrice 
        ? `from $${lowPrice.toFixed(0)}` 
        : lowPrice 
          ? `at $${lowPrice.toFixed(0)}` 
          : '';
      description = `Shop ${name} ${priceRange}. ${condition || 'All conditions available'}. Verified sellers, buyer protection. Free shipping on orders $50+.`;
      break;
    case 'category':
      description = `Buy ${name} at the best prices. Verified sellers, secure payments, buyer protection. Browse thousands of cards and collectibles on ${SITE_NAME}.`;
      break;
    case 'article':
      description = excerpt || `Read ${name} on the ${SITE_NAME} blog.`;
      break;
  }
  
  // Ensure description is under 160 characters
  if (description.length > 160) {
    description = description.substring(0, 157) + '...';
  }
  
  return description;
}

/**
 * Generate canonical URL
 */
export function generateCanonicalUrl(path: string): string {
  // Remove trailing slashes and ensure proper format
  const cleanPath = path.replace(/\/+$/, '').replace(/^\/+/, '/');
  return `${SITE_URL}${cleanPath}`;
}

/**
 * Check if a URL should be noindex (private pages)
 */
export function shouldNoIndex(path: string): boolean {
  const noIndexPaths = [
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
  ];
  
  return noIndexPaths.some(noIndexPath => path.startsWith(noIndexPath));
}

/**
 * Generate preconnect links for critical third-party domains
 */
export const PRECONNECT_DOMAINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://kgffwhyfgkqeevsuhldt.supabase.co',
  'https://images.ygoprodeck.com',
  'https://images.tcggo.com',
];

/**
 * Generate hreflang tags for internationalization
 * NOTE: Removed ?lang= query params as they create non-canonical URLs.
 * Currently returns only the canonical English version.
 * For proper i18n, use path-based localization (e.g., /de/, /tr/).
 */
export function generateHreflangTags(path: string): Array<{ lang: string; href: string }> {
  // Only return canonical URL - query param based lang is not recommended for SEO
  return [{ lang: 'en', href: `${SITE_URL}${path}` }];
}

/**
 * Generate Dataset structured data for comparison tables
 * Used on research/comparison pages for LLM citations
 */
export function generateDatasetSchema(options: {
  name: string;
  description: string;
  url: string;
  dateModified?: string;
  creator?: string;
  keywords?: string[];
  variableMeasured?: string[];
  license?: string;
}) {
  const { name, description, url, dateModified, creator, keywords, variableMeasured, license } = options;
  
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "name": name,
    "description": description,
    "url": url.startsWith('http') ? url : `${SITE_URL}${url}`,
    "dateModified": dateModified || new Date().toISOString().split('T')[0],
    "creator": {
      "@type": "Organization",
      "name": creator || SITE_NAME,
      "url": SITE_URL,
    },
    "publisher": {
      "@type": "Organization",
      "name": SITE_NAME,
      "url": SITE_URL,
    },
    "keywords": keywords || [],
    "variableMeasured": variableMeasured || [],
    "license": license || "https://creativecommons.org/licenses/by-nc/4.0/",
    "isAccessibleForFree": true,
    "inLanguage": "en",
  };
}

/**
 * Generate WebPage with educational intent for research pages
 * Optimized for LLM/AI citation and educational content recognition
 */
export function generateEducationalWebPageSchema(options: {
  name: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  breadcrumb?: Array<{ name: string; url: string }>;
  keywords?: string[];
  about?: string[];
}) {
  const { name, description, url, datePublished, dateModified, breadcrumb, keywords, about } = options;
  
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": name,
    "description": description,
    "url": url.startsWith('http') ? url : `${SITE_URL}${url}`,
    "datePublished": datePublished || "2024-01-01",
    "dateModified": dateModified || new Date().toISOString().split('T')[0],
    "inLanguage": "en",
    "isAccessibleForFree": true,
    "educationalUse": "research",
    "learningResourceType": "guide",
    "audience": {
      "@type": "Audience",
      "audienceType": "Trading Card Collectors"
    },
    "publisher": {
      "@type": "Organization",
      "name": SITE_NAME,
      "url": SITE_URL,
      "@id": `${SITE_URL}/#organization`
    },
    "mainEntity": {
      "@type": "Thing",
      "name": name,
      "description": description,
    },
  };

  if (keywords && keywords.length > 0) {
    schema.keywords = keywords;
  }

  if (about && about.length > 0) {
    schema.about = about.map(topic => ({
      "@type": "Thing",
      "name": topic,
    }));
  }

  if (breadcrumb && breadcrumb.length > 0) {
    schema.breadcrumb = {
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumb.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
      })),
    };
  }

  return schema;
}

/**
 * Generate Organization reference schema (for pages that need to reference the org)
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    "name": SITE_NAME,
    "url": SITE_URL,
    "logo": `${SITE_URL}/logo.png`,
    "description": "AI-assisted trading card grading and marketplace for collectibles",
    "foundingDate": "2024",
    "areaServed": "Worldwide",
    "sameAs": [
      "https://github.com/cardboom",
      "https://medium.com/@cardboom",
      "https://www.reddit.com/r/cardboom",
      "https://www.linkedin.com/company/cardboom",
      "https://twitter.com/cardboom"
    ]
  };
}
