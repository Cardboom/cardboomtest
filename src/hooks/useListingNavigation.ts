import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { generateListingUrl, ListingUrlData } from '@/lib/listingUrl';

/**
 * Hook for navigating to listings with SEO-friendly URLs
 */
export function useListingNavigation() {
  const navigate = useNavigate();

  const navigateToListing = useCallback((listing: ListingUrlData) => {
    const url = generateListingUrl(listing);
    navigate(url);
  }, [navigate]);

  const getListingUrl = useCallback((listing: ListingUrlData): string => {
    return generateListingUrl(listing);
  }, []);

  return {
    navigateToListing,
    getListingUrl,
  };
}
