import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EBAY_RAPIDAPI_KEY = Deno.env.get("EBAY_RAPIDAPI_KEY");

interface EbayProduct {
  title: string;
  image?: string;
  price?: {
    value: string;
    currency: string;
  };
  condition?: string;
  itemId?: string;
  itemWebUrl?: string;
}

interface EbaySearchResponse {
  products?: EbayProduct[];
  total?: number;
}

// Clean card name for better eBay search
function cleanSearchQuery(name: string): string {
  return name
    .replace(/\s*[-–]\s*(PSA|BGS|CGC|SGC)\s*\d+(\.\d+)?/gi, '')
    .replace(/\s*(1st Edition|First Edition|Unlimited|Holo|Holofoil|Reverse Holo)/gi, '')
    .replace(/\s*#\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Map internal categories to eBay search terms
function getCategorySearchTerm(category: string): string {
  const categoryMap: Record<string, string> = {
    'pokemon': 'pokemon card',
    'yugioh': 'yugioh card',
    'mtg': 'magic the gathering card',
    'one-piece': 'one piece card game',
    'lorcana': 'disney lorcana card',
    'sports': 'sports trading card',
    'sports-nba': 'nba basketball card',
    'sports-nfl': 'nfl football card',
    'sports-mlb': 'mlb baseball card',
    'figures': 'collectible figure',
    'lol-riftbound': 'league of legends card',
  };
  return categoryMap[category] || 'trading card';
}

async function searchEbay(query: string, category: string): Promise<EbayProduct | null> {
  if (!EBAY_RAPIDAPI_KEY) {
    console.log('eBay RapidAPI key not configured');
    return null;
  }

  try {
    const categoryTerm = getCategorySearchTerm(category);
    const searchQuery = `${query} ${categoryTerm}`;
    
    const response = await fetch(
      `https://api-for-ebay.p.rapidapi.com/searchProducts?query=${encodeURIComponent(searchQuery)}&page=1`,
      {
        headers: {
          'X-RapidAPI-Key': EBAY_RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'api-for-ebay.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) {
      console.error(`eBay API error: ${response.status}`);
      return null;
    }

    const data: EbaySearchResponse = await response.json();
    
    if (data.products && data.products.length > 0) {
      // Return the first product with an image
      const productWithImage = data.products.find(p => p.image);
      return productWithImage || data.products[0];
    }

    return null;
  } catch (error) {
    console.error('Error searching eBay:', error);
    return null;
  }
}

function parsePrice(priceStr: string | undefined): number | null {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[^0-9.]/g, '');
  const price = parseFloat(cleaned);
  return isNaN(price) ? null : price;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { limit = 50, offset = 0, category = null, updatePrices = true } = await req.json().catch(() => ({}));

    // Build query for items missing images OR needing price updates
    let query = supabase
      .from('market_items')
      .select('id, name, category, current_price, image_url, data_source')
      .order('current_price', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    // Filter by category if specified
    if (category) {
      query = query.eq('category', category);
    }

    // Get items missing images or with placeholder images, OR items with low confidence prices
    query = query.or('image_url.is.null,image_url.eq.,image_url.ilike.%placeholder%,data_source.is.null,data_source.eq.internal');

    const { data: items, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch items: ${fetchError.message}`);
    }

    console.log(`Found ${items?.length || 0} items to process with eBay API`);

    const results = {
      processed: 0,
      imagesUpdated: 0,
      pricesUpdated: 0,
      notFound: 0,
      errors: 0,
    };

    for (const item of items || []) {
      try {
        const searchQuery = cleanSearchQuery(item.name);
        console.log(`Searching eBay for: ${searchQuery} (${item.category})`);

        const product = await searchEbay(searchQuery, item.category);
        results.processed++;

        if (product) {
          const updates: Record<string, any> = {
            updated_at: new Date().toISOString(),
          };

          // Update image if found and current is missing/placeholder
          if (product.image && (!item.image_url || item.image_url === '' || item.image_url.includes('placeholder'))) {
            updates.image_url = product.image;
            results.imagesUpdated++;
          }

          // Update price if enabled and found
          if (updatePrices && product.price) {
            const ebayPrice = parsePrice(product.price.value);
            if (ebayPrice && ebayPrice > 0) {
              // Only update if we don't have a trusted source already
              if (!item.data_source || item.data_source === 'internal' || !item.current_price || item.current_price <= 0) {
                updates.current_price = ebayPrice;
                updates.data_source = 'ebay';
                updates.price_confidence = 'medium';
                results.pricesUpdated++;

                // Also record in price history
                await supabase.from('price_history').insert({
                  product_id: item.id,
                  market_item_id: item.id,
                  price: ebayPrice,
                  source: 'ebay',
                });
              }
            }
          }

          // Update the market item
          if (Object.keys(updates).length > 1) { // More than just updated_at
            const { error: updateError } = await supabase
              .from('market_items')
              .update(updates)
              .eq('id', item.id);

            if (updateError) {
              console.error(`Error updating ${item.name}:`, updateError);
              results.errors++;
            }
          }
        } else {
          results.notFound++;
          console.log(`No eBay results for: ${item.name}`);
        }

        // Rate limiting: 200ms between requests
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`Error processing ${item.name}:`, error);
        results.errors++;
      }
    }

    console.log('eBay sync completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        hasMore: (items?.length || 0) === limit,
        nextOffset: offset + limit,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("eBay sync error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
