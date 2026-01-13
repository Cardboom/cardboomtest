import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { SITE_URL } from '@/lib/seoUtils';

/**
 * Params that should trigger noindex to avoid duplicate content
 */
const NOINDEX_PARAMS = [
  'sort',
  'order',
  'filter',
  'min_price',
  'max_price',
  'condition',
  'grade',
  'grading_company',
  'language',
  'page', // Paginated views beyond page 1
];

/**
 * Params that are acceptable for indexing (core navigation)
 */
const INDEX_PARAMS = [
  'category',
  'search',
  'q',
];

interface FilteredPageSEOProps {
  /** Override canonical URL (useful for category pages) */
  canonicalPath?: string;
  /** Force noindex regardless of params */
  forceNoIndex?: boolean;
  /** Additional meta robots directives */
  robotsDirectives?: string[];
}

/**
 * SEO component that handles noindex for filtered/sorted URLs
 * Prevents duplicate content issues from faceted navigation
 */
export const FilteredPageSEO = ({
  canonicalPath,
  forceNoIndex = false,
  robotsDirectives = [],
}: FilteredPageSEOProps) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  // Check if any noindex params are present
  const hasNoIndexParams = NOINDEX_PARAMS.some(param => {
    const value = searchParams.get(param);
    // Page 1 is fine to index, but page 2+ should be noindex
    if (param === 'page') {
      return value && parseInt(value) > 1;
    }
    return !!value;
  });

  const shouldNoIndex = forceNoIndex || hasNoIndexParams;

  // Build canonical URL (strip noindex params, keep index params)
  const buildCanonicalUrl = () => {
    if (canonicalPath) {
      return `${SITE_URL}${canonicalPath}`;
    }

    const cleanParams = new URLSearchParams();
    INDEX_PARAMS.forEach(param => {
      const value = searchParams.get(param);
      if (value) {
        cleanParams.set(param, value);
      }
    });

    const queryString = cleanParams.toString();
    const path = queryString 
      ? `${location.pathname}?${queryString}` 
      : location.pathname;
    
    return `${SITE_URL}${path}`;
  };

  const canonicalUrl = buildCanonicalUrl();
  
  // Build robots directive
  const baseDirective = shouldNoIndex ? 'noindex, follow' : 'index, follow';
  const fullDirective = robotsDirectives.length > 0 
    ? `${baseDirective}, ${robotsDirectives.join(', ')}`
    : baseDirective;

  return (
    <Helmet>
      <link rel="canonical" href={canonicalUrl} />
      <meta name="robots" content={fullDirective} />
      
      {/* Prevent Google from auto-generating title/description from page content */}
      {shouldNoIndex && (
        <meta name="googlebot" content="noindex, nosnippet" />
      )}
    </Helmet>
  );
};

export default FilteredPageSEO;
