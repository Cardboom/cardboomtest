import { Helmet } from 'react-helmet-async';
import { generateProductSchema, generateTitle, generateMetaDescription, generateCanonicalUrl, SITE_URL } from '@/lib/seoUtils';

interface ProductSchemaProps {
  name: string;
  description?: string;
  image?: string;
  category: string;
  sku?: string;
  lowPrice?: number;
  highPrice?: number;
  offerCount?: number;
  inStock?: boolean;
  ratingValue?: number;
  reviewCount?: number;
  condition?: string;
  canonicalPath: string;
}

/**
 * SEO-optimized Product schema component
 * Generates Product structured data with AggregateOffer for rich results
 */
export const ProductSchema = ({
  name,
  description,
  image,
  category,
  sku,
  lowPrice,
  highPrice,
  offerCount,
  inStock = false,
  ratingValue,
  reviewCount,
  condition,
  canonicalPath,
}: ProductSchemaProps) => {
  const pageTitle = generateTitle({
    type: 'product',
    name,
    category,
    condition,
  });

  const pageDescription = description || generateMetaDescription({
    type: 'product',
    name,
    category,
    lowPrice,
    highPrice,
    condition,
  });

  const canonicalUrl = generateCanonicalUrl(canonicalPath);

  const schema = generateProductSchema({
    name,
    description: pageDescription,
    image,
    category,
    sku,
    lowPrice,
    highPrice,
    offerCount,
    availability: inStock ? 'InStock' : 'OutOfStock',
    ratingValue,
    reviewCount,
    condition,
  });

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph */}
      <meta property="og:type" content="product" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={canonicalUrl} />
      {image && <meta property="og:image" content={image} />}
      
      {/* Product specific OG */}
      {lowPrice && <meta property="product:price:amount" content={String(lowPrice)} />}
      <meta property="product:price:currency" content="USD" />
      <meta property="product:availability" content={inStock ? 'in stock' : 'out of stock'} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      {image && <meta name="twitter:image" content={image} />}
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export default ProductSchema;
