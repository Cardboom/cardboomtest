import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '@/lib/seoUtils';

interface PaginationSEOProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  /** Query params to preserve (excluding page) */
  preserveParams?: Record<string, string>;
}

/**
 * SEO component for paginated content
 * Adds rel="next" and rel="prev" links for proper crawling
 */
export const PaginationSEO = ({
  currentPage,
  totalPages,
  basePath,
  preserveParams = {},
}: PaginationSEOProps) => {
  const buildUrl = (page: number) => {
    const params = new URLSearchParams(preserveParams);
    if (page > 1) {
      params.set('page', String(page));
    }
    const queryString = params.toString();
    const path = queryString ? `${basePath}?${queryString}` : basePath;
    return `${SITE_URL}${path}`;
  };

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <Helmet>
      {/* Canonical for current page */}
      <link rel="canonical" href={buildUrl(currentPage)} />
      
      {/* Previous page link */}
      {hasPrev && (
        <link rel="prev" href={buildUrl(currentPage - 1)} />
      )}
      
      {/* Next page link */}
      {hasNext && (
        <link rel="next" href={buildUrl(currentPage + 1)} />
      )}
    </Helmet>
  );
};

export default PaginationSEO;
