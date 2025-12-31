import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPTCG_API_BASE = "https://optcgapi.com/api";

interface OPTCGCard {
  card_id: string;
  card_name: string;
  card_image: string;
  card_type?: string;
  rarity?: string;
  set_id?: string;
}

// Normalize card name for matching
function normalizeCardName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, '') // Remove parentheticals
    .replace(/op\d{2}-\d{3}/gi, '') // Remove card codes from name
    .replace(/[^\w\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract card code from name (e.g., "OP01-003" from "Monkey D. Luffy OP01-003")
function extractCardCode(name: string): string | null {
  const match = name.match(/OP\d{2}-\d{3}/i);
  return match ? match[0].toUpperCase() : null;
}

// Search for a card by its code
async function searchByCardCode(cardCode: string): Promise<OPTCGCard | null> {
  try {
    const url = `${OPTCG_API_BASE}/sets/card/${cardCode}/`;
    console.log(`[OPTCG] Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: { "Accept": "application/json" }
    });
    
    if (!response.ok) {
      console.log(`[OPTCG] Card ${cardCode} not found: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // API might return array or single object
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    } else if (data && data.card_image) {
      return data;
    }
    
    return null;
  } catch (error) {
    console.error(`[OPTCG] Error fetching ${cardCode}:`, error);
    return null;
  }
}

// Search all cards and find best match by name
async function searchByName(cardName: string): Promise<OPTCGCard | null> {
  try {
    // Try to get all cards and search (OPTCG API is small enough)
    const normalizedSearch = normalizeCardName(cardName);
    
    // Try common character names with likely card codes
    const commonCards: Record<string, string[]> = {
      'monkey d luffy': ['OP01-003', 'OP01-001', 'OP02-001', 'OP03-001', 'OP04-001', 'OP05-001'],
      'roronoa zoro': ['OP01-025', 'OP02-025', 'OP03-025'],
      'shanks': ['OP01-120', 'OP02-096', 'OP04-083'],
      'nami': ['OP01-016', 'OP02-016', 'OP03-016'],
      'trafalgar law': ['OP02-041', 'OP01-041', 'OP04-041'],
      'portgas d ace': ['OP02-013', 'OP03-013'],
      'boa hancock': ['OP03-092', 'OP01-078'],
      'kaido': ['OP04-044', 'OP03-044'],
      'sanji': ['OP01-013', 'OP02-013', 'OP03-013'],
      'whitebeard': ['OP02-001', 'OP04-031'],
      'eustass kid': ['OP03-099', 'OP01-051'],
      'yamato': ['OP04-112', 'OP02-112'],
      'nico robin': ['OP01-017', 'OP02-017'],
      'doflamingo': ['OP03-076', 'OP04-076'],
      'gecko moria': ['OP06-042', 'OP05-042'],
    };
    
    // Check if we have predefined codes for this character
    for (const [charName, codes] of Object.entries(commonCards)) {
      if (normalizedSearch.includes(charName)) {
        for (const code of codes) {
          const card = await searchByCardCode(code);
          if (card?.card_image) {
            return card;
          }
          await new Promise(r => setTimeout(r, 200)); // Rate limit
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`[OPTCG] Error searching for ${cardName}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { limit = 50, offset = 0 } = await req.json().catch(() => ({}));
    
    console.log(`[sync-optcg] Starting One Piece image sync, limit=${limit}, offset=${offset}`);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Fetch One Piece cards missing images
    const { data: cards, error: fetchError } = await supabase
      .from("market_items")
      .select("id, name, category, image_url")
      .in("category", ["one-piece", "onepiece"])
      .or("image_url.is.null,image_url.like.%placeholder%,image_url.eq.")
      .order("current_price", { ascending: false }) // Prioritize valuable cards
      .range(offset, offset + limit - 1);
    
    if (fetchError) {
      throw new Error(`Failed to fetch cards: ${fetchError.message}`);
    }
    
    console.log(`[sync-optcg] Found ${cards?.length || 0} One Piece cards needing images`);
    
    const results = {
      processed: 0,
      updated: 0,
      not_found: 0,
      errors: 0,
      details: [] as Array<{ name: string; status: string; image_url?: string }>
    };
    
    for (const card of cards || []) {
      results.processed++;
      
      try {
        let imageUrl: string | null = null;
        
        // First try: extract card code from name
        const cardCode = extractCardCode(card.name);
        if (cardCode) {
          console.log(`[sync-optcg] Trying card code ${cardCode} for "${card.name}"`);
          const optcgCard = await searchByCardCode(cardCode);
          if (optcgCard?.card_image) {
            imageUrl = optcgCard.card_image;
          }
        }
        
        // Second try: search by character name
        if (!imageUrl) {
          console.log(`[sync-optcg] Searching by name for "${card.name}"`);
          const optcgCard = await searchByName(card.name);
          if (optcgCard?.card_image) {
            imageUrl = optcgCard.card_image;
          }
        }
        
        if (imageUrl) {
          // Update the database
          const { error: updateError } = await supabase
            .from("market_items")
            .update({ 
              image_url: imageUrl,
              updated_at: new Date().toISOString()
            })
            .eq("id", card.id);
          
          if (updateError) {
            console.error(`[sync-optcg] Update error for ${card.name}:`, updateError);
            results.errors++;
            results.details.push({ name: card.name, status: "update_error" });
          } else {
            results.updated++;
            results.details.push({ name: card.name, status: "updated", image_url: imageUrl });
            console.log(`[sync-optcg] ✓ Updated ${card.name} with image`);
          }
        } else {
          results.not_found++;
          results.details.push({ name: card.name, status: "not_found" });
          console.log(`[sync-optcg] ✗ No image found for ${card.name}`);
        }
        
        // Rate limiting - be gentle with the API
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (cardError) {
        console.error(`[sync-optcg] Error processing ${card.name}:`, cardError);
        results.errors++;
        results.details.push({ name: card.name, status: "error" });
      }
    }
    
    console.log(`[sync-optcg] Complete:`, {
      processed: results.processed,
      updated: results.updated,
      not_found: results.not_found,
      errors: results.errors
    });
    
    return new Response(JSON.stringify({
      success: true,
      ...results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[sync-optcg] Fatal error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
