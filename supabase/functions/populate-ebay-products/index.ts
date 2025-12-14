import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Default search queries for different categories
const defaultSearchQueries = [
  // Pokemon
  { query: 'Pokemon PSA 10 Charizard', category: 'pokemon', subcategory: 'Base Set' },
  { query: 'Pokemon PSA 10 Pikachu VMAX', category: 'pokemon', subcategory: 'Modern' },
  { query: 'Pokemon PSA 9 Umbreon VMAX Alt Art', category: 'pokemon', subcategory: 'Evolving Skies' },
  { query: 'Pokemon PSA 10 Gengar', category: 'pokemon', subcategory: 'Modern' },
  { query: 'Pokemon PSA 10 Mew', category: 'pokemon', subcategory: 'Celebrations' },
  // Yu-Gi-Oh
  { query: 'Yugioh PSA 10 Blue Eyes White Dragon', category: 'yugioh', subcategory: 'LOB' },
  { query: 'Yugioh PSA 10 Dark Magician', category: 'yugioh', subcategory: 'SDY' },
  { query: 'Yugioh PSA 9 Exodia', category: 'yugioh', subcategory: 'LOB' },
  { query: 'Yugioh Starlight Rare', category: 'yugioh', subcategory: 'Starlight' },
  // One Piece
  { query: 'One Piece TCG Luffy Alt Art', category: 'onepiece', subcategory: 'OP01' },
  { query: 'One Piece TCG Shanks Manga', category: 'onepiece', subcategory: 'OP01' },
  { query: 'One Piece TCG Nami Alt Art', category: 'onepiece', subcategory: 'OP01' },
  // NBA
  { query: 'PSA 10 LeBron James Prizm Silver', category: 'nba', subcategory: 'Prizm' },
  { query: 'PSA 10 Michael Jordan Fleer', category: 'nba', subcategory: 'Fleer' },
  { query: 'PSA 10 Luka Doncic Prizm', category: 'nba', subcategory: 'Prizm' },
  { query: 'PSA 10 Stephen Curry Rookie', category: 'nba', subcategory: 'Topps' },
  { query: 'PSA 10 Giannis Antetokounmpo Prizm', category: 'nba', subcategory: 'Prizm' },
  // Football
  { query: 'PSA 10 Patrick Mahomes Prizm Silver', category: 'football', subcategory: 'Prizm' },
  { query: 'PSA 10 Tom Brady Rookie', category: 'football', subcategory: 'Contenders' },
  { query: 'PSA 10 Josh Allen Prizm', category: 'football', subcategory: 'Prizm' },
  // MTG
  { query: 'MTG Alpha Black Lotus', category: 'mtg', subcategory: 'Alpha' },
  { query: 'MTG Revised Dual Land', category: 'mtg', subcategory: 'Revised' },
  // Lorcana
  { query: 'Lorcana Enchanted Elsa', category: 'lorcana', subcategory: 'The First Chapter' },
  { query: 'Lorcana Enchanted Mickey', category: 'lorcana', subcategory: 'The First Chapter' },
];

interface EbayItem {
  itemId: string;
  title: string;
  price?: { value: string; currency: string };
  image?: { imageUrl: string };
  thumbnailImages?: Array<{ imageUrl: string }>;
  condition?: string;
  seller?: { username: string };
  itemWebUrl?: string;
}

async function fetchEbayListings(query: string, limit: number = 20): Promise<EbayItem[]> {
  const EBAY_API_KEY = Deno.env.get('EBAY_AUTH_TOKEN') || Deno.env.get('EBAY_BROWSE_API_KEY');
  
  if (!EBAY_API_KEY) {
    console.error('[populate-ebay] No eBay API key configured');
    return [];
  }

  try {
    const searchParams = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      filter: 'buyingOptions:{FIXED_PRICE}',
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
      console.error(`[populate-ebay] eBay API error for "${query}":`, response.status);
      return [];
    }

    const data = await response.json();
    return data.itemSummaries || [];
  } catch (error) {
    console.error(`[populate-ebay] Error fetching "${query}":`, error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { queries, limit = 10 } = await req.json().catch(() => ({}));
    
    const searchQueries = queries && Array.isArray(queries) && queries.length > 0 
      ? queries 
      : defaultSearchQueries;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log(`[populate-ebay] Starting to fetch ${searchQueries.length} categories`);

    let totalInserted = 0;
    let totalUpdated = 0;
    const results: any[] = [];

    for (const search of searchQueries) {
      const items = await fetchEbayListings(search.query, limit);
      
      if (items.length === 0) {
        console.log(`[populate-ebay] No items found for: ${search.query}`);
        continue;
      }

      console.log(`[populate-ebay] Found ${items.length} items for: ${search.query}`);

      for (const item of items) {
        const price = parseFloat(item.price?.value || '0');
        if (price <= 0) continue;

        const imageUrl = item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl;
        const name = item.title?.slice(0, 200) || 'Unknown Item';
        const externalId = `ebay-${item.itemId}`;

        // Check if item already exists
        const { data: existing } = await supabase
          .from('market_items')
          .select('id, current_price')
          .eq('external_id', externalId)
          .single();

        if (existing) {
          // Update price if changed significantly (>5%)
          const priceDiff = Math.abs(price - existing.current_price) / existing.current_price;
          if (priceDiff > 0.05) {
            const { error: updateError } = await supabase
              .from('market_items')
              .update({
                current_price: price,
                price_24h_ago: existing.current_price,
                change_24h: ((price - existing.current_price) / existing.current_price) * 100,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);

            if (!updateError) {
              totalUpdated++;
              
              // Log price history
              await supabase.from('price_history').insert({
                product_id: existing.id,
                price: price,
                source: 'ebay',
              });
            }
          }
        } else {
          // Insert new item
          const { error: insertError } = await supabase
            .from('market_items')
            .insert({
              name,
              category: search.category,
              subcategory: search.subcategory,
              current_price: price,
              base_price: price,
              image_url: imageUrl,
              external_id: externalId,
              data_source: 'ebay',
              is_trending: items.indexOf(item) < 3, // Top 3 are trending
            });

          if (!insertError) {
            totalInserted++;
          } else {
            console.error(`[populate-ebay] Insert error:`, insertError.message);
          }
        }
      }

      results.push({
        query: search.query,
        category: search.category,
        found: items.length,
      });

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`[populate-ebay] Complete: ${totalInserted} inserted, ${totalUpdated} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        inserted: totalInserted,
        updated: totalUpdated,
        results,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[populate-ebay] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});