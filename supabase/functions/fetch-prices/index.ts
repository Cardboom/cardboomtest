import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const EBAY_API_KEY = Deno.env.get('EBAY_BROWSE_API_KEY');

// Product ID to eBay search query mapping
const productIdToEbayQuery: Record<string, string> = {
  'tcg-charizard-1st': 'Charizard 1st Edition PSA 10 Base Set',
  'tcg-pikachu-illustrator': 'Pikachu Illustrator promo card',
  'tcg-psa10-mewtwo': 'Mewtwo GX Rainbow Rare PSA 10',
  'tcg-black-lotus': 'MTG Black Lotus Alpha Beta',
  'mtg-mox-sapphire': 'MTG Mox Sapphire Alpha Beta',
  'yugioh-blue-eyes': 'Blue-Eyes White Dragon LOB 1st Edition',
  'yugioh-dark-magician': 'Dark Magician LOB 1st Edition',
  'nba-lebron-2003': 'LeBron James 2003 Topps Chrome Rookie PSA',
  'nba-jordan-fleer': 'Michael Jordan 1986 Fleer Rookie PSA',
  'nba-luka-prizm': 'Luka Doncic Prizm Silver Rookie PSA',
  'football-mahomes-prizm': 'Patrick Mahomes Prizm Silver Rookie PSA',
  'football-brady-rookie': 'Tom Brady 2000 Contenders Rookie Auto PSA',
  'football-chase-auto': 'Jamarr Chase Optic Rookie Auto',
  'onepiece-luffy-alt': 'One Piece Card Game Luffy Alternate Art',
  'onepiece-shanks-manga': 'One Piece Card Game Shanks manga rare',
  'lorcana-elsa-enchanted': 'Disney Lorcana Elsa Enchanted',
  'lorcana-mickey-enchanted': 'Disney Lorcana Mickey Mouse Enchanted',
  'figure-kaws-companion': 'KAWS Companion figure original',
  'figure-bearbrick-1000': 'Bearbrick KAWS 1000%',
};

// Product ID to market_items name mapping
const productIdToMarketItem: Record<string, string> = {
  'tcg-charizard-1st': 'Charizard 1st Edition',
  'tcg-pikachu-illustrator': 'Pikachu Illustrator',
  'tcg-psa10-mewtwo': 'Mewtwo Rainbow',
  'tcg-black-lotus': 'Black Lotus',
  'mtg-mox-sapphire': 'Black Lotus',
  'yugioh-blue-eyes': 'Blue-Eyes White Dragon',
  'yugioh-dark-magician': 'Dark Magician',
  'nba-lebron-2003': 'LeBron James Rookie',
  'nba-jordan-fleer': 'Michael Jordan Fleer',
  'nba-luka-prizm': 'Luka Dončić Prizm',
  'football-mahomes-prizm': 'Patrick Mahomes Prizm',
  'football-brady-rookie': 'Tom Brady Contenders',
  'football-chase-auto': "Ja'Marr Chase Optic",
  'onepiece-luffy-alt': 'Monkey D. Luffy',
  'onepiece-shanks-manga': 'Shanks',
  'lorcana-elsa-enchanted': 'Elsa - Snow Queen',
  'lorcana-mickey-enchanted': 'Mickey Mouse',
  'figure-kaws-companion': 'KAWS Companion',
  'figure-bearbrick-1000': 'Bearbrick KAWS',
};

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
async function fetchEbayPrice(query: string): Promise<{ avgPrice: number; listings: number; minPrice: number; maxPrice: number } | null> {
  if (!EBAY_API_KEY) {
    console.log('[fetch-prices] eBay API key not configured');
    return null;
  }

  try {
    const searchParams = new URLSearchParams({
      q: query,
      limit: '20',
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
      console.error(`[fetch-prices] eBay API error for "${query}":`, response.status);
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

    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    console.log(`[fetch-prices] eBay "${query}": avg=$${avgPrice.toFixed(2)}, listings=${prices.length}`);

    return {
      avgPrice: Math.round(avgPrice * 100) / 100,
      listings: prices.length,
      minPrice,
      maxPrice,
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
    const { productIds, fetchFromEbay = false } = await req.json();
    console.log(`[fetch-prices] Fetching prices for ${productIds?.length || 0} products, eBay=${fetchFromEbay}`);

    if (!productIds || !Array.isArray(productIds)) {
      return new Response(
        JSON.stringify({ error: 'productIds array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all market items from database
    const { data: marketItems, error: dbError } = await supabase
      .from('market_items')
      .select('id, name, current_price, change_24h, category, sales_count_30d, liquidity');

    if (dbError) {
      console.error('[fetch-prices] Database error:', dbError);
      throw dbError;
    }

    // Create a map for quick lookup
    const marketItemMap: Record<string, { 
      id: string;
      price: number; 
      change: number; 
      liquidity: string | null;
      salesCount: number | null;
    }> = {};
    
    if (marketItems) {
      for (const item of marketItems) {
        marketItemMap[item.name] = {
          id: item.id,
          price: Number(item.current_price) || 0,
          change: Number(item.change_24h) || 0,
          liquidity: item.liquidity,
          salesCount: item.sales_count_30d,
        };
      }
    }

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
    }> = {};

    // Fetch from eBay if requested (limit to avoid rate limits)
    const ebayUpdates: { name: string; price: number; listings: number }[] = [];
    
    for (const productId of productIds) {
      const marketItemName = productIdToMarketItem[productId];
      const dbData = marketItemName ? marketItemMap[marketItemName] : null;
      
      // Try to fetch from eBay if enabled
      if (fetchFromEbay && EBAY_API_KEY) {
        const ebayQuery = productIdToEbayQuery[productId];
        if (ebayQuery) {
          const ebayData = await fetchEbayPrice(ebayQuery);
          if (ebayData && ebayData.avgPrice > 0) {
            prices[productId] = {
              price: ebayData.avgPrice,
              change: dbData ? ((ebayData.avgPrice - dbData.price) / dbData.price) * 100 : 0,
              source: 'ebay',
              timestamp: new Date().toISOString(),
              ebayListings: ebayData.listings,
              minPrice: ebayData.minPrice,
              maxPrice: ebayData.maxPrice,
              liquidity: ebayData.listings > 15 ? 'high' : ebayData.listings > 5 ? 'medium' : 'low',
              salesCount: ebayData.listings,
            };
            
            if (marketItemName) {
              ebayUpdates.push({
                name: marketItemName,
                price: ebayData.avgPrice,
                listings: ebayData.listings,
              });
            }
            continue;
          }
        }
      }

      // Fall back to database
      if (dbData && dbData.price > 0) {
        prices[productId] = {
          price: dbData.price,
          change: dbData.change,
          source: 'database',
          timestamp: new Date().toISOString(),
          liquidity: dbData.liquidity || undefined,
          salesCount: dbData.salesCount || undefined,
        };
      }
    }

    // Update database with eBay prices if we fetched any
    if (ebayUpdates.length > 0) {
      for (const update of ebayUpdates) {
        const existingItem = marketItems?.find(m => m.name === update.name);
        if (existingItem) {
          const oldPrice = Number(existingItem.current_price) || update.price;
          const change24h = ((update.price - oldPrice) / oldPrice) * 100;
          
          await supabase
            .from('market_items')
            .update({
              current_price: update.price,
              change_24h: Math.round(change24h * 100) / 100,
              sales_count_30d: update.listings,
              liquidity: update.listings > 15 ? 'high' : update.listings > 5 ? 'medium' : 'low',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingItem.id);
            
          console.log(`[fetch-prices] Updated ${update.name} to $${update.price}`);
        }
      }
    }

    console.log(`[fetch-prices] Returning prices for ${Object.keys(prices).length} products`);

    return new Response(
      JSON.stringify({ 
        prices, 
        timestamp: new Date().toISOString(),
        ebayEnabled: !!EBAY_API_KEY,
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
