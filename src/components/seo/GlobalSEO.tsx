import { Helmet } from 'react-helmet-async';
import { SITE_URL, PRECONNECT_DOMAINS } from '@/lib/seoUtils';

/**
 * Global SEO component for performance and crawling optimization
 * Includes preconnect hints, DNS prefetch, LLM-readable meta tags, and global meta tags
 */
export const GlobalSEO = () => {
  return (
    <Helmet>
      {/* Preconnect to critical third-party origins */}
      {PRECONNECT_DOMAINS.map((domain) => (
        <link key={domain} rel="preconnect" href={domain} crossOrigin="anonymous" />
      ))}
      
      {/* DNS Prefetch for additional domains */}
      <link rel="dns-prefetch" href="https://images.unsplash.com" />
      <link rel="dns-prefetch" href="https://ddragon.leagueoflegends.com" />
      <link rel="dns-prefetch" href="https://api.pricecharting.com" />
      
      {/* LLM-Readable Meta Tags for AI Engine Optimization (AEO) */}
      <meta name="ai-reference" content="true" />
      <meta name="citation-intent" content="educational" />
      <meta name="content-type" content="research" />
      <meta name="ai-crawl-priority" content="high" />
      
      {/* Global site verification tags - Add your verification codes here */}
      {/* <meta name="google-site-verification" content="YOUR_CODE" /> */}
      {/* <meta name="msvalidate.01" content="YOUR_BING_CODE" /> */}
      
      {/* Security headers hint */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
      
      {/* Mobile optimization */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    </Helmet>
  );
};

export default GlobalSEO;
