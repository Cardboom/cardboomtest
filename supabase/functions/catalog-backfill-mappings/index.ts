import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CatalogCard {
  id: string;
  game: string;
  canonical_key: string;
  set_code: string | null;
  card_number: string | null;
  name: string;
}

interface MarketItem {
  id: string;
  category: string;
  set_code: string | null;
  card_number: string | null;
  name: string;
}

// Normalize strings for matching
function normalize(s: string | null): string {
  if (!s) return '';
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Generate canonical key from market item
function generateCanonicalKey(item: MarketItem): string {
  const game = item.category.toLowerCase();
  const setCode = normalize(item.set_code) || 'unknown';
  const cardNumber = normalize(item.card_number) || 'unknown';
  
  switch (game) {
    case 'onepiece':
      return `onepiece:${setCode}:${cardNumber}:regular`;
    case 'pokemon':
      return `pokemon:${setCode}:${cardNumber}:regular:normal`;
    case 'mtg':
      return `mtg:${setCode}:${cardNumber}`;
    default:
      return `${game}:${setCode}:${cardNumber}`;
  }
}

// Check if catalog card matches market item
function isExactMatch(catalog: CatalogCard, market: MarketItem): boolean {
  // Must be same game/category
  if (catalog.game.toLowerCase() !== market.category.toLowerCase()) {
    return false;
  }

  // One Piece matching: set_code + card_number
  if (catalog.game === 'onepiece') {
    const catalogSet = normalize(catalog.set_code);
    const marketSet = normalize(market.set_code);
    const catalogNum = normalize(catalog.card_number);
    const marketNum = normalize(market.card_number);
    
    // Check if card numbers match (including embedded in name)
    const marketNameNorm = normalize(market.name);
    const catalogNameNorm = normalize(catalog.name);
    
    // Direct match on set_code and card_number
    if (catalogSet && marketSet && catalogNum && marketNum) {
      if (catalogSet === marketSet && catalogNum === marketNum) {
        return true;
      }
    }
    
    // Match on card number embedded in name
    if (catalogNum && (marketNameNorm.includes(catalogNum) || marketNum === catalogNum)) {
      return true;
    }
  }

  // Pokemon matching: set_code + card_number
  if (catalog.game === 'pokemon') {
    const catalogSet = normalize(catalog.set_code);
    const marketSet = normalize(market.set_code);
    const catalogNum = normalize(catalog.card_number);
    const marketNum = normalize(market.card_number);
    
    if (catalogSet === marketSet && catalogNum === marketNum) {
      return true;
    }
  }

  // MTG matching: set_code + collector_number
  if (catalog.game === 'mtg') {
    const catalogSet = normalize(catalog.set_code);
    const marketSet = normalize(market.set_code);
    const catalogNum = normalize(catalog.card_number);
    const marketNum = normalize(market.card_number);
    
    if (catalogSet === marketSet && catalogNum === marketNum) {
      return true;
    }
  }

  // Fallback: name matching with set
  const catalogNameNorm = normalize(catalog.name);
  const marketNameNorm = normalize(market.name);
  
  if (catalogNameNorm === marketNameNorm) {
    return true;
  }

  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { catalogCardId, game, limit = 100 } = await req.json().catch(() => ({}));

    const results = {
      processed: 0,
      mappings_created: 0,
      errors: [] as string[],
    };

    // Get catalog cards to process
    let catalogQuery = supabase
      .from('catalog_cards')
      .select('id, game, canonical_key, set_code, card_number, name')
      .limit(limit);
    
    if (catalogCardId) {
      catalogQuery = catalogQuery.eq('id', catalogCardId);
    } else if (game) {
      catalogQuery = catalogQuery.eq('game', game);
    }

    const { data: catalogCards, error: catalogError } = await catalogQuery;
    
    if (catalogError) {
      throw new Error(`Failed to fetch catalog cards: ${catalogError.message}`);
    }

    if (!catalogCards || catalogCards.length === 0) {
      return new Response(JSON.stringify({ message: 'No catalog cards to process', results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all market items for matching
    const games = [...new Set(catalogCards.map(c => c.game))];
    const { data: marketItems, error: marketError } = await supabase
      .from('market_items')
      .select('id, category, set_code, card_number, name')
      .in('category', games);
    
    if (marketError) {
      throw new Error(`Failed to fetch market items: ${marketError.message}`);
    }

    console.log(`Processing ${catalogCards.length} catalog cards against ${marketItems?.length || 0} market items`);

    // Process each catalog card
    for (const catalog of catalogCards) {
      results.processed++;
      
      try {
        // Find matching market items
        const matches = (marketItems || []).filter(market => isExactMatch(catalog, market));
        
        if (matches.length > 0) {
          console.log(`Found ${matches.length} matches for ${catalog.name} (${catalog.canonical_key})`);
          
          // Insert mappings
          const mappings = matches.map(market => ({
            catalog_card_id: catalog.id,
            market_item_id: market.id,
            canonical_key: catalog.canonical_key,
            confidence: 1.0,
          }));

          const { error: insertError } = await supabase
            .from('catalog_card_map')
            .upsert(mappings, { onConflict: 'catalog_card_id,market_item_id' });
          
          if (insertError) {
            results.errors.push(`${catalog.id}: ${insertError.message}`);
          } else {
            results.mappings_created += matches.length;
          }
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        results.errors.push(`${catalog.id}: ${errMsg}`);
      }
    }

    console.log(`Backfill complete: ${results.mappings_created} mappings created`);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Backfill error:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
