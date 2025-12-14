import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const EBAY_API_KEY = Deno.env.get('EBAY_BROWSE_API_KEY');

// Category to eBay search term enhancements
const categorySearchTerms: Record<string, string> = {
  'pokemon': 'Pokemon TCG card',
  'yugioh': 'Yu-Gi-Oh card',
  'mtg': 'Magic The Gathering MTG',
  'lorcana': 'Disney Lorcana card',
  'one-piece': 'One Piece TCG card',
  'sports-nba': 'basketball card',
  'sports-nfl': 'football card',
  'sports-mlb': 'baseball card',
  'sports-wnba': 'WNBA basketball card',
  'nba': 'basketball card',
  'figures': 'figure collectible',
  'lol-riftbound': 'League of Legends card',
};

// Generate eBay search query from item name and category
function generateEbayQuery(name: string, category: string, subcategory?: string): string {
  const categoryTerm = categorySearchTerms[category] || '';
  
  // Clean up the name - remove common suffixes that might confuse search
  let cleanName = name
    .replace(/PSA \d+/gi, '') // Remove PSA grades for broader search
    .replace(/BGS \d+\.?\d*/gi, '')
    .replace(/CGC \d+\.?\d*/gi, '')
    .trim();
  
  // Build search query
  let query = cleanName;
  
  // Add category context if not already in name
  if (categoryTerm && !name.toLowerCase().includes(categoryTerm.split(' ')[0].toLowerCase())) {
    query = `${query} ${categoryTerm}`;
  }
  
  // Add subcategory for more specific searches
  if (subcategory && !['enchanted', 'legendary', 'promo', 'modern'].includes(subcategory)) {
    query = `${query} ${subcategory}`;
  }
  
  console.log(`[fetch-prices] Generated eBay query for "${name}" (${category}): "${query}"`);
  return query;
}

interface EbayItem {
  itemId: string;
  title: string;
  price?: { value: string; currency: string };
  image?: { imageUrl: string };
  condition?: string;
  seller?: { username: string; feedbackPercentage: string };
  itemWebUrl?: string;
}

interface EbayResponse {
  itemSummaries?: EbayItem[];
  total?: number;
}

// Fetch real prices from eBay for a product
async function fetchEbayPrice(query: string): Promise<{ 
  avgPrice: number; 
  listings: number; 
  minPrice: number; 
  maxPrice: number;
  imageUrl?: string;
} | null> {
  if (!EBAY_API_KEY) {
    console.log('[fetch-prices] eBay API key not configured');
    return null;
  }

  try {
    const searchParams = new URLSearchParams({
      q: query,
      limit: '30',
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
      console.error(`[fetch-prices] eBay API error for "${query}":`, response.status, await response.text());
      return null;
    }

    const data: EbayResponse = await response.json();
    const items = data.itemSummaries || [];
    
    if (items.length === 0) {
      console.log(`[fetch-prices] No eBay listings found for: ${query}`);
      return null;
    }

    const prices = items
      .map(item => parseFloat(item.price?.value || '0'))
      .filter(p => p > 0);

    if (prices.length === 0) return null;

    // Remove outliers (prices more than 3x the median)
    prices.sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];
    const filteredPrices = prices.filter(p => p <= median * 3 && p >= median / 3);
    const finalPrices = filteredPrices.length > 3 ? filteredPrices : prices;

    const avgPrice = finalPrices.reduce((a, b) => a + b, 0) / finalPrices.length;
    const minPrice = Math.min(...finalPrices);
    const maxPrice = Math.max(...finalPrices);

    // Get first image URL
    const imageUrl = items.find(item => item.image?.imageUrl)?.image?.imageUrl;

    console.log(`[fetch-prices] eBay "${query}": avg=$${avgPrice.toFixed(2)}, listings=${finalPrices.length}, range=$${minPrice}-$${maxPrice}`);

    return {
      avgPrice: Math.round(avgPrice * 100) / 100,
      listings: finalPrices.length,
      minPrice: Math.round(minPrice * 100) / 100,
      maxPrice: Math.round(maxPrice * 100) / 100,
      imageUrl,
    };
  } catch (error) {
    console.error(`[fetch-prices] Error fetching eBay data for "${query}":`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { productIds, fetchFromEbay = false, refreshAll = false, category } = body;
    console.log(`[fetch-prices] Request: productIds=${productIds?.length || 0}, eBay=${fetchFromEbay}, refreshAll=${refreshAll}, category=${category || 'all'}`);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build query for market items
    let query = supabase
      .from('market_items')
      .select('id, name, current_price, change_24h, category, subcategory, sales_count_30d, liquidity, image_url');
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (productIds && productIds.length > 0 && !refreshAll) {
      query = query.in('id', productIds);
    }

    const { data: marketItems, error: dbError } = await query;

    if (dbError) {
      console.error('[fetch-prices] Database error:', dbError);
      throw dbError;
    }

    console.log(`[fetch-prices] Found ${marketItems?.length || 0} market items to process`);

    const prices: Record<string, { 
      price: number; 
      change: number; 
      source: string; 
      timestamp: string;
      ebayListings?: number;
      minPrice?: number;
      maxPrice?: number;
      liquidity?: string;
      salesCount?: number;
      imageUrl?: string;
    }> = {};

    const ebayUpdates: { 
      id: string; 
      name: string; 
      price: number; 
      listings: number; 
      minPrice: number;
      maxPrice: number;
      imageUrl?: string;
    }[] = [];

    // Process each market item
    if (marketItems) {
      for (const item of marketItems) {
        // Always try eBay if enabled
        if (fetchFromEbay && EBAY_API_KEY) {
          const ebayQuery = generateEbayQuery(item.name, item.category, item.subcategory);
          const ebayData = await fetchEbayPrice(ebayQuery);
          
          if (ebayData && ebayData.avgPrice > 0) {
            const oldPrice = Number(item.current_price) || ebayData.avgPrice;
            const change = ((ebayData.avgPrice - oldPrice) / oldPrice) * 100;
            
            prices[item.id] = {
              price: ebayData.avgPrice,
              change: Math.round(change * 100) / 100,
              source: 'ebay',
              timestamp: new Date().toISOString(),
              ebayListings: ebayData.listings,
              minPrice: ebayData.minPrice,
              maxPrice: ebayData.maxPrice,
              liquidity: ebayData.listings > 15 ? 'high' : ebayData.listings > 5 ? 'medium' : 'low',
              salesCount: ebayData.listings,
              imageUrl: ebayData.imageUrl,
            };
            
            ebayUpdates.push({
              id: item.id,
              name: item.name,
              price: ebayData.avgPrice,
              listings: ebayData.listings,
              minPrice: ebayData.minPrice,
              maxPrice: ebayData.maxPrice,
              imageUrl: ebayData.imageUrl,
            });
            
            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
          }
        }

        // Fall back to database values
        if (item.current_price && Number(item.current_price) > 0) {
          prices[item.id] = {
            price: Number(item.current_price),
            change: Number(item.change_24h) || 0,
            source: 'database',
            timestamp: new Date().toISOString(),
            liquidity: item.liquidity || undefined,
            salesCount: item.sales_count_30d || undefined,
            imageUrl: item.image_url || undefined,
          };
        }
      }
    }

    // Batch update database with eBay prices
    if (ebayUpdates.length > 0) {
      console.log(`[fetch-prices] Updating ${ebayUpdates.length} items with eBay data`);
      
      for (const update of ebayUpdates) {
        const existingItem = marketItems?.find(m => m.id === update.id);
        if (existingItem) {
          const oldPrice = Number(existingItem.current_price) || update.price;
          const change24h = ((update.price - oldPrice) / oldPrice) * 100;
          
          const updateData: Record<string, unknown> = {
            current_price: update.price,
            change_24h: Math.round(change24h * 100) / 100,
            sales_count_30d: update.listings,
            liquidity: update.listings > 15 ? 'high' : update.listings > 5 ? 'medium' : 'low',
            data_source: 'ebay',
            updated_at: new Date().toISOString(),
          };
          
          // Only update image if item doesn't have one
          if (!existingItem.image_url && update.imageUrl) {
            updateData.image_url = update.imageUrl;
          }
          
          const { error: updateError } = await supabase
            .from('market_items')
            .update(updateData)
            .eq('id', update.id);
            
          if (updateError) {
            console.error(`[fetch-prices] Failed to update ${update.name}:`, updateError);
          } else {
            console.log(`[fetch-prices] Updated ${update.name} to $${update.price} (${update.listings} listings)`);
          }
        }
      }
      
      // Also log to price_history for tracking
      const historyRecords = ebayUpdates.map(update => ({
        product_id: update.id,
        price: update.price,
        source: 'ebay',
        recorded_at: new Date().toISOString(),
      }));
      
      const { error: historyError } = await supabase
        .from('price_history')
        .insert(historyRecords);
        
      if (historyError) {
        console.error('[fetch-prices] Failed to log price history:', historyError);
      }
    }

    console.log(`[fetch-prices] Returning prices for ${Object.keys(prices).length} products`);

    return new Response(
      JSON.stringify({ 
        prices, 
        timestamp: new Date().toISOString(),
        ebayEnabled: !!EBAY_API_KEY,
        updatedCount: ebayUpdates.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[fetch-prices] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
