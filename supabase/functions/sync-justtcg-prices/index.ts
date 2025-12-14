import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JUSTTCG_API_KEY = Deno.env.get('JUSTTCG_API_KEY');
const JUSTTCG_BASE_URL = 'https://api.justtcg.com/v1';

// Map our categories to JustTCG game identifiers
const categoryToGame: Record<string, string> = {
  'pokemon': 'pokemon',
  'mtg': 'magic',
  'yugioh': 'yugioh',
  'lorcana': 'lorcana',
  'onepiece': 'onepiece',
  'digimon': 'digimon',
};

// Search query mappings for our market items
const itemSearchQueries: Record<string, { game: string; query: string }> = {
  // Pokemon
  'Charizard 1st Edition Base Set': { game: 'pokemon', query: 'charizard base set 1st edition' },
  'Pikachu Illustrator': { game: 'pokemon', query: 'pikachu illustrator' },
  'Mewtwo GX Rainbow Rare': { game: 'pokemon', query: 'mewtwo gx rainbow' },
  
  // MTG
  'Black Lotus Alpha': { game: 'magic', query: 'black lotus alpha' },
  'Mox Sapphire Alpha': { game: 'magic', query: 'mox sapphire alpha' },
  
  // Yu-Gi-Oh
  'Blue-Eyes White Dragon LOB': { game: 'yugioh', query: 'blue-eyes white dragon lob' },
  'Dark Magician SDY': { game: 'yugioh', query: 'dark magician starter deck' },
  
  // Lorcana
  'Elsa Spirit of Winter Enchanted': { game: 'lorcana', query: 'elsa spirit of winter enchanted' },
  'Mickey Mouse Enchanted': { game: 'lorcana', query: 'mickey mouse enchanted' },
  
  // One Piece
  'Monkey D. Luffy Alt Art': { game: 'onepiece', query: 'monkey d luffy alt art' },
  'Shanks Manga Art': { game: 'onepiece', query: 'shanks manga' },
};

async function fetchJustTCGPrice(game: string, query: string): Promise<{
  price: number | null;
  priceChange7d: number | null;
  priceChange30d: number | null;
} | null> {
  if (!JUSTTCG_API_KEY) {
    console.error('[sync-justtcg] Missing JUSTTCG_API_KEY');
    return null;
  }

  try {
    const url = `${JUSTTCG_BASE_URL}/cards?game=${game}&q=${encodeURIComponent(query)}&limit=1`;
    console.log(`[sync-justtcg] Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'x-api-key': JUSTTCG_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[sync-justtcg] API error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(`[sync-justtcg] Response: ${text}`);
      return null;
    }

    const data = await response.json();
    console.log(`[sync-justtcg] Response for ${query}:`, JSON.stringify(data).substring(0, 500));
    
    if (!data.cards || data.cards.length === 0) {
      console.log(`[sync-justtcg] No cards found for: ${query}`);
      return null;
    }

    const card = data.cards[0];
    
    // Get price from variants - prefer Near Mint condition
    let price: number | null = null;
    let priceChange7d: number | null = null;
    let priceChange30d: number | null = null;

    if (card.variants && card.variants.length > 0) {
      // Find Near Mint variant or use first available
      const nmVariant = card.variants.find((v: any) => 
        v.condition?.toLowerCase().includes('near mint') || 
        v.condition?.toLowerCase() === 'nm'
      ) || card.variants[0];

      price = nmVariant.price || null;
      
      // Get statistical data if available
      if (nmVariant.stats) {
        priceChange7d = nmVariant.stats['7d']?.priceChange || null;
        priceChange30d = nmVariant.stats['30d']?.priceChange || null;
      }
    }

    console.log(`[sync-justtcg] Found price for ${query}: $${price}`);
    return { price, priceChange7d, priceChange30d };
  } catch (error) {
    console.error(`[sync-justtcg] Error fetching ${query}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[sync-justtcg] Starting price sync...');

    // Fetch market items for supported categories
    const supportedCategories = Object.keys(categoryToGame);
    const { data: marketItems, error: fetchError } = await supabase
      .from('market_items')
      .select('id, name, category, current_price, change_7d, change_30d')
      .in('category', supportedCategories);

    if (fetchError) {
      console.error('[sync-justtcg] Error fetching market items:', fetchError);
      throw fetchError;
    }

    console.log(`[sync-justtcg] Found ${marketItems?.length || 0} items to process`);

    const results = {
      updated: 0,
      skipped: 0,
      errors: 0,
      items: [] as { name: string; oldPrice: number; newPrice: number | null; status: string }[],
    };

    for (const item of marketItems || []) {
      // Try to find a matching search query
      let searchConfig = itemSearchQueries[item.name];
      
      // If no exact match, try to build a search query from the item name
      if (!searchConfig && item.category in categoryToGame) {
        searchConfig = {
          game: categoryToGame[item.category],
          query: item.name.toLowerCase().replace(/[^\w\s]/g, ''),
        };
      }

      if (!searchConfig) {
        console.log(`[sync-justtcg] No search config for: ${item.name}`);
        results.skipped++;
        continue;
      }

      const priceData = await fetchJustTCGPrice(searchConfig.game, searchConfig.query);
      
      if (priceData && priceData.price) {
        const { error: updateError } = await supabase
          .from('market_items')
          .update({
            current_price: priceData.price,
            change_7d: priceData.priceChange7d,
            change_30d: priceData.priceChange30d,
            data_source: 'justtcg',
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (updateError) {
          console.error(`[sync-justtcg] Error updating ${item.name}:`, updateError);
          results.errors++;
          results.items.push({ name: item.name, oldPrice: item.current_price, newPrice: null, status: 'error' });
        } else {
          console.log(`[sync-justtcg] Updated ${item.name}: $${item.current_price} -> $${priceData.price}`);
          results.updated++;
          results.items.push({ name: item.name, oldPrice: item.current_price, newPrice: priceData.price, status: 'updated' });

          // Log to price_history
          await supabase.from('price_history').insert({
            product_id: item.id,
            price: priceData.price,
            source: 'justtcg',
          });
        }
      } else {
        console.log(`[sync-justtcg] No price found for: ${item.name}`);
        results.skipped++;
        results.items.push({ name: item.name, oldPrice: item.current_price, newPrice: null, status: 'not_found' });
      }

      // Rate limiting - 10 requests/min on free plan = 6 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 6500));
    }

    console.log(`[sync-justtcg] Sync complete. Updated: ${results.updated}, Skipped: ${results.skipped}, Errors: ${results.errors}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Synced ${results.updated} prices from JustTCG`,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[sync-justtcg] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
