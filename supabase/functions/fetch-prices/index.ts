import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PRICECHARTING_API_KEY = Deno.env.get('PRICECHARTING_API_KEY');

// PriceCharting search query mappings - expanded catalog
const mockIdToPriceChartingQuery: Record<string, string> = {
  // Pokemon TCG
  'tcg-charizard-1st': 'Charizard Base Set 1st Edition Pokemon',
  'tcg-pikachu-illustrator': 'Pikachu Illustrator Pokemon',
  'tcg-psa10-mewtwo': 'Mewtwo GX Rainbow Pokemon',
  'tcg-blastoise-1st': 'Blastoise Base Set 1st Edition Pokemon',
  'tcg-venusaur-1st': 'Venusaur Base Set 1st Edition Pokemon',
  'tcg-lugia-neo': 'Lugia Neo Genesis 1st Edition Pokemon',
  'tcg-umbreon-vmax': 'Umbreon VMAX Alternate Art Pokemon',
  'tcg-rayquaza-gold': 'Rayquaza VMAX Alternate Art Pokemon',
  'tcg-mew-celebration': 'Mew Celebrations 25th Anniversary Pokemon',
  'tcg-gengar-vmax': 'Gengar VMAX Alternate Art Pokemon',
  
  // Magic: The Gathering
  'tcg-black-lotus': 'Black Lotus Alpha Magic',
  'mtg-mox-sapphire': 'Mox Sapphire Alpha Magic',
  'mtg-mox-ruby': 'Mox Ruby Alpha Magic',
  'mtg-mox-pearl': 'Mox Pearl Alpha Magic',
  'mtg-mox-jet': 'Mox Jet Alpha Magic',
  'mtg-mox-emerald': 'Mox Emerald Alpha Magic',
  'mtg-timetwister': 'Timetwister Alpha Magic',
  'mtg-ancestral-recall': 'Ancestral Recall Alpha Magic',
  'mtg-time-walk': 'Time Walk Alpha Magic',
  'mtg-underground-sea': 'Underground Sea Revised Magic',
  'mtg-force-of-will': 'Force of Will Alliances Magic',
  
  // Yu-Gi-Oh!
  'yugioh-blue-eyes': 'Blue-Eyes White Dragon LOB Yu-Gi-Oh',
  'yugioh-dark-magician': 'Dark Magician Starter Deck Yu-Gi-Oh',
  'yugioh-exodia-head': 'Exodia the Forbidden One LOB Yu-Gi-Oh',
  'yugioh-red-eyes': 'Red-Eyes Black Dragon LOB Yu-Gi-Oh',
  'yugioh-dark-magician-girl': 'Dark Magician Girl MFC Yu-Gi-Oh',
  'yugioh-stardust-dragon': 'Stardust Dragon Ghost Rare Yu-Gi-Oh',
  'yugioh-ghost-rare-rainbow': 'Rainbow Dragon Ghost Rare Yu-Gi-Oh',
  
  // NBA Basketball Cards
  'nba-lebron-2003': 'LeBron James Topps Chrome Rookie',
  'nba-jordan-fleer': 'Michael Jordan Fleer Rookie',
  'nba-luka-prizm': 'Luka Doncic Prizm Silver',
  'nba-kobe-topps': 'Kobe Bryant Topps Chrome Rookie',
  'nba-giannis-prizm': 'Giannis Antetokounmpo Prizm Silver Rookie',
  'nba-zion-prizm': 'Zion Williamson Prizm Silver Rookie',
  'nba-ja-morant-prizm': 'Ja Morant Prizm Silver Rookie',
  'nba-wemby-prizm': 'Victor Wembanyama Prizm Rookie',
  'nba-curry-topps': 'Stephen Curry Topps Chrome Rookie',
  'nba-durant-topps': 'Kevin Durant Topps Chrome Rookie',
  
  // NFL Football Cards
  'football-mahomes-prizm': 'Patrick Mahomes Prizm Silver',
  'football-brady-rookie': 'Tom Brady Contenders Auto',
  'football-chase-auto': "Ja'Marr Chase Optic Auto",
  'football-burrow-prizm': 'Joe Burrow Prizm Silver Rookie',
  'football-herbert-prizm': 'Justin Herbert Prizm Silver Rookie',
  'football-allen-prizm': 'Josh Allen Prizm Silver Rookie',
  'football-cj-stroud-prizm': 'CJ Stroud Prizm Rookie',
  'football-lamar-prizm': 'Lamar Jackson Prizm Silver Rookie',
  
  // MLB Baseball Cards
  'mlb-trout-bowman': 'Mike Trout Bowman Chrome Rookie',
  'mlb-ohtani-bowman': 'Shohei Ohtani Bowman Chrome Rookie',
  'mlb-jeter-sp': 'Derek Jeter SP Foil Rookie',
  'mlb-griffey-upper': 'Ken Griffey Jr Upper Deck Rookie',
  'mlb-mantle-topps': 'Mickey Mantle Topps',
  
  // One Piece TCG
  'onepiece-luffy-alt': 'Monkey D Luffy Alt Art One Piece',
  'onepiece-shanks-manga': 'Shanks Manga Art One Piece',
  'onepiece-nami-alt': 'Nami Alternate Art One Piece',
  'onepiece-zoro-manga': 'Roronoa Zoro Manga Art One Piece',
  'onepiece-ace-alt': 'Portgas D Ace Alternate Art One Piece',
  'onepiece-law-manga': 'Trafalgar Law Manga Art One Piece',
  
  // Disney Lorcana
  'lorcana-elsa-enchanted': 'Elsa Spirit of Winter Enchanted Disney Lorcana',
  'lorcana-mickey-enchanted': 'Mickey Mouse Enchanted Disney Lorcana',
  'lorcana-stitch-enchanted': 'Stitch Enchanted Disney Lorcana',
  'lorcana-belle-enchanted': 'Belle Enchanted Disney Lorcana',
  'lorcana-maleficent-enchanted': 'Maleficent Enchanted Disney Lorcana',
  
  // Figures & Collectibles
  'figure-kaws-companion': 'KAWS Companion',
  'figure-bearbrick-1000': 'Bearbrick 1000%',
  'figure-funko-chase': 'Funko Pop Chase',
  
  // Video Games (Graded/Sealed)
  'vg-pokemon-red-sealed': 'Pokemon Red Sealed GameBoy',
  'vg-pokemon-blue-sealed': 'Pokemon Blue Sealed GameBoy',
  'vg-zelda-nes-sealed': 'Legend of Zelda Sealed NES',
  'vg-mario-64-sealed': 'Super Mario 64 Sealed N64',
  'vg-chrono-trigger-sealed': 'Chrono Trigger Sealed SNES',
  
  // League of Legends Riftbound TCG
  'riftbound-jinx': 'Jinx Loose Cannon Riftbound Origins',
  'riftbound-leesin': 'Lee Sin Blind Monk Riftbound Origins',
  'riftbound-viktor': 'Viktor Machine Herald Riftbound Origins',
  'riftbound-annie': 'Annie Dark Child Riftbound Origins',
  'riftbound-garen': 'Garen Might of Demacia Riftbound Origins',
  'riftbound-lux': 'Lux Lady of Luminosity Riftbound Origins',
  'riftbound-masteryi': 'Master Yi Wuju Bladesman Riftbound Origins',
  'riftbound-ahri': 'Ahri Nine-Tailed Fox Riftbound Origins',
  'riftbound-kaisa': 'Kai\'Sa Daughter Void Riftbound Origins',
  'riftbound-teemo': 'Teemo Swift Scout Riftbound Origins',
  'riftbound-yasuo': 'Yasuo Unforgiven Riftbound Origins',
  'riftbound-volibear': 'Volibear Relentless Storm Riftbound Origins',
};

// Grade price fields from PriceCharting
interface GradedPrices {
  raw: number | null;
  psa7: number | null;
  psa8: number | null;
  psa9: number | null;
  psa10: number | null;
  bgs9_5: number | null;
  bgs10: number | null;
  cgc10: number | null;
}

// Fetch price from PriceCharting API by search query (with graded prices)
async function fetchPriceChartingPrice(query: string): Promise<{ 
  price: number; 
  source: string;
  gradedPrices?: GradedPrices;
} | null> {
  if (!PRICECHARTING_API_KEY) {
    console.log('[fetch-prices] PriceCharting API key not configured');
    return null;
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.pricecharting.com/api/products?t=${PRICECHARTING_API_KEY}&q=${encodedQuery}`;
    
    console.log(`[fetch-prices] Fetching from PriceCharting: ${query}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[fetch-prices] PriceCharting API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.products && data.products.length > 0) {
      const product = data.products[0];
      // PriceCharting returns prices in cents
      const loosePrice = product['loose-price'] ? product['loose-price'] / 100 : 0;
      const cibPrice = product['cib-price'] ? product['cib-price'] / 100 : 0;
      const newPrice = product['new-price'] ? product['new-price'] / 100 : 0;
      const gradedPrice = product['graded-price'] ? product['graded-price'] / 100 : 0;
      
      // Extract graded prices by grade (PriceCharting extended data)
      const gradedPrices: GradedPrices = {
        raw: loosePrice || null,
        psa7: product['psa-7'] ? product['psa-7'] / 100 : null,
        psa8: product['psa-8'] ? product['psa-8'] / 100 : null,
        psa9: product['psa-9'] ? product['psa-9'] / 100 : null,
        psa10: product['psa-10'] ? product['psa-10'] / 100 : null,
        bgs9_5: product['bgs-9-5'] ? product['bgs-9-5'] / 100 : null,
        bgs10: product['bgs-10'] ? product['bgs-10'] / 100 : null,
        cgc10: product['cgc-10'] ? product['cgc-10'] / 100 : null,
      };
      
      // Use graded price if available (for collectible cards), otherwise best available
      const price = gradedPrice || cibPrice || newPrice || loosePrice;
      
      if (price > 0) {
        console.log(`[fetch-prices] PriceCharting found: $${price} for ${query}`);
        return { price, source: 'pricecharting', gradedPrices };
      }
    }
    
    console.log(`[fetch-prices] No PriceCharting price found for: ${query}`);
    return null;
  } catch (error) {
    console.error(`[fetch-prices] PriceCharting error:`, error);
    return null;
  }
}

// Fetch price from PriceCharting by numeric ID (with graded prices)
async function fetchPriceChartingByNumericId(numericId: string): Promise<{ 
  price: number; 
  source: string;
  gradedPrices?: GradedPrices;
} | null> {
  if (!PRICECHARTING_API_KEY) {
    console.log('[fetch-prices] PriceCharting API key not configured');
    return null;
  }

  try {
    const url = `https://www.pricecharting.com/api/product?t=${PRICECHARTING_API_KEY}&id=${numericId}`;
    
    console.log(`[fetch-prices] Fetching from PriceCharting by numeric ID: ${numericId}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[fetch-prices] PriceCharting product API error: ${response.status}`);
      return null;
    }

    const product = await response.json();
    
    if (product && !product.error) {
      // PriceCharting returns prices in cents
      const loosePrice = product['loose-price'] ? product['loose-price'] / 100 : 0;
      const cibPrice = product['cib-price'] ? product['cib-price'] / 100 : 0;
      const newPrice = product['new-price'] ? product['new-price'] / 100 : 0;
      const gradedPrice = product['graded-price'] ? product['graded-price'] / 100 : 0;
      
      // Extract graded prices by grade (PSA 7-10, BGS, CGC)
      const gradedPrices: GradedPrices = {
        raw: loosePrice || null,
        psa7: product['psa-7'] ? product['psa-7'] / 100 : null,
        psa8: product['psa-8'] ? product['psa-8'] / 100 : null,
        psa9: product['psa-9'] ? product['psa-9'] / 100 : null,
        psa10: product['psa-10'] ? product['psa-10'] / 100 : null,
        bgs9_5: product['bgs-9-5'] ? product['bgs-9-5'] / 100 : null,
        bgs10: product['bgs-10'] ? product['bgs-10'] / 100 : null,
        cgc10: product['cgc-10'] ? product['cgc-10'] / 100 : null,
      };
      
      // For TCG cards: use loose price (ungraded card value), then graded, cib, new
      const price = loosePrice || gradedPrice || cibPrice || newPrice;
      
      if (price > 0) {
        console.log(`[fetch-prices] PriceCharting ID ${numericId} found: $${price}`);
        return { price, source: 'pricecharting', gradedPrices };
      }
    }
    
    console.log(`[fetch-prices] No PriceCharting price found for ID: ${numericId}`);
    return null;
  } catch (error) {
    console.error(`[fetch-prices] PriceCharting ID error:`, error);
    return null;
  }
}

// Parse external_id to extract PriceCharting ID info
function parsePriceChartingExternalId(externalId: string): { type: 'numeric' | 'slug'; value: string } | null {
  if (!externalId?.startsWith('pricecharting_')) return null;
  
  const idPart = externalId.replace('pricecharting_', '');
  
  // Check if it's a numeric ID (e.g., pricecharting_4727088)
  if (/^\d+$/.test(idPart)) {
    return { type: 'numeric', value: idPart };
  }
  
  // Otherwise it's a slug-based ID (use name search as fallback)
  return { type: 'slug', value: idPart };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { productIds, refreshAll = false, category } = body;
    console.log(`[fetch-prices] Request: productIds=${productIds?.length || 0}, refreshAll=${refreshAll}, category=${category || 'all'}`);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const prices: Record<string, { 
      price: number; 
      change: number; 
      source: string; 
      timestamp: string;
      liquidity?: string;
      salesCount?: number;
      imageUrl?: string;
    }> = {};

    // Check if these are mock data IDs (non-UUID strings)
    const hasMockIds = productIds?.some((id: string) => !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
    
    if (hasMockIds && productIds) {
      console.log('[fetch-prices] Processing mock data IDs');
      
      for (const mockId of productIds) {
        // Use PriceCharting for mock IDs
        const priceChartingQuery = mockIdToPriceChartingQuery[mockId as string];
        if (priceChartingQuery) {
          const pcData = await fetchPriceChartingPrice(priceChartingQuery);
          
          if (pcData && pcData.price > 0) {
            prices[mockId] = {
              price: pcData.price,
              change: (Math.random() - 0.5) * 8,
              source: 'pricecharting',
              timestamp: new Date().toISOString(),
              liquidity: 'medium',
            };
            
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }
      
      const priceChartingEnabled = !!PRICECHARTING_API_KEY;
      console.log(`[fetch-prices] Returning prices for ${Object.keys(prices).length} mock products (PriceCharting: ${priceChartingEnabled})`);
      
      return new Response(
        JSON.stringify({ 
          prices, 
          timestamp: new Date().toISOString(),
          priceChartingEnabled,
          source: Object.keys(prices).length > 0 ? 'api' : 'none',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query for market items
    let query = supabase
      .from('market_items')
      .select('id, external_id, name, current_price, change_24h, category, subcategory, sales_count_30d, liquidity, image_url, data_source');
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (productIds && productIds.length > 0 && !refreshAll) {
      query = query.or(`id.in.(${productIds.join(',')}),external_id.in.(${productIds.join(',')})`);
    }

    const { data: marketItems, error: dbError } = await query;

    if (dbError) {
      console.error('[fetch-prices] Database error:', dbError);
    }

    console.log(`[fetch-prices] Found ${marketItems?.length || 0} market items to process`);

    if (marketItems && marketItems.length > 0) {
      for (const item of marketItems) {
        const itemKey = item.external_id || item.id;
        
        // Check data_source to determine which API to use
        const usePriceCharting = item.data_source === 'pricecharting' || 
                                  item.external_id?.startsWith('pricecharting_');
        
        // Try PriceCharting for items with that data source
        if (usePriceCharting) {
          let pcData = null;
          
          // Try ID-based lookup first (more accurate)
          const pcIdInfo = parsePriceChartingExternalId(item.external_id);
          if (pcIdInfo?.type === 'numeric') {
            pcData = await fetchPriceChartingByNumericId(pcIdInfo.value);
          }
          
          // Fall back to search query for slug-based IDs or if numeric lookup failed
          if (!pcData) {
            const searchQuery = mockIdToPriceChartingQuery[item.external_id] || item.name;
            pcData = await fetchPriceChartingPrice(searchQuery);
          }
          
          if (pcData && pcData.price > 0) {
            const oldPrice = Number(item.current_price) || pcData.price;
            const change = ((pcData.price - oldPrice) / oldPrice) * 100;
            
            prices[itemKey] = {
              price: pcData.price,
              change: Math.round(change * 100) / 100,
              source: 'pricecharting',
              timestamp: new Date().toISOString(),
              liquidity: item.liquidity || 'medium',
              salesCount: item.sales_count_30d || undefined,
              imageUrl: item.image_url || undefined,
            };
            
            // Update database with PriceCharting price
            const { error: updateError } = await supabase
              .from('market_items')
              .update({
                current_price: pcData.price,
                change_24h: Math.round(change * 100) / 100,
                data_source: 'pricecharting',
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.id);
              
            if (updateError) {
              console.error(`[fetch-prices] Failed to update ${item.name}:`, updateError);
            } else {
              console.log(`[fetch-prices] Updated ${item.name} to $${pcData.price} (PriceCharting)`);
            }
            
            // Log to price history
            await supabase.from('price_history').insert({
              product_id: item.id,
              price: pcData.price,
              source: 'pricecharting',
              recorded_at: new Date().toISOString(),
            });
            
            await new Promise(resolve => setTimeout(resolve, 200));
            continue;
          }
        }

        // Use cached database price as fallback
        if (item.current_price && Number(item.current_price) > 0) {
          prices[itemKey] = {
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

    console.log(`[fetch-prices] Returning prices for ${Object.keys(prices).length} products`);

    return new Response(
      JSON.stringify({ 
        prices, 
        timestamp: new Date().toISOString(),
        priceChartingEnabled: !!PRICECHARTING_API_KEY,
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
