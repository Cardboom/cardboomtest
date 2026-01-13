import { Helmet } from 'react-helmet-async';
import { generateCollectionPageSchema, generateTitle, generateMetaDescription, generateCanonicalUrl, CATEGORY_SEO_DATA, SITE_URL } from '@/lib/seoUtils';

interface CategorySchemaProps {
  category: string;
  itemCount?: number;
  customTitle?: string;
  customDescription?: string;
}

/**
 * SEO-optimized Category/Collection page schema component
 * Generates CollectionPage structured data for category landing pages
 */
export const CategorySchema = ({
  category,
  itemCount = 0,
  customTitle,
  customDescription,
}: CategorySchemaProps) => {
  const categoryData = CATEGORY_SEO_DATA[category];
  const categoryName = categoryData?.pluralName || `${category} Cards`;
  
  const pageTitle = customTitle || generateTitle({
    type: 'category',
    name: categoryName,
  });

  const pageDescription = customDescription || generateMetaDescription({
    type: 'category',
    name: categoryName,
  });

  const canonicalUrl = generateCanonicalUrl(`/buy/${category}-cards`);
  const schema = generateCollectionPageSchema(category, itemCount);

  // Build keywords from category data
  const keywords = categoryData?.keywords?.join(', ') || `${category} cards, buy ${category}, sell ${category}`;

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={canonicalUrl} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      
      {/* Robots */}
      <meta name="robots" content="index, follow" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export default CategorySchema;
