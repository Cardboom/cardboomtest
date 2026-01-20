/**
 * Retargeting Pixels Configuration
 * 
 * To set up retargeting pixels:
 * 
 * 1. Facebook Pixel:
 *    - Create a pixel at https://business.facebook.com/events_manager
 *    - Add the pixel ID to secrets as FACEBOOK_PIXEL_ID
 * 
 * 2. TikTok Pixel:
 *    - Create a pixel at https://ads.tiktok.com/
 *    - Add the pixel ID to secrets as TIKTOK_PIXEL_ID
 * 
 * These pixels are loaded via Google Tag Manager (GTM-NMK9MNXS)
 * which is already configured in index.html.
 * 
 * To add pixels to GTM:
 * 1. Go to https://tagmanager.google.com
 * 2. Create new tags for Facebook and TikTok pixels
 * 3. Set them to fire on "All Pages"
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    fbq?: (action: string, event: string, params?: Record<string, unknown>) => void;
    ttq?: {
      track: (event: string, params?: Record<string, unknown>) => void;
    };
    gtag?: (...args: unknown[]) => void;
  }
}

// Event tracking helper for conversion events
export const trackPurchaseEvent = (value: number, currency = 'USD', items: Array<{ id: string; name: string; price: number }>) => {
  // Push to GTM dataLayer
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'purchase',
      ecommerce: {
        value,
        currency,
        items: items.map((item, index) => ({
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          index,
        })),
      },
    });
  }
};

export const trackAddToCartEvent = (item: { id: string; name: string; price: number; category?: string }) => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'add_to_cart',
      ecommerce: {
        items: [{
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          item_category: item.category,
        }],
      },
    });
  }
};

export const trackViewItemEvent = (item: { id: string; name: string; price: number; category?: string }) => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'view_item',
      ecommerce: {
        items: [{
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          item_category: item.category,
        }],
      },
    });
  }
};

export const trackSignUpEvent = (method = 'email') => {
  if (typeof window === 'undefined') return;
  
  // GA4 / GTM sign_up event
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'sign_up',
      method,
    });
  }
  
  // Google Ads conversion for new user registration
  if (window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: 'AW-17885952633/7FbfCL-2pugbEPn019BC',
    });
  }
};

export const trackSearchEvent = (searchTerm: string) => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'search',
      search_term: searchTerm,
    });
  }
};

/**
 * Track grading purchase conversion
 * Fires GA4, Google Ads, Meta Pixel, and TikTok Pixel events
 * Uses transaction ID for deduplication
 */
export const trackGradingPurchase = (params: {
  orderId: string;
  value: number;
  currency?: string;
  cardCount: number;
  speedTier: string;
}) => {
  const { orderId, value, currency = 'USD', cardCount, speedTier } = params;
  
  if (typeof window === 'undefined') return;

  // GA4 / GTM purchase event
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'purchase',
      transaction_id: orderId,
      ecommerce: {
        value,
        currency,
        items: [{
          item_id: 'grading_' + speedTier,
          item_name: `Card Grading - ${speedTier.charAt(0).toUpperCase() + speedTier.slice(1)}`,
          item_category: 'Grading',
          price: value,
          quantity: cardCount,
        }],
      },
    });
  }

  // Google Ads conversion (via gtag)
  if (window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: 'AW-17885952633/7FbfCL-2pugbEPn019BC',
      value,
      currency,
      transaction_id: orderId,
    });
  }

  // Meta/Facebook Pixel
  if (window.fbq) {
    window.fbq('track', 'Purchase', {
      value,
      currency,
      content_type: 'product',
      content_ids: ['grading_' + speedTier],
      content_name: `Card Grading - ${speedTier}`,
      num_items: cardCount,
      order_id: orderId, // Deduplication key
    });
  }

  // TikTok Pixel
  if (window.ttq) {
    window.ttq.track('CompletePayment', {
      value,
      currency,
      content_type: 'product',
      content_id: 'grading_' + speedTier,
      content_name: `Card Grading - ${speedTier}`,
      quantity: cardCount,
      order_id: orderId, // Deduplication key
    });
  }

  console.log('[Tracking] Grading purchase event fired:', { orderId, value, cardCount, speedTier });
};
