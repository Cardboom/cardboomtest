/**
 * useSEO Hook
 * Simplified hook for consuming UniversalSEO across all pages
 */

import { useMemo } from 'react';
import type { SEOPageData, PageIntent, BreadcrumbItem } from '@/lib/seo/types';
import { VERTICAL_CONFIG, URL_TO_DB_CATEGORY } from '@/lib/seo/config';
import { generateTitle, generateDescription, generateKeywords, generateFAQs } from '@/lib/seo/contentGenerator';
import { generateBreadcrumbs, generateCanonicalUrl, shouldNoIndex } from '@/lib/seo/internalLinking';
import { generateSchemas } from '@/lib/seo/schemaGenerator';

interface UseSEOOptions {
  /** Page intent determines SEO strategy */
  intent: PageIntent;
  /** Primary entity name */
  entityName: string;
  /** Unique identifier/slug */
  identifier: string;
  /** Category/vertical (e.g., 'pokemon', 'mtg') */
  category?: string;
  /** Subcategory or set name */
  subcategory?: string;
  /** Entity type for schema */
  entityType?: string;
  /** Primary image URL */
  image?: string;
  /** Pricing data */
  pricing?: {
    current?: number;
    low?: number;
    high?: number;
    currency?: string;
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
    offerCount?: number;
    condition?: 'new' | 'used' | 'refurbished';
  };
  /** Rating data */
  rating?: {
    value: number;
    count: number;
  };
  /** Date information */
  dates?: {
    published?: string;
    modified?: string;
  };
  /** Custom FAQs (overrides generated) */
  faqs?: Array<{ question: string; answer: string }>;
  /** Additional keywords */
  keywords?: string[];
  /** Custom meta overrides */
  customMeta?: {
    title?: string;
    description?: string;
    noIndex?: boolean;
    noFollow?: boolean;
    canonicalOverride?: string;
  };
  /** Custom breadcrumbs (overrides generated) */
  breadcrumbs?: BreadcrumbItem[];
  /** Item count for collection pages */
  itemCount?: number;
}

interface SEOResult {
  /** Prepared SEOPageData for UniversalSEO component */
  data: SEOPageData;
  /** Generated breadcrumbs */
  breadcrumbs: BreadcrumbItem[];
  /** Generated title */
  title: string;
  /** Generated description */
  description: string;
  /** Generated keywords */
  keywords: string[];
  /** Generated FAQs */
  faqs: Array<{ question: string; answer: string }>;
  /** Canonical URL */
  canonicalUrl: string;
  /** Whether page should be noindexed */
  shouldNoIndex: boolean;
  /** Generated schemas as objects */
  schemas: object[];
  /** Item count (passed through) */
  itemCount?: number;
}

/**
 * Hook to generate all SEO data for a page
 * Use with UniversalSEO component for complete SEO coverage
 */
export function useSEO(options: UseSEOOptions): SEOResult {
  return useMemo(() => {
    // Normalize category from URL format to DB format
    const normalizedCategory = options.category 
      ? URL_TO_DB_CATEGORY[options.category] || options.category 
      : undefined;
    
    // Get vertical config for additional metadata
    const verticalConfig = normalizedCategory ? VERTICAL_CONFIG[normalizedCategory] : undefined;
    
    // Build SEOPageData
    const data: SEOPageData = {
      intent: options.intent,
      entityName: options.entityName,
      identifier: options.identifier,
      category: normalizedCategory,
      subcategory: options.subcategory || verticalConfig?.displayName,
      entityType: options.entityType || verticalConfig?.displayName,
      image: options.image,
      pricing: options.pricing,
      rating: options.rating,
      dates: options.dates,
      faqs: options.faqs,
      keywords: [
        ...(options.keywords || []),
        ...(verticalConfig?.keywords || []),
      ],
      customMeta: options.customMeta,
    };
    
    // Generate all SEO content
    const title = generateTitle(data);
    const description = generateDescription(data);
    const keywords = generateKeywords(data);
    const faqs = generateFAQs(data);
    
    // Generate breadcrumbs
    const breadcrumbs = options.breadcrumbs || generateBreadcrumbs(data);
    
    // Generate canonical URL
    const canonicalUrl = options.customMeta?.canonicalOverride || 
      generateCanonicalUrl(`/${options.identifier}`);
    
    // Check noindex
    const noIndex = options.customMeta?.noIndex || shouldNoIndex(`/${options.identifier}`);
    
    // Generate schemas with FAQs
    const dataWithFaqs = { ...data, faqs };
    const schemas = generateSchemas(dataWithFaqs, breadcrumbs, options.itemCount);
    
    return {
      data: dataWithFaqs,
      breadcrumbs,
      title,
      description,
      keywords,
      faqs,
      canonicalUrl,
      shouldNoIndex: noIndex,
      schemas,
      itemCount: options.itemCount,
    };
  }, [
    options.intent,
    options.entityName,
    options.identifier,
    options.category,
    options.subcategory,
    options.entityType,
    options.image,
    options.pricing,
    options.rating,
    options.dates,
    options.faqs,
    options.keywords,
    options.customMeta,
    options.breadcrumbs,
    options.itemCount,
  ]);
}

/**
 * Quick helper for product pages
 */
export function useProductSEO(
  name: string,
  category: string,
  slug: string,
  options?: Partial<Omit<UseSEOOptions, 'intent' | 'entityName' | 'identifier' | 'category'>>
) {
  return useSEO({
    intent: 'product',
    entityName: name,
    identifier: `cards/${category}/${slug}`,
    category,
    ...options,
  });
}

/**
 * Quick helper for category pages
 */
export function useCategorySEO(
  categorySlug: string,
  options?: Partial<Omit<UseSEOOptions, 'intent' | 'identifier' | 'category'>>
) {
  const normalizedCategory = URL_TO_DB_CATEGORY[categorySlug] || categorySlug;
  const verticalConfig = VERTICAL_CONFIG[normalizedCategory];
  
  return useSEO({
    intent: 'category',
    entityName: verticalConfig?.pluralName || `${categorySlug} Cards`,
    identifier: `buy/${categorySlug}-cards`,
    category: normalizedCategory,
    ...options,
  });
}

/**
 * Quick helper for article/guide pages
 */
export function useArticleSEO(
  title: string,
  slug: string,
  options?: Partial<Omit<UseSEOOptions, 'intent' | 'entityName' | 'identifier'>>
) {
  return useSEO({
    intent: options?.faqs?.length ? 'guide' : 'article',
    entityName: title,
    identifier: slug,
    ...options,
  });
}

/**
 * Quick helper for collection/longtail pages
 */
export function useCollectionSEO(
  title: string,
  slug: string,
  options?: Partial<Omit<UseSEOOptions, 'intent' | 'entityName' | 'identifier'>>
) {
  return useSEO({
    intent: 'collection',
    entityName: title,
    identifier: `deals/${slug}`,
    ...options,
  });
}

export default useSEO;
