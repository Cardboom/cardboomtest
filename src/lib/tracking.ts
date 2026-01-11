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

// Event tracking helper for conversion events
export const trackPurchaseEvent = (value: number, currency = 'USD', items: Array<{ id: string; name: string; price: number }>) => {
  // Push to GTM dataLayer
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({
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
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({
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
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({
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
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event: 'sign_up',
      method,
    });
  }
};

export const trackSearchEvent = (searchTerm: string) => {
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event: 'search',
      search_term: searchTerm,
    });
  }
};
