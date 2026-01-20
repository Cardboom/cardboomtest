import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OPTCG API - comprehensive One Piece TCG data source with all sets (OP01-OP12+)
const OPTCG_API_BASE = 'https://optcgapi.com/api';

interface OPTCGCard {
  id: string; // e.g., "OP01-001"
  name: string;
  rarity: string;
  colors?: string[];
  color?: string;
  type?: string;
  cost?: number | string;
  power?: number | string;
  counter?: number | string;
  text?: string;
  effect?: string;
  attribute?: string;
  types?: string[];
  img?: string;
  image?: string;
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
    card_code: string;
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

    const { setFilter, dryRun = true, limit = 500 } = await req.json();

    console.log(`[catalog-import-onepiece] Starting. setFilter: ${setFilter || 'ALL'}, dryRun: ${dryRun}, limit: ${limit}`);

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
      cards: []
    };

    // Build API URL - use specific set endpoint if provided
    let apiUrl: string;
    if (setFilter) {
      apiUrl = `${OPTCG_API_BASE}/sets/${setFilter.toUpperCase()}/`;
    } else {
      apiUrl = `${OPTCG_API_BASE}/allSetCards/`;
    }

    console.log(`[catalog-import-onepiece] Fetching from: ${apiUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let response: Response;
    try {
      response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);
      throw new Error(`Failed to fetch from OPTCG API: ${err}`);
    }

    if (!response.ok) {
      throw new Error(`OPTCG API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // API can return array or object with cards/data property
    let allCards: OPTCGCard[] = Array.isArray(data) ? data : (data.cards || data.data || Object.values(data).flat());
    console.log(`[catalog-import-onepiece] Fetched ${allCards.length} cards from API`);

    // Additional filter for allSetCards if setFilter provided
    if (setFilter && !apiUrl.includes(`/sets/${setFilter.toUpperCase()}/`)) {
      const filterUpper = setFilter.toUpperCase();
      allCards = allCards.filter(c => {
        const cardId = (c.id || '').toUpperCase();
        return cardId.startsWith(filterUpper);
      });
      console.log(`[catalog-import-onepiece] Filtered to ${allCards.length} cards for ${filterUpper}`);
    }

    const cardsToProcess = allCards.slice(0, limit);
    
    // Log sample for debugging
    if (cardsToProcess.length > 0) {
      console.log('[catalog-import-onepiece] Sample card:', JSON.stringify(cardsToProcess[0]).slice(0, 500));
    }

    for (const card of cardsToProcess) {
      try {
        const cardId = card.id || '';
        
        // Parse card ID (e.g., "OP01-001" or "ST01-004")
        const match = cardId.match(/^([A-Z]+\d+)-(\d+)/i);
        if (!card.name || !match) {
          result.skipped++;
          continue;
        }

        const setCode = match[1].toUpperCase();
        const cardNumber = match[2].padStart(3, '0');
        const card_code = `${setCode}-${cardNumber}`;
        const canonical_key = `onepiece:english:${setCode.toLowerCase()}:${cardNumber}`;

        // Map rarity
        const rarityMap: Record<string, string> = {
          'C': 'C', 'Common': 'C',
          'UC': 'UC', 'Uncommon': 'UC',
          'R': 'R', 'Rare': 'R',
          'SR': 'SR', 'Super Rare': 'SR',
          'SEC': 'SEC', 'Secret': 'SEC',
          'L': 'L', 'Leader': 'L',
          'SP': 'SP', 'Special': 'SP',
          'P': 'P', 'Promo': 'P',
        };
        const rarity = rarityMap[card.rarity] || card.rarity || '';

        // Get image URL
        const imageUrl = card.image || card.img || null;

        // Get effect text
        const effectText = card.effect || card.text || null;
        
        // Get color (primary)
        const cardColor = card.color || (card.colors && card.colors[0]) || null;
        
        // Parse numeric values
        const cardCost = card.cost !== undefined ? parseInt(String(card.cost)) : null;
        const cardPower = card.power !== undefined ? parseInt(String(card.power)) : null;
        const cardCounter = card.counter !== undefined ? parseInt(String(card.counter)) : null;

        const stagingRecord = {
          game: 'onepiece',
          canonical_key,
          set_code: setCode,
          set_name: getOnePieceSetName(setCode),
          card_number: cardNumber,
          card_name: card.name,
          variant: null,
          finish: null,
          rarity,
          language: 'english',
          image_url: imageUrl,
          image_url_hires: imageUrl,
          artist: null,
          types: card.colors || card.types || null,
          subtypes: card.attribute ? [card.attribute] : (card.types || null),
          supertype: card.type || null,
          hp: cardPower?.toString() || null,
          retreat_cost: cardCost,
          tcg_id: card_code,
          source_api: 'optcg_api',
          status: 'pending',
          // New detailed fields
          effect_text: effectText,
          color: cardColor,
          card_type: card.type || null,
          cost: cardCost,
          power: cardPower,
          counter: cardCounter,
          attribute: card.attribute || null,
        };

        result.cards.push({
          name: card.name,
          set: setCode,
          number: cardNumber,
          canonical_key,
          card_code
        });

        if (!dryRun) {
          const { error } = await supabase
            .from('catalog_import_staging')
            .upsert(stagingRecord, { 
              onConflict: 'canonical_key',
              ignoreDuplicates: false 
            });

          if (error) {
            result.errors.push(`${card.name} (${card_code}): ${error.message}`);
            result.skipped++;
          } else {
            result.imported++;
          }
        } else {
          result.imported++;
        }
      } catch (cardError) {
        const errorMsg = cardError instanceof Error ? cardError.message : 'Unknown error';
        result.errors.push(`Card error: ${errorMsg}`);
        result.skipped++;
      }
    }

    // Get unique sets
    const uniqueSets = [...new Set(result.cards.map(c => c.set))].sort();

    console.log(`[catalog-import-onepiece] Complete. Imported: ${result.imported}, Skipped: ${result.skipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        setFilter: setFilter || 'ALL',
        totalCards: allCards.length,
        processedCards: cardsToProcess.length,
        uniqueSets,
        result,
        message: dryRun 
          ? `DRY RUN: Would import ${result.imported} cards. Set dryRun: false to actually import.`
          : `Imported ${result.imported} cards to staging. ${result.skipped} skipped.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[catalog-import-onepiece] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getOnePieceSetName(setCode: string): string {
  const setNames: Record<string, string> = {
    'ST01': 'Straw Hat Crew',
    'ST02': 'Worst Generation',
    'ST03': 'The Seven Warlords of the Sea',
    'ST04': 'Animal Kingdom Pirates',
    'ST05': 'ONE PIECE FILM edition',
    'ST06': 'Navy',
    'ST07': 'Big Mom Pirates',
    'ST08': 'Monkey D. Luffy',
    'ST09': 'Yamato',
    'ST10': 'The Three Captains',
    'ST11': 'Uta',
    'ST12': 'Zoro & Sanji',
    'ST13': 'The Three Brothers',
    'ST14': '3D2Y',
    'ST15': 'RED Edward.Newgate',
    'ST16': 'GREEN Uta',
    'ST17': 'BLUE Donquixote Doflamingo',
    'ST18': 'PURPLE Monkey D. Luffy',
    'ST19': 'BLACK Smoker',
    'ST20': 'YELLOW Charlotte Katakuri',
    'OP01': 'Romance Dawn',
    'OP02': 'Paramount War',
    'OP03': 'Pillars of Strength',
    'OP04': 'Kingdoms of Intrigue',
    'OP05': 'Awakening of the New Era',
    'OP06': 'Wings of the Captain',
    'OP07': '500 Years in the Future',
    'OP08': 'Two Legends',
    'OP09': 'The Four Emperors',
    'OP10': 'Royal Blood',
    'OP11': 'Gear 5',
    'OP12': 'Impel Down',
    'OP13': 'Carrying On His Will',
    'EB01': 'Memorial Collection',
    'EB02': 'Anime 25th Anniversary',
    'PRB01': 'Premium Booster',
  };
  return setNames[setCode] || setCode;
}
