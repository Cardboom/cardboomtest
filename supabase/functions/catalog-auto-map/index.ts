import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MappingResult {
  catalog_card_id: string;
  market_item_id: string;
  canonical_key: string;
  confidence: number;
  match_method: string;
}

interface ReviewQueueEntry {
  catalog_card_id: string;
  candidate_market_item_ids: string[];
  candidate_scores: number[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { game, limit = 500, forceRecompute = false } = await req.json().catch(() => ({}));

    const results = {
      catalog_cards_processed: 0,
      market_items_processed: 0,
      normalized_keys_updated: 0,
      mappings_created: 0,
      exact_key_matches: 0,
      set_number_matches: 0,
      alias_matches: 0,
      review_queue_entries: 0,
      errors: [] as string[],
    };

    // STEP 1: Update normalized_key for all catalog_cards
    console.log("[auto-map] Step 1: Computing normalized keys for catalog_cards...");
    
    let catalogQuery = supabase
      .from('catalog_cards')
      .select('id, game, set_code, card_number, variant, finish, canonical_key');
    
    if (game) {
      catalogQuery = catalogQuery.eq('game', game);
    }
    if (!forceRecompute) {
      catalogQuery = catalogQuery.is('normalized_key', null);
    }
    catalogQuery = catalogQuery.limit(limit);

    const { data: catalogCards, error: catalogError } = await catalogQuery;
    
    if (catalogError) {
      throw new Error(`Failed to fetch catalog cards: ${catalogError.message}`);
    }

    console.log(`[auto-map] Found ${catalogCards?.length || 0} catalog cards to process`);

    // Update normalized keys for catalog cards using SQL function
    for (const card of catalogCards || []) {
      results.catalog_cards_processed++;
      
      const { data: keyResult, error: keyError } = await supabase.rpc('build_normalized_key', {
        game: card.game,
        set_code: card.set_code,
        card_number: card.card_number,
        card_code: null, // catalog_cards doesn't have card_code
        variant: card.variant,
        finish: card.finish,
        collector_number: null
      });

      if (keyError) {
        results.errors.push(`catalog ${card.id}: ${keyError.message}`);
        continue;
      }

      if (keyResult) {
        const { error: updateError } = await supabase
          .from('catalog_cards')
          .update({ normalized_key: keyResult })
          .eq('id', card.id);
        
        if (!updateError) {
          results.normalized_keys_updated++;
        }
      }
    }

    // STEP 2: Update normalized_key for all market_items
    console.log("[auto-map] Step 2: Computing normalized keys for market_items...");
    
    let marketQuery = supabase
      .from('market_items')
      .select('id, category, set_code, card_number, card_code, variant, collector_number');
    
    if (game) {
      marketQuery = marketQuery.eq('category', game);
    }
    if (!forceRecompute) {
      marketQuery = marketQuery.is('normalized_key', null);
    }
    marketQuery = marketQuery.limit(limit);

    const { data: marketItems, error: marketError } = await marketQuery;
    
    if (marketError) {
      throw new Error(`Failed to fetch market items: ${marketError.message}`);
    }

    console.log(`[auto-map] Found ${marketItems?.length || 0} market items to process`);

    for (const item of marketItems || []) {
      results.market_items_processed++;
      
      const { data: keyResult, error: keyError } = await supabase.rpc('build_normalized_key', {
        game: item.category,
        set_code: item.set_code,
        card_number: item.card_number,
        card_code: item.card_code,
        variant: item.variant,
        finish: null, // market_items doesn't have finish
        collector_number: item.collector_number
      });

      if (keyError) {
        results.errors.push(`market ${item.id}: ${keyError.message}`);
        continue;
      }

      if (keyResult) {
        const { error: updateError } = await supabase
          .from('market_items')
          .update({ normalized_key: keyResult })
          .eq('id', item.id);
        
        if (!updateError) {
          results.normalized_keys_updated++;
        }
      }
    }

    // STEP 3: Auto-map using matching ladder
    console.log("[auto-map] Step 3: Running matching ladder...");

    // Get all catalog cards with normalized keys
    const { data: allCatalogCards, error: allCatalogError } = await supabase
      .from('catalog_cards')
      .select('id, game, normalized_key, set_code, card_number, canonical_key')
      .not('normalized_key', 'is', null)
      .limit(limit);

    if (allCatalogError) {
      throw new Error(`Failed to fetch catalog cards for matching: ${allCatalogError.message}`);
    }

    // Get all market items with normalized keys
    const { data: allMarketItems, error: allMarketError } = await supabase
      .from('market_items')
      .select('id, category, normalized_key, set_code, card_number, card_code, variant')
      .not('normalized_key', 'is', null);

    if (allMarketError) {
      throw new Error(`Failed to fetch market items for matching: ${allMarketError.message}`);
    }

    console.log(`[auto-map] Matching ${allCatalogCards?.length || 0} catalog cards against ${allMarketItems?.length || 0} market items`);

    // Build lookup maps for market items
    const marketByNormalizedKey = new Map<string, typeof allMarketItems>();
    const marketByGameSetNumber = new Map<string, typeof allMarketItems>();

    for (const item of allMarketItems || []) {
      // Index by normalized_key
      if (item.normalized_key) {
        if (!marketByNormalizedKey.has(item.normalized_key)) {
          marketByNormalizedKey.set(item.normalized_key, []);
        }
        marketByNormalizedKey.get(item.normalized_key)!.push(item);
      }

      // Index by game:set:number (for fallback matching)
      const setNumKey = `${item.category?.toLowerCase()}:${item.set_code?.toLowerCase() || ''}:${item.card_number?.toLowerCase() || ''}`;
      if (!marketByGameSetNumber.has(setNumKey)) {
        marketByGameSetNumber.set(setNumKey, []);
      }
      marketByGameSetNumber.get(setNumKey)!.push(item);
    }

    const mappingsToInsert: MappingResult[] = [];
    const reviewQueueToInsert: ReviewQueueEntry[] = [];

    for (const catalog of allCatalogCards || []) {
      const matches: { item: typeof allMarketItems[0]; confidence: number; method: string }[] = [];

      // A) Exact normalized_key match -> confidence 1.00
      const exactMatches = marketByNormalizedKey.get(catalog.normalized_key!) || [];
      for (const item of exactMatches) {
        matches.push({ item, confidence: 1.0, method: 'key_exact' });
      }

      // B) If no exact match, try set_code + number match -> confidence 0.98
      if (matches.length === 0) {
        const setNumKey = `${catalog.game?.toLowerCase()}:${catalog.set_code?.toLowerCase() || ''}:${catalog.card_number?.toLowerCase() || ''}`;
        const setNumMatches = marketByGameSetNumber.get(setNumKey) || [];
        for (const item of setNumMatches) {
          matches.push({ item, confidence: 0.98, method: 'set_number_exact' });
        }
      }

      // Process matches
      if (matches.length === 1) {
        // Single match - add to mappings
        const match = matches[0];
        mappingsToInsert.push({
          catalog_card_id: catalog.id,
          market_item_id: match.item.id,
          canonical_key: catalog.canonical_key,
          confidence: match.confidence,
          match_method: match.method,
        });

        if (match.method === 'key_exact') results.exact_key_matches++;
        else if (match.method === 'set_number_exact') results.set_number_matches++;
      } else if (matches.length > 1) {
        // Multiple matches - choose best one (most complete metadata) or add to review queue
        const rankedMatches = matches.sort((a, b) => {
          // Prefer higher confidence
          if (b.confidence !== a.confidence) return b.confidence - a.confidence;
          // Prefer more complete metadata (has variant)
          const aComplete = a.item.variant ? 1 : 0;
          const bComplete = b.item.variant ? 1 : 0;
          return bComplete - aComplete;
        });

        // If top match is clearly better, use it
        if (rankedMatches[0].confidence > rankedMatches[1].confidence ||
            (rankedMatches[0].item.variant && !rankedMatches[1].item.variant)) {
          const match = rankedMatches[0];
          mappingsToInsert.push({
            catalog_card_id: catalog.id,
            market_item_id: match.item.id,
            canonical_key: catalog.canonical_key,
            confidence: match.confidence,
            match_method: match.method,
          });
        } else {
          // Add to review queue
          reviewQueueToInsert.push({
            catalog_card_id: catalog.id,
            candidate_market_item_ids: rankedMatches.slice(0, 5).map(m => m.item.id),
            candidate_scores: rankedMatches.slice(0, 5).map(m => m.confidence),
          });
        }
      }
    }

    // STEP 4: Insert mappings
    console.log(`[auto-map] Inserting ${mappingsToInsert.length} mappings...`);
    
    if (mappingsToInsert.length > 0) {
      // Process in batches of 100
      for (let i = 0; i < mappingsToInsert.length; i += 100) {
        const batch = mappingsToInsert.slice(i, i + 100);
        const { error: insertError } = await supabase
          .from('catalog_card_map')
          .upsert(batch, { onConflict: 'catalog_card_id,market_item_id' });
        
        if (insertError) {
          results.errors.push(`Mapping batch ${i}: ${insertError.message}`);
        } else {
          results.mappings_created += batch.length;
        }
      }
    }

    // STEP 5: Insert review queue entries
    console.log(`[auto-map] Inserting ${reviewQueueToInsert.length} review queue entries...`);
    
    if (reviewQueueToInsert.length > 0) {
      const { error: reviewError } = await supabase
        .from('match_review_queue')
        .upsert(reviewQueueToInsert, { onConflict: 'catalog_card_id' });
      
      if (reviewError) {
        results.errors.push(`Review queue: ${reviewError.message}`);
      } else {
        results.review_queue_entries = reviewQueueToInsert.length;
      }
    }

    console.log(`[auto-map] Complete:`, results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[auto-map] Error:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
