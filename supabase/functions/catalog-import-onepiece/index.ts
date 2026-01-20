import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OPTCG API - free One Piece card database
const OPTCG_API_SETS = 'https://optcgapi.com/api/allSets/';
const OPTCG_API_SET = 'https://optcgapi.com/api/sets/'; // + setId

interface OnePieceCard {
  id: string;
  name: string;
  type: string; // Leader, Character, Event, Stage
  category?: string;
  cost?: number;
  power?: number;
  counter?: number;
  color: string | string[];
  attribute?: string;
  effect?: string;
  trigger?: string;
  rarity: string;
  set: string; // e.g., "OP01", "OP02"
  cardNumber: string; // e.g., "001", "002"
  imageUrl?: string;
  altArt?: boolean;
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

    const { setFilter, dryRun = true } = await req.json();

    console.log(`Fetching One Piece cards, setFilter: ${setFilter || 'ALL'}, dryRun: ${dryRun}`);

    let allCards: OnePieceCard[] = [];

    if (setFilter) {
      // Fetch specific set
      const setUrl = `${OPTCG_API_SET}${setFilter}/`;
      console.log(`Fetching set: ${setUrl}`);
      const response = await fetch(setUrl);
      
      if (!response.ok) {
        throw new Error(`OPTCG API error for set ${setFilter}: ${response.status}`);
      }
      
      const setData = await response.json();
      allCards = Array.isArray(setData) ? setData : setData.cards || [];
    } else {
      // Fetch all sets first, then get cards from each
      console.log(`Fetching all sets from: ${OPTCG_API_SETS}`);
      const setsResponse = await fetch(OPTCG_API_SETS);
      
      if (!setsResponse.ok) {
        throw new Error(`OPTCG API error: ${setsResponse.status}`);
      }
      
      const sets = await setsResponse.json();
      console.log(`Found ${sets.length || Object.keys(sets).length} sets`);
      
      // Get cards from each set
      const setIds = Array.isArray(sets) ? sets.map((s: any) => s.id || s.setCode || s) : Object.keys(sets);
      
      for (const setId of setIds.slice(0, 20)) { // Limit to first 20 sets for safety
        try {
          const setUrl = `${OPTCG_API_SET}${setId}/`;
          const response = await fetch(setUrl);
          if (response.ok) {
            const setData = await response.json();
            const cards = Array.isArray(setData) ? setData : setData.cards || [];
            allCards.push(...cards);
          }
          await new Promise(resolve => setTimeout(resolve, 100)); // Rate limit
        } catch (e) {
          console.error(`Error fetching set ${setId}:`, e);
        }
      }
    }
    
    console.log(`Fetched ${allCards.length} total One Piece cards`);

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
      cards: []
    };

    // Process each card
    for (const card of allCards) {
      try {
        // Normalize card number to 3 digits (e.g., "1" -> "001")
        const normalizedNumber = card.cardNumber.padStart(3, '0');
        
        // Build card code: OP01-001
        const card_code = `${card.set}-${normalizedNumber}`;
        
        // Build canonical key: onepiece:english:SET:NUMBER
        const canonical_key = `onepiece:english:${card.set.toLowerCase()}:${normalizedNumber}`;
        
        // Determine variant (alt art, parallel, etc.)
        const variant = card.altArt ? 'alt-art' : null;
        
        // Handle color array
        const colorStr = Array.isArray(card.color) ? card.color.join('/') : card.color;

        const stagingRecord = {
          game: 'onepiece',
          canonical_key,
          set_code: card.set,
          set_name: getOnePieceSetName(card.set),
          card_number: normalizedNumber,
          card_name: card.name,
          variant,
          finish: null,
          rarity: card.rarity,
          language: 'english',
          image_url: card.imageUrl || null,
          image_url_hires: null,
          artist: null,
          types: [colorStr], // Use types for color
          subtypes: card.type ? [card.type] : null, // Leader, Character, etc.
          supertype: card.category || card.type,
          hp: card.power?.toString() || null, // Use HP field for power
          retreat_cost: card.cost || null, // Use retreat_cost for cost
          tcg_id: card.id || card_code,
          source_api: 'optcg_api',
          status: 'pending'
        };

        result.cards.push({
          name: card.name,
          set: card.set,
          number: normalizedNumber,
          canonical_key,
          card_code
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
    const uniqueSets = [...new Set(allCards.map(c => c.set))].sort();

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        setFilter: setFilter || 'ALL',
        totalCards: allCards.length,
        uniqueSets,
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

// Helper to get full set names
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
    'P': 'Promo',
  };
  return setNames[setCode] || setCode;
}
