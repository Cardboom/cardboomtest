import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Sync Catalog Images
 * 
 * Uses deterministic card code matching (not fuzzy name search) to ensure
 * correct images are associated with cards.
 * 
 * Sources:
 * - One Piece: optcgapi.com (primary, reliable)
 * - Pokemon: pokemon-tcg-api (by set code + card number)
 * - Other TCGs: Cardmarket API (by set + number when available)
 */

// OPTCG API for One Piece cards (most reliable)
const OPTCG_API_BASE = "https://optcgapi.com/api";

interface SyncResult {
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  details: { name: string; status: string; image?: string }[];
}

// Extract card code from One Piece card name (e.g., "Boa Hancock OP03-092" -> "OP03-092")
function extractOnePieceCardCode(name: string, setCode?: string, cardNumber?: string): string | null {
  // First try from set_code and card_number columns
  if (setCode && cardNumber) {
    const normalizedSetCode = setCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let normalizedNumber = cardNumber.replace(/[^0-9]/g, '');
    
    // Pad number to 3 digits
    normalizedNumber = normalizedNumber.padStart(3, '0');
    
    // Handle different set formats
    if (normalizedSetCode.match(/^OP\d+$/)) {
      return `${normalizedSetCode}-${normalizedNumber}`;
    }
    if (normalizedSetCode.match(/^EB\d+$/)) {
      return `${normalizedSetCode}-${normalizedNumber}`;
    }
    if (normalizedSetCode.match(/^ST\d+$/)) {
      return `${normalizedSetCode}-${normalizedNumber}`;
    }
    if (normalizedSetCode.match(/^P\d+$/)) {
      return `${normalizedSetCode}-${normalizedNumber}`;
    }
  }
  
  // Fallback: extract from name
  const patterns = [
    /([A-Z]{2,3}\d{1,2})-(\d{1,3})/i,  // OP01-120, EB02-061, ST01-001
    /([A-Z]{2,3})(\d{1,2})-(\d{1,3})/i, // OP1-120 -> OP01-120
  ];
  
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      if (match[3]) {
        // Pattern with 3 groups
        const prefix = match[1].toUpperCase();
        const setNum = match[2].padStart(2, '0');
        const cardNum = match[3].padStart(3, '0');
        return `${prefix}${setNum}-${cardNum}`;
      } else {
        // Pattern with 2 groups
        const prefix = match[1].toUpperCase();
        const cardNum = match[2].padStart(3, '0');
        return `${prefix}-${cardNum}`;
      }
    }
  }
  
  return null;
}

// Fetch image from OPTCG API by card code
async function fetchOnePieceImage(cardCode: string): Promise<string | null> {
  try {
    // Normalize the card code (e.g., OP3-092 -> OP03-092)
    const normalized = cardCode.replace(/([A-Z]+)(\d+)-(\d+)/i, (_, prefix, set, num) => {
      return `${prefix.toUpperCase()}${set.padStart(2, '0')}-${num.padStart(3, '0')}`;
    });
    
    const url = `${OPTCG_API_BASE}/cards/${normalized}`;
    console.log(`[sync-catalog] Fetching OPTCG: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`[sync-catalog] OPTCG API returned ${response.status} for ${normalized}`);
      return null;
    }
    
    const data = await response.json();
    if (data?.card_image) {
      return data.card_image;
    }
    
    // Fallback: construct URL directly (OPTCG uses consistent URL pattern)
    return `https://optcgapi.com/media/static/Card_Images/${normalized}.jpg`;
  } catch (error) {
    console.error(`[sync-catalog] Error fetching OPTCG image for ${cardCode}:`, error);
    return null;
  }
}

// Fetch Pokemon card image by set code and card number
async function fetchPokemonImage(setCode: string, cardNumber: string): Promise<string | null> {
  try {
    // Pokemon TCG API uses lowercase set codes
    const normalizedSet = setCode.toLowerCase();
    const normalizedNumber = cardNumber.replace(/^0+/, '') || cardNumber; // Remove leading zeros
    
    const url = `https://api.pokemontcg.io/v2/cards/${normalizedSet}-${normalizedNumber}`;
    console.log(`[sync-catalog] Fetching Pokemon TCG: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        // API key optional but increases rate limit
      }
    });
    
    if (!response.ok) {
      console.log(`[sync-catalog] Pokemon TCG API returned ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data?.data?.images?.large || data?.data?.images?.small || null;
  } catch (error) {
    console.error(`[sync-catalog] Error fetching Pokemon image:`, error);
    return null;
  }
}

// Cardmarket API for other games (uses card ID/slug when available)
async function fetchCardmarketImage(
  game: string, 
  setCode: string, 
  cardNumber: string,
  apiKey: string
): Promise<string | null> {
  try {
    // Build a precise query using set and number
    const query = `${setCode} ${cardNumber}`.trim();
    const url = `https://cardmarket-api-tcg.p.rapidapi.com/${game}/cards/search?search=${encodeURIComponent(query)}`;
    
    console.log(`[sync-catalog] Fetching Cardmarket: ${url}`);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "cardmarket-api-tcg.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
    });
    
    if (!response.ok) {
      console.log(`[sync-catalog] Cardmarket API returned ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const cards = data?.data || [];
    
    if (cards.length === 0) return null;
    
    // Try to find exact match by card number
    const exactMatch = cards.find((c: any) => {
      const num = String(c.card_number || '');
      return num === cardNumber || num.padStart(3, '0') === cardNumber.padStart(3, '0');
    });
    
    const card = exactMatch || cards[0];
    return card?.images?.large || card?.images?.small || null;
  } catch (error) {
    console.error(`[sync-catalog] Error fetching Cardmarket image:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cardmarketKey = Deno.env.get("CARDMARKET_RAPIDAPI_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      limit = 50, 
      offset = 0, 
      game,
      force_refresh = false, // Re-fetch even if image exists
      delay_ms = 300
    } = await req.json().catch(() => ({}));

    // Query catalog_cards that need images
    let query = supabase
      .from("catalog_cards")
      .select("*")
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (game) {
      query = query.eq("game", game);
    }

    if (!force_refresh) {
      // Only get cards without images or with placeholder images
      query = query.or("image_url.is.null,image_url.eq.,image_url.like.%placeholder%");
    }

    const { data: cards, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    console.log(`[sync-catalog] Processing ${cards?.length || 0} catalog cards`);

    const results: SyncResult = {
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };

    for (const card of cards || []) {
      results.processed++;
      
      try {
        let imageUrl: string | null = null;

        // One Piece: Use OPTCG API (most reliable)
        if (card.game === 'onepiece') {
          const cardCode = extractOnePieceCardCode(card.name, card.set_code, card.card_number);
          if (cardCode) {
            imageUrl = await fetchOnePieceImage(cardCode);
            console.log(`[sync-catalog] One Piece ${cardCode}: ${imageUrl ? 'found' : 'not found'}`);
          } else {
            console.log(`[sync-catalog] Could not extract card code from: ${card.name}`);
          }
        }
        
        // Pokemon: Use Pokemon TCG API
        else if (card.game === 'pokemon' && card.set_code && card.card_number) {
          imageUrl = await fetchPokemonImage(card.set_code, card.card_number);
        }
        
        // Other games: Use Cardmarket if API key available
        else if (cardmarketKey && card.set_code && card.card_number) {
          const gameMap: Record<string, string> = {
            'mtg': 'mtg',
            'yugioh': 'yugioh',
            'lorcana': 'lorcana',
            'digimon': 'digimon',
          };
          
          const cmGame = gameMap[card.game];
          if (cmGame) {
            await new Promise(r => setTimeout(r, delay_ms)); // Rate limit
            imageUrl = await fetchCardmarketImage(cmGame, card.set_code, card.card_number, cardmarketKey);
          }
        }

        // Update if we found an image
        if (imageUrl) {
          const { error: updateError } = await supabase
            .from("catalog_cards")
            .update({ 
              image_url: imageUrl,
              updated_at: new Date().toISOString()
            })
            .eq("id", card.id);

          if (updateError) {
            console.error(`[sync-catalog] Update error for ${card.name}:`, updateError);
            results.errors++;
            results.details.push({ name: card.name, status: "error" });
          } else {
            results.updated++;
            results.details.push({ name: card.name, status: "updated", image: imageUrl });
          }
        } else {
          results.skipped++;
          results.details.push({ name: card.name, status: "no_image_found" });
        }

        // Small delay between requests
        await new Promise(r => setTimeout(r, 100));

      } catch (itemError) {
        console.error(`[sync-catalog] Error processing ${card.name}:`, itemError);
        results.errors++;
        results.details.push({ name: card.name, status: "error" });
      }
    }

    console.log(`[sync-catalog] Complete. Updated: ${results.updated}, Skipped: ${results.skipped}, Errors: ${results.errors}`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[sync-catalog] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
