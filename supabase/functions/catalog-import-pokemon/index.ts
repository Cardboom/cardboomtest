import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pokemon TCG API - free, no key needed
const POKEMON_TCG_API = 'https://api.pokemontcg.io/v2';

interface PokemonCard {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  set: {
    id: string;
    name: string;
    series: string;
    printedTotal: number;
    total: number;
    releaseDate: string;
  };
  number: string;
  artist?: string;
  rarity?: string;
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: {
    url: string;
    prices?: Record<string, { market?: number; low?: number; mid?: number; high?: number }>;
  };
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  cards: Array<{
    name: string;
    set: string;
    number: string;
    canonical_key: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use smaller page size to avoid timeouts
    const { setId, dryRun = true, pageSize = 50, maxPages = 10 } = await req.json();

    if (!setId) {
      return new Response(
        JSON.stringify({ error: 'setId is required. Example: "sv1" for Scarlet & Violet base set' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching Pokemon cards for set: ${setId}, dryRun: ${dryRun}`);

    // Fetch all cards from the set
    const allCards: PokemonCard[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= maxPages) {
      const url = `${POKEMON_TCG_API}/cards?q=set.id:${setId}&page=${page}&pageSize=${pageSize}`;
      console.log(`Fetching page ${page}: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout
      
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Pokemon TCG API error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        allCards.push(...data.data);
        
        // Check if there are more pages
        const totalCount = data.totalCount || 0;
        hasMore = allCards.length < totalCount;
        page++;

        console.log(`  Got ${data.data.length} cards, total so far: ${allCards.length}/${totalCount}`);

        // Rate limiting - Pokemon TCG API has limits
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error(`Timeout on page ${page}, stopping pagination`);
          break;
        }
        throw fetchError;
      }
    }

    console.log(`Fetched ${allCards.length} cards from set ${setId}`);

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
      cards: []
    };

    // Process each card
    for (const card of allCards) {
      try {
        // Build canonical key: pokemon:english:SET_CODE:CARD_NUMBER
        const canonical_key = `pokemon:english:${card.set.id}:${card.number}`.toLowerCase();
        
        const stagingRecord = {
          game: 'pokemon',
          canonical_key,
          set_code: card.set.id,
          set_name: card.set.name,
          card_number: card.number,
          card_name: card.name,
          variant: null, // Base variant
          finish: null, // Could be 'holo', 'reverse-holo' based on rarity
          rarity: card.rarity || null,
          language: 'english',
          image_url: card.images.small,
          image_url_hires: card.images.large,
          artist: card.artist || null,
          types: card.types || null,
          subtypes: card.subtypes || null,
          supertype: card.supertype,
          hp: card.hp || null,
          retreat_cost: null, // Not directly available
          tcg_id: card.id,
          source_api: 'pokemon_tcg_api',
          status: 'pending'
        };

        result.cards.push({
          name: card.name,
          set: card.set.name,
          number: card.number,
          canonical_key
        });

        if (!dryRun) {
          // Insert to staging table (upsert to avoid duplicates)
          const { error } = await supabase
            .from('catalog_import_staging')
            .upsert(stagingRecord, { 
              onConflict: 'canonical_key,source_api',
              ignoreDuplicates: false 
            });

          if (error) {
            result.errors.push(`${card.name} (${card.number}): ${error.message}`);
            result.skipped++;
          } else {
            result.imported++;
          }
        } else {
          result.imported++;
        }
      } catch (cardError) {
        const errorMsg = cardError instanceof Error ? cardError.message : 'Unknown error';
        result.errors.push(`${card.name}: ${errorMsg}`);
        result.skipped++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        setId,
        setName: allCards[0]?.set.name || setId,
        totalCardsInSet: allCards.length,
        result,
        message: dryRun 
          ? `DRY RUN: Would import ${result.imported} cards. Set dryRun: false to actually import.`
          : `Imported ${result.imported} cards to staging. ${result.skipped} skipped.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
