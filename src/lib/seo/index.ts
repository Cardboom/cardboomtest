/**
 * Programmatic SEO Module
 * Central export for all SEO utilities
 */

// Types
export * from './types';

// Configuration
export * from './config';

// Content Generation
export * from './contentGenerator';

// Schema Generation
export * from './schemaGenerator';

// Internal Linking
export * from './internalLinking';

// ============= Quick Access Utilities =============
import { SITE_CONFIG, VERTICAL_CONFIG, URL_TO_DB_CATEGORY } from './config';
import { generateCanonicalUrl, shouldNoIndex } from './internalLinking';
import { generateTitle, generateDescription, generateFAQs, generateSEOContent } from './contentGenerator';
import { generateSchemas, generateBreadcrumbSchema, generateFAQSchema } from './schemaGenerator';

// Re-export commonly used constants with legacy names for backwards compatibility
export const SITE_URL = SITE_CONFIG.url;
export const SITE_NAME = SITE_CONFIG.name;
export const CATEGORY_SEO_DATA = VERTICAL_CONFIG;
export const PRECONNECT_DOMAINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://kgffwhyfgkqeevsuhldt.supabase.co',
  'https://images.ygoprodeck.com',
  'https://images.tcggo.com',
] as const;

// ============= Legacy Function Wrappers =============
// These maintain backwards compatibility with existing code

export function generateBreadcrumbSchemaLegacy(items: Array<{ name: string; url: string }>) {
  return generateBreadcrumbSchema(items);
}

export function generateProductSchemaLegacy(product: {
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
  return generateSchemas({
    intent: 'product',
    entityName: product.name,
    identifier: product.sku || product.name,
    category: product.category,
    image: product.image,
    pricing: {
      low: product.lowPrice,
      high: product.highPrice,
      offerCount: product.offerCount,
      availability: product.availability,
      condition: product.condition as 'new' | 'used' | 'refurbished' | undefined,
    },
    rating: product.ratingValue ? {
      value: product.ratingValue,
      count: product.reviewCount || 0,
    } : undefined,
    customMeta: {
      description: product.description,
    },
  })[0];
}

export function generateCollectionPageSchemaLegacy(category: string, itemCount: number) {
  const vertical = VERTICAL_CONFIG[category];
  return generateSchemas({
    intent: 'category',
    entityName: vertical?.pluralName || `${category} Cards`,
    identifier: category,
    category,
  }, undefined, itemCount)[0];
}

export function generateFAQSchemaLegacy(faqs: Array<{ question: string; answer: string }>) {
  return generateFAQSchema(faqs);
}

export function generateArticleSchemaLegacy(article: {
  headline: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  url: string;
}) {
  return generateSchemas({
    intent: 'article',
    entityName: article.headline,
    identifier: article.url,
    image: article.image,
    dates: {
      published: article.datePublished,
      modified: article.dateModified,
    },
    customMeta: {
      description: article.description,
      canonicalOverride: article.url,
    },
  })[0];
}

export function generateTitleLegacy(options: {
  type: 'product' | 'category' | 'article' | 'page';
  name: string;
  category?: string;
  condition?: string;
}): string {
  const intentMap = {
    product: 'product',
    category: 'category',
    article: 'article',
    page: 'landing',
  } as const;
  
  return generateTitle({
    intent: intentMap[options.type],
    entityName: options.name,
    identifier: options.name,
    category: options.category,
    pricing: options.condition ? { condition: options.condition as 'new' | 'used' } : undefined,
  });
}

export function generateMetaDescriptionLegacy(options: {
  type: 'product' | 'category' | 'article';
  name: string;
  category?: string;
  lowPrice?: number;
  highPrice?: number;
  condition?: string;
  excerpt?: string;
}): string {
  const intentMap = {
    product: 'product',
    category: 'category',
    article: 'article',
  } as const;
  
  return generateDescription({
    intent: intentMap[options.type],
    entityName: options.name,
    identifier: options.name,
    category: options.category,
    pricing: {
      low: options.lowPrice,
      high: options.highPrice,
      condition: options.condition as 'new' | 'used' | undefined,
    },
    customMeta: options.excerpt ? { description: options.excerpt } : undefined,
  });
}

export { generateCanonicalUrl, shouldNoIndex };

// ============= Utility: URL to DB Category =============
export function urlCategoryToDbCategory(urlCategory: string): string {
  const normalized = urlCategory.toLowerCase();
  return URL_TO_DB_CATEGORY[normalized] || normalized;
}

// ============= Utility: Get Vertical Config =============
export function getVerticalConfig(category: string) {
  const dbCategory = URL_TO_DB_CATEGORY[category] || category;
  return VERTICAL_CONFIG[dbCategory] || null;
}
