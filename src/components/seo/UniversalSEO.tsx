/**
 * Universal SEO Page Wrapper
 * Single component for all SEO concerns: metadata, schema, canonicals, OG tags
 */

import { Helmet } from 'react-helmet-async';
import type { SEOPageData, BreadcrumbItem } from '@/lib/seo/types';
import { SITE_CONFIG, PRECONNECT_DOMAINS } from '@/lib/seo/config';
import { generateSEOContent, generateTitle, generateDescription, generateFAQs } from '@/lib/seo/contentGenerator';
import { generateSchemas, serializeSchemas } from '@/lib/seo/schemaGenerator';
import { generateBreadcrumbs, generateCanonicalUrl, shouldNoIndex } from '@/lib/seo/internalLinking';

interface UniversalSEOProps {
  /** Page data for SEO generation */
  data: SEOPageData;
  /** Custom breadcrumb override */
  breadcrumbs?: BreadcrumbItem[];
  /** Item count for collection pages */
  itemCount?: number;
  /** Include global preconnects */
  includePreconnects?: boolean;
  /** Include AEO meta tags */
  includeAEO?: boolean;
}

/**
 * Universal SEO component that handles all SEO concerns for any page type
 */
export const UniversalSEO = ({
  data,
  breadcrumbs,
  itemCount,
  includePreconnects = false,
  includeAEO = false,
}: UniversalSEOProps) => {
  // Generate content
  const title = generateTitle(data);
  const description = generateDescription(data);
  const faqs = generateFAQs(data);
  
  // Generate breadcrumbs
  const crumbs = breadcrumbs || generateBreadcrumbs(data);
  
  // Generate schemas
  const dataWithFaqs = { ...data, faqs };
  const schemas = generateSchemas(dataWithFaqs, crumbs, itemCount);
  const serializedSchemas = serializeSchemas(schemas);
  
  // Generate canonical URL
  const canonicalUrl = data.customMeta?.canonicalOverride || 
    generateCanonicalUrl(`/${data.identifier}`);
  
  // Determine indexability
  const noIndex = data.customMeta?.noIndex || shouldNoIndex(`/${data.identifier}`);
  const noFollow = data.customMeta?.noFollow || false;
  const robotsContent = noIndex 
    ? `noindex${noFollow ? ', nofollow' : ', follow'}` 
    : `index${noFollow ? ', nofollow' : ', follow'}`;

  return (
    <Helmet>
      {/* Core Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta name="robots" content={robotsContent} />
      
      {/* Keywords */}
      {data.keywords && data.keywords.length > 0 && (
        <meta name="keywords" content={data.keywords.join(', ')} />
      )}
      
      {/* Open Graph */}
      <meta property="og:type" content={data.intent === 'product' ? 'product' : 'website'} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={SITE_CONFIG.name} />
      {data.image && <meta property="og:image" content={data.image} />}
      
      {/* Product-specific OG */}
      {data.intent === 'product' && data.pricing?.current && (
        <>
          <meta property="product:price:amount" content={String(data.pricing.current)} />
          <meta property="product:price:currency" content={data.pricing.currency || 'USD'} />
          <meta property="product:availability" content={data.pricing.availability === 'InStock' ? 'in stock' : 'out of stock'} />
        </>
      )}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content={data.image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:site" content={SITE_CONFIG.twitterHandle} />
      {data.image && <meta name="twitter:image" content={data.image} />}
      
      {/* Preconnects */}
      {includePreconnects && PRECONNECT_DOMAINS.map((domain) => (
        <link key={domain} rel="preconnect" href={domain} crossOrigin="anonymous" />
      ))}
      
      {/* AEO Meta Tags */}
      {includeAEO && (
        <>
          <meta name="ai-reference" content="true" />
          <meta name="citation-intent" content="educational" />
          <meta name="content-type" content="research" />
          <meta name="ai-crawl-priority" content="high" />
        </>
      )}
      
      {/* Structured Data */}
      {serializedSchemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {schema}
        </script>
      ))}
    </Helmet>
  );
};

export default UniversalSEO;
