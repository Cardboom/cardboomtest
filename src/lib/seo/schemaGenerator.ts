/**
 * Schema.org Structured Data Generator
 * Generates JSON-LD schemas for various page types
 */

import type { 
  SEOPageData, 
  BreadcrumbItem, 
  FAQItem,
  SchemaType 
} from './types';
import { SITE_CONFIG, PAGE_TEMPLATES } from './config';

// ============= Organization Schema (Singleton) =============
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_CONFIG.url}/#organization`,
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}/logo.png`,
    description: 'AI-assisted trading card grading and marketplace for collectibles',
    foundingDate: String(SITE_CONFIG.foundingYear),
    areaServed: 'Worldwide',
    sameAs: [
      'https://twitter.com/cardboom',
      'https://www.linkedin.com/company/cardboom',
    ],
  };
}

// ============= Breadcrumb Schema =============
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_CONFIG.url}${item.url}`,
    })),
  };
}

// ============= Product Schema =============
export function generateProductSchema(data: SEOPageData) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: data.entityName,
    description: data.customMeta?.description || `${data.entityName} trading card`,
    image: data.image,
    sku: data.identifier,
    brand: {
      '@type': 'Brand',
      name: data.entityType || data.category || SITE_CONFIG.name,
    },
    category: data.subcategory || data.category,
  };
  
  // Add offers if pricing available
  if (data.pricing) {
    if (data.pricing.offerCount && data.pricing.offerCount > 1) {
      schema.offers = {
        '@type': 'AggregateOffer',
        priceCurrency: data.pricing.currency || 'USD',
        lowPrice: data.pricing.low || data.pricing.current,
        highPrice: data.pricing.high || data.pricing.current,
        offerCount: data.pricing.offerCount,
        availability: `https://schema.org/${data.pricing.availability || 'OutOfStock'}`,
      };
    } else if (data.pricing.current) {
      schema.offers = {
        '@type': 'Offer',
        priceCurrency: data.pricing.currency || 'USD',
        price: data.pricing.current,
        availability: `https://schema.org/${data.pricing.availability || 'OutOfStock'}`,
      };
    }
  }
  
  // Add rating if available
  if (data.rating && data.rating.count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: data.rating.value,
      reviewCount: data.rating.count,
      bestRating: data.rating.best || 5,
      worstRating: data.rating.worst || 1,
    };
  }
  
  // Add condition if available
  if (data.pricing?.condition) {
    const conditionMap = {
      new: 'NewCondition',
      used: 'UsedCondition',
      refurbished: 'RefurbishedCondition',
    };
    schema.itemCondition = `https://schema.org/${conditionMap[data.pricing.condition]}`;
  }
  
  return schema;
}

// ============= Collection Page Schema =============
export function generateCollectionPageSchema(
  data: SEOPageData,
  itemCount: number = 0
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: data.entityName,
    description: data.customMeta?.description || `Shop ${data.entityName} at the best prices`,
    url: data.customMeta?.canonicalOverride || `${SITE_CONFIG.url}/buy/${data.identifier}`,
    numberOfItems: itemCount,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: itemCount,
      itemListElement: [], // Populated client-side or via SSR
    },
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
  };
}

// ============= FAQ Schema =============
export function generateFAQSchema(faqs: FAQItem[]) {
  if (!faqs || faqs.length === 0) return null;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// ============= Article Schema =============
export function generateArticleSchema(data: SEOPageData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.entityName,
    description: data.customMeta?.description,
    image: data.image,
    datePublished: data.dates?.published || new Date().toISOString(),
    dateModified: data.dates?.modified || data.dates?.published || new Date().toISOString(),
    author: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_CONFIG.url}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': data.customMeta?.canonicalOverride || `${SITE_CONFIG.url}/${data.identifier}`,
    },
  };
}

// ============= WebPage Schema (Educational) =============
export function generateWebPageSchema(
  data: SEOPageData,
  breadcrumbs?: BreadcrumbItem[]
) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: data.entityName,
    description: data.customMeta?.description,
    url: data.customMeta?.canonicalOverride || `${SITE_CONFIG.url}/${data.identifier}`,
    datePublished: data.dates?.published || '2024-01-01',
    dateModified: data.dates?.modified || new Date().toISOString().split('T')[0],
    inLanguage: 'en',
    isAccessibleForFree: true,
    publisher: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
      '@id': `${SITE_CONFIG.url}/#organization`,
    },
  };
  
  // Add educational metadata for guide/comparison pages
  if (data.intent === 'guide' || data.intent === 'comparison') {
    schema.educationalUse = 'research';
    schema.learningResourceType = 'guide';
    schema.audience = {
      '@type': 'Audience',
      audienceType: 'Trading Card Collectors',
    };
  }
  
  // Add keywords
  if (data.keywords && data.keywords.length > 0) {
    schema.keywords = data.keywords;
  }
  
  // Add breadcrumb
  if (breadcrumbs && breadcrumbs.length > 0) {
    schema.breadcrumb = generateBreadcrumbSchema(breadcrumbs);
  }
  
  return schema;
}

// ============= Dataset Schema (for comparison/research pages) =============
export function generateDatasetSchema(data: SEOPageData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: data.entityName,
    description: data.customMeta?.description || `Research data for ${data.entityName}`,
    url: data.customMeta?.canonicalOverride || `${SITE_CONFIG.url}/${data.identifier}`,
    dateModified: data.dates?.modified || new Date().toISOString().split('T')[0],
    creator: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    keywords: data.keywords || [],
    isAccessibleForFree: true,
    inLanguage: 'en',
    license: 'https://creativecommons.org/licenses/by-nc/4.0/',
  };
}

// ============= Combined Schema Generator =============
export function generateSchemas(
  data: SEOPageData,
  breadcrumbs?: BreadcrumbItem[],
  itemCount?: number
): object[] {
  const config = PAGE_TEMPLATES[data.intent];
  const schemas: object[] = [];
  
  config.schemaTypes.forEach(schemaType => {
    switch (schemaType) {
      case 'Product':
        schemas.push(generateProductSchema(data));
        break;
      case 'CollectionPage':
        schemas.push(generateCollectionPageSchema(data, itemCount));
        break;
      case 'FAQPage':
        const faqSchema = generateFAQSchema(data.faqs || []);
        if (faqSchema) schemas.push(faqSchema);
        break;
      case 'Article':
        schemas.push(generateArticleSchema(data));
        break;
      case 'WebPage':
        schemas.push(generateWebPageSchema(data, breadcrumbs));
        break;
      case 'Dataset':
        schemas.push(generateDatasetSchema(data));
        break;
      case 'BreadcrumbList':
        if (breadcrumbs && breadcrumbs.length > 0) {
          schemas.push(generateBreadcrumbSchema(breadcrumbs));
        }
        break;
      // Organization is handled globally
    }
  });
  
  return schemas;
}

// ============= Schema Serialization =============
export function serializeSchemas(schemas: object[]): string[] {
  return schemas.map(schema => JSON.stringify(schema));
}
