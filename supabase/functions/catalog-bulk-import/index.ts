import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POKEMON_TCG_API = 'https://api.pokemontcg.io/v2';
const OPTCG_API_BASE = 'https://optcg_api.com' // placeholder, will use optcgapi.com

/**
 * Bulk catalog import — fetches ALL cards for a game and upserts directly to catalog_cards.
 * 
 * POST body:
 *   game: 'pokemon' | 'onepiece' | 'mtg'
 *   batchIndex: number (which batch of sets to process, for Pokemon pagination)
 *   batchSize: number (sets per batch, default 5)
 *   promoteStaging: boolean (also promote any pending staging records)
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('EXTERNAL_SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { game = 'pokemon', batchIndex = 0, batchSize = 5, promoteStaging = true } = body;

    const results = {
      game,
      batchIndex,
      totalSets: 0,
      setsProcessed: [] as string[],
      cardsImported: 0,
      cardsSkipped: 0,
      cardsUpdated: 0,
      stagingPromoted: 0,
      errors: [] as string[],
      hasMore: false,
    };

    if (game === 'pokemon') {
      await importPokemonBatch(supabase, batchIndex, batchSize, results);
    } else if (game === 'onepiece') {
      await importOnePieceAll(supabase, results);
    } else if (game === 'mtg') {
      // MTG uses Scryfall - much larger dataset
      await importMTGBatch(supabase, batchIndex, batchSize, results);
    } else {
      results.errors.push(`Unknown game: ${game}`);
    }

    // Promote staging records if requested
    if (promoteStaging) {
      const promoted = await promoteStagingRecords(supabase, game);
      results.stagingPromoted = promoted;
    }

    console.log(`[catalog-bulk-import] ${game} batch ${batchIndex}: ${results.cardsImported} imported, ${results.cardsUpdated} updated, ${results.errors.length} errors`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[catalog-bulk-import] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// ============================================================
// POKEMON — paginated by sets
// ============================================================
async function importPokemonBatch(
  supabase: ReturnType<typeof createClient>,
  batchIndex: number,
  batchSize: number,
  results: any
) {
  // 1. Fetch all Pokemon sets
  const setsResp = await fetchWithTimeout(`${POKEMON_TCG_API}/sets?orderBy=releaseDate&pageSize=250`);
  if (!setsResp.ok) throw new Error(`Pokemon sets API error: ${setsResp.status}`);
  const setsData = await setsResp.json();
  const allSets = setsData.data || [];
  results.totalSets = allSets.length;

  // 2. Slice to this batch
  const start = batchIndex * batchSize;
  const end = start + batchSize;
  const batchSets = allSets.slice(start, end);
  results.hasMore = end < allSets.length;

  console.log(`[pokemon] Processing sets ${start}-${end} of ${allSets.length}: ${batchSets.map((s: any) => s.id).join(', ')}`);

  // 3. For each set, fetch all cards and upsert
  for (const set of batchSets) {
    try {
      const setCards = await fetchAllPokemonCardsForSet(set.id);
      results.setsProcessed.push(`${set.id} (${set.name}: ${setCards.length} cards)`);

      // Batch upsert
      const records = setCards.map((card: any) => ({
        game: 'pokemon',
        canonical_key: `pokemon:english:${card.set.id}:${card.number}`.toLowerCase(),
        name: card.name,
        set_code: card.set.id,
        set_name: card.set.name,
        card_number: card.number,
        rarity: card.rarity || null,
        image_url: card.images?.small || card.images?.large || null,
      }));

      // Upsert in chunks of 100
      for (let i = 0; i < records.length; i += 100) {
        const chunk = records.slice(i, i + 100);
        const { error, count } = await supabase
          .from('catalog_cards')
          .upsert(chunk, { onConflict: 'canonical_key', ignoreDuplicates: false })
          .select('id');

        if (error) {
          results.errors.push(`${set.id} chunk ${i}: ${error.message}`);
          results.cardsSkipped += chunk.length;
        } else {
          results.cardsImported += chunk.length;
        }
      }

      // Rate limit between sets
      await sleep(300);
    } catch (err) {
      results.errors.push(`Set ${set.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

async function fetchAllPokemonCardsForSet(setId: string): Promise<any[]> {
  const allCards: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const resp = await fetchWithTimeout(
      `${POKEMON_TCG_API}/cards?q=set.id:${setId}&page=${page}&pageSize=250`,
      25000
    );
    if (!resp.ok) throw new Error(`API error for set ${setId}: ${resp.status}`);
    
    const data = await resp.json();
    allCards.push(...(data.data || []));
    hasMore = allCards.length < (data.totalCount || 0);
    page++;

    if (hasMore) await sleep(150);
  }

  return allCards;
}

// ============================================================
// ONE PIECE — fetch all at once
// ============================================================
async function importOnePieceAll(
  supabase: ReturnType<typeof createClient>,
  results: any
) {
  const apiUrl = 'https://optcgapi.com/api/allSetCards/';
  const resp = await fetchWithTimeout(apiUrl, 30000);
  if (!resp.ok) throw new Error(`OPTCG API error: ${resp.status}`);

  const data = await resp.json();
  let allCards: any[] = Array.isArray(data) ? data : (data.cards || data.data || Object.values(data).flat());
  
  console.log(`[onepiece] Fetched ${allCards.length} total cards`);
  results.totalSets = new Set(allCards.map((c: any) => {
    const match = (c.id || '').match(/^([A-Z]+\d+)/i);
    return match ? match[1] : 'unknown';
  })).size;

  const records = allCards.map((card: any) => {
    const cardId = card.id || '';
    const match = cardId.match(/^([A-Z]+\d+)-(\d+)/i);
    if (!match) return null;

    const setCode = match[1].toUpperCase();
    const cardNumber = match[2].padStart(3, '0');
    const card_code = `${setCode}-${cardNumber}`;
    const canonical_key = `onepiece:english:${setCode.toLowerCase()}:${cardNumber}`;

    const rarityMap: Record<string, string> = {
      'C': 'C', 'Common': 'C', 'UC': 'UC', 'Uncommon': 'UC',
      'R': 'R', 'Rare': 'R', 'SR': 'SR', 'Super Rare': 'SR',
      'SEC': 'SEC', 'Secret': 'SEC', 'L': 'L', 'Leader': 'L',
      'SP': 'SP', 'Special': 'SP', 'P': 'P', 'Promo': 'P',
    };

    return {
      game: 'onepiece',
      canonical_key,
      name: card.name,
      set_code: setCode,
      set_name: getOnePieceSetName(setCode),
      card_number: cardNumber,
      card_code,
      rarity: rarityMap[card.rarity] || card.rarity || null,
      image_url: card.image || card.img || null,
      image_url_hires: card.image || card.img || null,
      language: 'english',
      effect_text: card.effect || card.text || null,
      color: card.color || (card.colors && card.colors[0]) || null,
      card_type: card.type || null,
      cost: card.cost !== undefined ? parseInt(String(card.cost)) : null,
      power: card.power !== undefined ? parseInt(String(card.power)) : null,
      counter: card.counter !== undefined ? parseInt(String(card.counter)) : null,
      attribute: card.attribute || null,
    };
  }).filter(Boolean);

  results.setsProcessed.push(`ALL (${records.length} cards)`);

  // Upsert in chunks
  for (let i = 0; i < records.length; i += 100) {
    const chunk = records.slice(i, i + 100);
    const { error } = await supabase
      .from('catalog_cards')
      .upsert(chunk, { onConflict: 'canonical_key', ignoreDuplicates: false });

    if (error) {
      results.errors.push(`OP chunk ${i}: ${error.message}`);
      results.cardsSkipped += chunk.length;
    } else {
      results.cardsImported += chunk.length;
    }
  }
}

// ============================================================
// MTG — uses Scryfall bulk data
// ============================================================
async function importMTGBatch(
  supabase: ReturnType<typeof createClient>,
  batchIndex: number,
  batchSize: number,
  results: any
) {
  // Scryfall sets endpoint
  const setsResp = await fetchWithTimeout('https://api.scryfall.com/sets', 15000);
  if (!setsResp.ok) throw new Error(`Scryfall sets API error: ${setsResp.status}`);
  const setsData = await setsResp.json();
  
  // Filter to main set types (core, expansion, draft_innovation, masters)
  const validTypes = ['core', 'expansion', 'draft_innovation', 'masters', 'commander'];
  const allSets = (setsData.data || []).filter((s: any) => validTypes.includes(s.set_type));
  results.totalSets = allSets.length;

  const start = batchIndex * batchSize;
  const end = start + batchSize;
  const batchSets = allSets.slice(start, end);
  results.hasMore = end < allSets.length;

  console.log(`[mtg] Processing sets ${start}-${end} of ${allSets.length}`);

  for (const set of batchSets) {
    try {
      // Scryfall search by set code
      const cardsResp = await fetchWithTimeout(
        `https://api.scryfall.com/cards/search?q=set:${set.code}&unique=prints&order=set`,
        25000
      );
      if (!cardsResp.ok) {
        if (cardsResp.status === 404) { results.setsProcessed.push(`${set.code} (empty)`); continue; }
        throw new Error(`Scryfall cards error: ${cardsResp.status}`);
      }

      let cardsData = await cardsResp.json();
      let allCards = cardsData.data || [];

      // Follow pagination
      while (cardsData.has_more && cardsData.next_page) {
        await sleep(100); // Scryfall rate limit
        const nextResp = await fetchWithTimeout(cardsData.next_page, 25000);
        if (!nextResp.ok) break;
        cardsData = await nextResp.json();
        allCards.push(...(cardsData.data || []));
      }

      results.setsProcessed.push(`${set.code} (${set.name}: ${allCards.length} cards)`);

      const records = allCards.map((card: any) => ({
        game: 'mtg',
        canonical_key: `mtg:english:${set.code}:${card.collector_number}`.toLowerCase(),
        name: card.name,
        set_code: set.code.toUpperCase(),
        set_name: set.name,
        card_number: card.collector_number,
        card_code: `${set.code.toUpperCase()}-${card.collector_number}`,
        rarity: card.rarity || null,
        image_url: card.image_uris?.normal || card.image_uris?.small || (card.card_faces?.[0]?.image_uris?.normal) || null,
        image_url_hires: card.image_uris?.large || card.image_uris?.png || (card.card_faces?.[0]?.image_uris?.large) || null,
        language: 'english',
        effect_text: card.oracle_text || null,
        card_type: card.type_line || null,
        cost: card.cmc !== undefined ? Math.round(card.cmc) : null,
        power: card.power ? parseInt(card.power) || null : null,
      }));

      for (let i = 0; i < records.length; i += 100) {
        const chunk = records.slice(i, i + 100);
        const { error } = await supabase
          .from('catalog_cards')
          .upsert(chunk, { onConflict: 'canonical_key', ignoreDuplicates: false });

        if (error) {
          results.errors.push(`${set.code} chunk ${i}: ${error.message}`);
          results.cardsSkipped += chunk.length;
        } else {
          results.cardsImported += chunk.length;
        }
      }

      await sleep(100); // Scryfall rate limit
    } catch (err) {
      results.errors.push(`Set ${set.code}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ============================================================
// Promote staging → catalog_cards
// ============================================================
async function promoteStagingRecords(
  supabase: ReturnType<typeof createClient>,
  game: string
): Promise<number> {
  const { data: staged, error } = await supabase
    .from('catalog_import_staging')
    .select('*')
    .eq('game', game)
    .eq('status', 'pending')
    .limit(1000);

  if (error || !staged?.length) return 0;

  const records = staged.map((s: any) => ({
    game: s.game,
    canonical_key: s.canonical_key,
    name: s.card_name,
    set_code: s.set_code,
    set_name: s.set_name,
    card_number: s.card_number,
    card_code: s.tcg_id || `${s.set_code}-${s.card_number}`,
    rarity: s.rarity || null,
    image_url: s.image_url || null,
    image_url_hires: s.image_url_hires || null,
    language: s.language || 'english',
    effect_text: s.effect_text || null,
    color: s.color || null,
    card_type: s.card_type || null,
    cost: s.cost || null,
    power: s.power || null,
    counter: s.counter || null,
    attribute: s.attribute || null,
  }));

  let promoted = 0;
  for (let i = 0; i < records.length; i += 100) {
    const chunk = records.slice(i, i + 100);
    const { error: upsertErr } = await supabase
      .from('catalog_cards')
      .upsert(chunk, { onConflict: 'canonical_key', ignoreDuplicates: false });

    if (!upsertErr) {
      promoted += chunk.length;
      // Mark as promoted
      const keys = chunk.map((r: any) => r.canonical_key);
      await supabase
        .from('catalog_import_staging')
        .update({ status: 'promoted' })
        .in('canonical_key', keys);
    }
  }

  return promoted;
}

// ============================================================
// Helpers
// ============================================================
function getOnePieceSetName(setCode: string): string {
  const setNames: Record<string, string> = {
    'ST01': 'Straw Hat Crew', 'ST02': 'Worst Generation', 'ST03': 'The Seven Warlords of the Sea',
    'ST04': 'Animal Kingdom Pirates', 'ST05': 'ONE PIECE FILM edition', 'ST06': 'Navy',
    'ST07': 'Big Mom Pirates', 'ST08': 'Monkey D. Luffy', 'ST09': 'Yamato',
    'ST10': 'The Three Captains', 'ST11': 'Uta', 'ST12': 'Zoro & Sanji',
    'ST13': 'The Three Brothers', 'ST14': '3D2Y', 'ST15': 'RED Edward.Newgate',
    'ST16': 'GREEN Uta', 'ST17': 'BLUE Donquixote Doflamingo', 'ST18': 'PURPLE Monkey D. Luffy',
    'ST19': 'BLACK Smoker', 'ST20': 'YELLOW Charlotte Katakuri',
    'OP01': 'Romance Dawn', 'OP02': 'Paramount War', 'OP03': 'Pillars of Strength',
    'OP04': 'Kingdoms of Intrigue', 'OP05': 'Awakening of the New Era', 'OP06': 'Wings of the Captain',
    'OP07': '500 Years in the Future', 'OP08': 'Two Legends', 'OP09': 'The Four Emperors',
    'OP10': 'Royal Blood', 'OP11': 'Gear 5', 'OP12': 'Impel Down', 'OP13': 'Carrying On His Will',
    'EB01': 'Memorial Collection', 'EB02': 'Anime 25th Anniversary', 'EB03': 'Anime 25th Collection Extra Booster',
    'PRB01': 'Premium Booster',
  };
  return setNames[setCode] || setCode;
}

async function fetchWithTimeout(url: string, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return resp;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
