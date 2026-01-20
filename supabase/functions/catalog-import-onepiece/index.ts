import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// nemesis312 GitHub - simpler JSON structure with all cards
const CARDS_DB_URL = 'https://raw.githubusercontent.com/nemesis312/OnePieceTCGEngCardList/main/CardDb.json';

interface RawCard {
  Name: string;
  CardNum: string; // Format: "#OP01-001"
  "Card number"?: number; // Just the index
  Rarity: string;
  "Card Type"?: string;
  "Primary color"?: string;
  Power?: number;
  "Cost/Life"?: number;
  Attribute?: string;
  Effect?: string;
  Trigger?: string;
  Img?: string;
  TcgPlayer?: string;
  Alt?: boolean;
  "Type 1"?: string;
  "Type 2"?: string;
}

interface CardDbResponse {
  Cards: RawCard[];
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

    console.log(`Fetching One Piece cards from nemesis312 CardDb, setFilter: ${setFilter || 'ALL'}, dryRun: ${dryRun}`);

    // Fetch all cards from the JSON database
    console.log(`Fetching cards from: ${CARDS_DB_URL}`);
    const response = await fetch(CARDS_DB_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch cards: ${response.status}`);
    }
    
    const data: CardDbResponse = await response.json();
    let allCards = data.Cards || [];
    console.log(`Found ${allCards.length} total cards`);

    // Filter by set if provided (CardNum format: "#OP01-001")
    if (setFilter) {
      const filterUpper = setFilter.toUpperCase();
      allCards = allCards.filter(c => {
        // CardNum is "#OP01-001" format - strip # and extract set code
        const cardNum = String(c.CardNum || '').replace(/^#/, '');
        const match = cardNum.match(/^([A-Z]+\d+)/i);
        const setCode = match ? match[1].toUpperCase() : '';
        return setCode === filterUpper || setCode.startsWith(filterUpper);
      });
      console.log(`Filtered to ${allCards.length} cards matching "${setFilter}"`);
    }

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
      cards: []
    };

    // Process each card
    const cardsToProcess = allCards.slice(0, limit);
    
    // Log first card structure for debugging
    if (cardsToProcess.length > 0) {
      const sampleCard = cardsToProcess[0];
      console.log('Sample card keys:', Object.keys(sampleCard));
      console.log('Sample card:', JSON.stringify(sampleCard).slice(0, 500));
    }
    
    for (const card of cardsToProcess) {
      try {
        // CardNum format is "#OP01-001" - strip the # prefix
        const cardNumRaw = String(card.CardNum || '').replace(/^#/, '');
        
        if (!cardNumRaw) {
          result.skipped++;
          continue;
        }
        
        // Parse card number (e.g., "OP01-001" or "OP-01-001")
        let match = cardNumRaw.match(/^([A-Z]+-?\d+)-(\d+)/i);
        
        // Also try format without dash in set code
        if (!match) {
          match = cardNumRaw.match(/^([A-Z]+)(\d+)-(\d+)/i);
          if (match) {
            // Reconstruct: "OP" + "01" + "-" + "001"
            match = [cardNumRaw, match[1] + match[2], match[3]];
          }
        }
        
        if (!card.Name || !match) {
          if (cardsToProcess.indexOf(card) < 3) {
            console.log(`Skipping card - Name: ${card.Name}, cardNumRaw: "${cardNumRaw}"`);
          }
          result.skipped++;
          continue;
        }

        const setCode = match[1].toUpperCase();
        const cardNumber = match[2].padStart(3, '0');
        const card_code = `${setCode}-${cardNumber}`;
        
        // Build canonical key: onepiece:english:SET:NUMBER
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
        const rarity = rarityMap[card.Rarity] || card.Rarity;

        const stagingRecord = {
          game: 'onepiece',
          canonical_key,
          set_code: setCode,
          set_name: getOnePieceSetName(setCode),
          card_number: cardNumber,
          card_name: card.Name,
          variant: null,
          finish: null,
          rarity,
          language: 'english',
          image_url: card.Img || null,
          image_url_hires: card.Img || null,
          artist: null,
          types: card["Primary color"] ? [card["Primary color"]] : null,
          subtypes: card.Attribute ? [card.Attribute] : null,
          supertype: card["Card Type"],
          hp: card.Power?.toString() || null,
          retreat_cost: card["Cost/Life"] || null,
          tcg_id: card_code,
          source_api: 'nemesis312_github',
          status: 'pending'
        };

        result.cards.push({
          name: card.Name,
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
            result.errors.push(`${card.Name} (${card_code}): ${error.message}`);
            result.skipped++;
          } else {
            result.imported++;
          }
        } else {
          result.imported++;
        }
      } catch (cardError) {
        const errorMsg = cardError instanceof Error ? cardError.message : 'Unknown error';
        result.errors.push(`${card.Name}: ${errorMsg}`);
        result.skipped++;
      }
    }

    // Get unique sets for summary
    const uniqueSets = [...new Set(cardsToProcess.map(c => {
      const cardNum = String(c.CardNum || '').replace(/^#/, '');
      const match = cardNum.match(/^([A-Z]+\d+)/i);
      return match ? match[1].toUpperCase() : '';
    }).filter(Boolean))].sort();

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
