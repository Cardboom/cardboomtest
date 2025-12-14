import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EBAY_API_KEY = Deno.env.get('EBAY_BROWSE_API_KEY');

interface EbayItem {
  itemId: string;
  title: string;
  price?: { value: string; currency: string };
  image?: { imageUrl: string };
  thumbnailImages?: { imageUrl: string }[];
  condition?: string;
  seller?: { username: string; feedbackPercentage: string };
  itemWebUrl?: string;
  itemLocation?: { country: string };
}

interface CardScanResult {
  cardName: string;
  setName?: string;
  cardNumber?: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  soldAvgPrice: number;
  activeListingsCount: number;
  soldListingsCount: number;
  liquidity: string;
  imageUrl?: string;
  cachedImagePath?: string;
  listings: {
    id: string;
    title: string;
    price: number;
    imageUrl?: string;
    condition?: string;
    seller?: string;
    url?: string;
  }[];
}

// Fetch active listings from eBay
async function fetchEbayActiveListings(query: string, limit: number = 20) {
  if (!EBAY_API_KEY) return { items: [], total: 0 };

  try {
    const searchParams = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      filter: 'buyingOptions:{FIXED_PRICE|AUCTION}',
      sort: 'price',
    });

    const response = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?${searchParams}`,
      {
        headers: {
          'Authorization': `Bearer ${EBAY_API_KEY}`,
          'Content-Type': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        },
      }
    );

    if (!response.ok) {
      console.error('[scan-card] eBay active listings error:', response.status);
      return { items: [], total: 0 };
    }

    const data = await response.json();
    return {
      items: data.itemSummaries || [],
      total: data.total || 0,
    };
  } catch (error) {
    console.error('[scan-card] Error fetching active listings:', error);
    return { items: [], total: 0 };
  }
}

// Fetch sold/completed listings from eBay (using filter)
async function fetchEbaySoldListings(query: string, limit: number = 20) {
  if (!EBAY_API_KEY) return { items: [], total: 0 };

  try {
    // Note: Browse API doesn't directly support sold items, so we estimate from active
    // In production, you'd use the Finding API for sold items
    const searchParams = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      sort: 'newlyListed',
    });

    const response = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?${searchParams}`,
      {
        headers: {
          'Authorization': `Bearer ${EBAY_API_KEY}`,
          'Content-Type': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        },
      }
    );

    if (!response.ok) {
      return { items: [], total: 0 };
    }

    const data = await response.json();
    return {
      items: data.itemSummaries || [],
      total: data.total || 0,
    };
  } catch (error) {
    console.error('[scan-card] Error fetching sold listings:', error);
    return { items: [], total: 0 };
  }
}

// Download and cache image to Supabase storage
async function cacheImage(imageUrl: string, cardName: string, supabase: any): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const imageData = await response.arrayBuffer();
    const fileName = `${cardName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${Date.now()}.jpg`;
    
    const { data, error } = await supabase.storage
      .from('card-images')
      .upload(fileName, imageData, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('[scan-card] Error uploading image:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('card-images')
      .getPublicUrl(fileName);

    console.log(`[scan-card] Cached image: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('[scan-card] Error caching image:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cardName, setName, cardNumber, forceRefresh = false } = await req.json();

    if (!cardName) {
      return new Response(
        JSON.stringify({ error: 'cardName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build search query
    let searchQuery = cardName;
    if (setName) searchQuery += ` ${setName}`;
    if (cardNumber) searchQuery += ` ${cardNumber}`;

    console.log(`[scan-card] Scanning: "${searchQuery}"`);

    // Check cache first (valid for 1 hour)
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('ebay_card_cache')
        .select('*')
        .eq('search_query', searchQuery)
        .gte('last_updated', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .single();

      if (cached) {
        console.log(`[scan-card] Returning cached data for: ${searchQuery}`);
        return new Response(
          JSON.stringify({
            ...cached,
            fromCache: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch from eBay
    const [activeData, soldData] = await Promise.all([
      fetchEbayActiveListings(searchQuery, 30),
      fetchEbaySoldListings(searchQuery, 20),
    ]);

    const activeItems: EbayItem[] = activeData.items;
    const soldItems: EbayItem[] = soldData.items;

    // Calculate prices from active listings
    const activePrices = activeItems
      .map(item => parseFloat(item.price?.value || '0'))
      .filter(p => p > 0);

    const avgPrice = activePrices.length > 0
      ? activePrices.reduce((a, b) => a + b, 0) / activePrices.length
      : 0;
    const minPrice = activePrices.length > 0 ? Math.min(...activePrices) : 0;
    const maxPrice = activePrices.length > 0 ? Math.max(...activePrices) : 0;

    // Calculate sold prices (simulated from recent listings)
    const soldPrices = soldItems
      .map(item => parseFloat(item.price?.value || '0'))
      .filter(p => p > 0);
    const soldAvgPrice = soldPrices.length > 0
      ? soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length
      : avgPrice;

    // Determine liquidity
    const totalListings = activeItems.length + soldItems.length;
    let liquidity = 'low';
    if (totalListings > 30) liquidity = 'high';
    else if (totalListings > 10) liquidity = 'medium';

    // Get best image and cache it
    let imageUrl: string | undefined;
    let cachedImagePath: string | null = null;
    
    const firstItemWithImage = activeItems.find(item => item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl);
    if (firstItemWithImage) {
      imageUrl = firstItemWithImage.image?.imageUrl || firstItemWithImage.thumbnailImages?.[0]?.imageUrl;
      if (imageUrl) {
        cachedImagePath = await cacheImage(imageUrl, cardName, supabase);
      }
    }

    // Format listings for response
    const listings = activeItems.slice(0, 10).map(item => ({
      id: item.itemId,
      title: item.title,
      price: parseFloat(item.price?.value || '0'),
      imageUrl: item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl,
      condition: item.condition,
      seller: item.seller?.username,
      url: item.itemWebUrl,
    }));

    const result: CardScanResult = {
      cardName,
      setName,
      cardNumber,
      avgPrice: Math.round(avgPrice * 100) / 100,
      minPrice: Math.round(minPrice * 100) / 100,
      maxPrice: Math.round(maxPrice * 100) / 100,
      soldAvgPrice: Math.round(soldAvgPrice * 100) / 100,
      activeListingsCount: activeItems.length,
      soldListingsCount: soldItems.length,
      liquidity,
      imageUrl: cachedImagePath || imageUrl,
      cachedImagePath: cachedImagePath || undefined,
      listings,
    };

    // Save to cache
    const { error: cacheError } = await supabase
      .from('ebay_card_cache')
      .upsert({
        card_name: cardName,
        set_name: setName,
        card_number: cardNumber,
        search_query: searchQuery,
        avg_price: result.avgPrice,
        min_price: result.minPrice,
        max_price: result.maxPrice,
        sold_avg_price: result.soldAvgPrice,
        active_listings_count: result.activeListingsCount,
        sold_listings_count: result.soldListingsCount,
        liquidity: result.liquidity,
        image_url: imageUrl,
        cached_image_path: cachedImagePath,
        ebay_item_ids: activeItems.slice(0, 20).map(i => i.itemId),
        last_updated: new Date().toISOString(),
      }, {
        onConflict: 'search_query',
      });

    if (cacheError) {
      console.error('[scan-card] Cache error:', cacheError);
    }

    console.log(`[scan-card] Found ${activeItems.length} active, ${soldItems.length} sold listings for: ${searchQuery}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[scan-card] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
