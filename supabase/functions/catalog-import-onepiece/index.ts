import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// punk-records GitHub raw URLs - reliable static JSON dataset
const PUNK_RECORDS_BASE = 'https://raw.githubusercontent.com/buhbbl/punk-records/main/english';
const PACKS_URL = `${PUNK_RECORDS_BASE}/packs.json`;
const CARDS_INDEX_URL = `${PUNK_RECORDS_BASE}/index/cards_by_id.json`;

interface OnePieceCard {
  id: string; // e.g., "ST01-004", "OP01-001"
  pack_id: string;
  name: string;
  rarity: string;
  category: string; // Leader, Character, Event, Stage, Don
  img_url: string;
  img_full_url: string;
  colors: string[];
  cost: number | null;
  attributes: string[];
  power: number | null;
  counter: number | null;
  types: string[];
  effect: string | null;
  trigger: string | null;
}

interface Pack {
  id: string;
  raw_title: string;
  title_parts: {
    prefix?: string;
    title: string;
    label?: string;
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

    console.log(`Fetching One Piece cards from punk-records, setFilter: ${setFilter || 'ALL'}, dryRun: ${dryRun}`);

    // First fetch available packs
    console.log(`Fetching packs from: ${PACKS_URL}`);
    const packsResponse = await fetch(PACKS_URL);
    
    if (!packsResponse.ok) {
      throw new Error(`Failed to fetch packs: ${packsResponse.status}`);
    }
    
    const packs: Pack[] = await packsResponse.json();
    console.log(`Found ${packs.length} packs`);

    // Fetch all cards from the index
    console.log(`Fetching cards index from: ${CARDS_INDEX_URL}`);
    const cardsResponse = await fetch(CARDS_INDEX_URL);
    
    if (!cardsResponse.ok) {
      throw new Error(`Failed to fetch cards index: ${cardsResponse.status}`);
    }
    
    const cardsIndex: Record<string, OnePieceCard> = await cardsResponse.json();
    let allCards = Object.values(cardsIndex);
    console.log(`Found ${allCards.length} total cards in index`);

    // Build pack name lookup
    const packNames: Record<string, string> = {};
    for (const pack of packs) {
      packNames[pack.id] = pack.title_parts.title || pack.raw_title;
    }

    // Filter by set if provided (match card ID prefix like "OP01-")
    if (setFilter) {
      const filterUpper = setFilter.toUpperCase();
      allCards = allCards.filter(c => 
        c.id.toUpperCase().startsWith(filterUpper + '-') || 
        c.id.toUpperCase().startsWith(filterUpper)
      );
      console.log(`Filtered to ${allCards.length} cards matching "${setFilter}"`);
    }
    
    console.log(`Fetched ${allCards.length} total One Piece cards`);

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
      cards: []
    };

    // Process each card
    for (const card of allCards.slice(0, limit)) {
      try {
        // Parse card ID (e.g., "OP01-001" or "ST01-004")
        const idMatch = card.id.match(/^([A-Z]+\d+)-(\d+)$/i);
        if (!idMatch) {
          result.errors.push(`${card.name}: Invalid card ID format "${card.id}"`);
          result.skipped++;
          continue;
        }

        const setCode = idMatch[1].toUpperCase(); // e.g., "OP01"
        const cardNumber = idMatch[2]; // e.g., "001"
        const card_code = `${setCode}-${cardNumber}`;
        
        // Build canonical key: onepiece:english:SET:NUMBER
        const canonical_key = `onepiece:english:${setCode.toLowerCase()}:${cardNumber}`;
        
        // Get set name from our pack data
        const setName = packNames[card.pack_id] || getOnePieceSetName(setCode);
        
        // Determine rarity mapping
        const rarityMap: Record<string, string> = {
          'Common': 'C',
          'Uncommon': 'UC',
          'Rare': 'R',
          'SuperRare': 'SR',
          'SecretRare': 'SEC',
          'Leader': 'L',
          'Special': 'SP',
          'TreasureRare': 'TR',
          'Promo': 'P'
        };
        const rarity = rarityMap[card.rarity] || card.rarity;

        const stagingRecord = {
          game: 'onepiece',
          canonical_key,
          set_code: setCode,
          set_name: setName,
          card_number: cardNumber,
          card_name: card.name,
          variant: null,
          finish: null,
          rarity,
          language: 'english',
          image_url: card.img_full_url || card.img_url,
          image_url_hires: card.img_full_url,
          artist: null,
          types: card.colors,
          subtypes: card.types,
          supertype: card.category,
          hp: card.power?.toString() || null,
          retreat_cost: card.cost,
          tcg_id: card.id,
          source_api: 'punk_records_github',
          status: 'pending'
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
              onConflict: 'canonical_key,source_api',
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
        result.errors.push(`${card.name}: ${errorMsg}`);
        result.skipped++;
      }
    }

    // Get unique sets for summary
    const uniqueSets = [...new Set(allCards.map(c => {
      const match = c.id.match(/^([A-Z]+\d+)-/i);
      return match ? match[1].toUpperCase() : c.pack_id;
    }))].sort();

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        setFilter: setFilter || 'ALL',
        totalCards: allCards.length,
        processedCards: Math.min(allCards.length, limit),
        uniqueSets,
        availablePacks: packs.map(p => ({ id: p.id, title: p.title_parts.title })),
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

// Fallback set name lookup
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
    'OP14': 'Sky Island Arc',
    'EB01': 'Memorial Collection',
    'EB02': 'Anime 25th Anniversary',
    'EB03': 'Anime 25th Anniversary Vol.2',
    'PRB01': 'Premium Booster -ONE PIECE CARD THE BEST-',
  };
  return setNames[setCode] || setCode;
}
