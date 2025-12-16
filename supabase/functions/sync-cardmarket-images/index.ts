import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CardmarketCard {
  id: number;
  name: string;
  name_numbered?: string;
  slug?: string;
  image?: string;
  imageUrl?: string;
  prices?: {
    cardmarket_price?: number;
    tcgplayer_price?: number;
  };
  priceFrom?: number;
  priceTrend?: number;
  expansion?: string;
  rarity?: string;
  images?: {
    small?: string;
    large?: string;
  };
}

interface CardmarketResponse {
  data?: CardmarketCard[];
  results?: number; // This is a count, not array!
  paging?: {
    current: number;
    total: number;
    per_page: number;
  };
}

// Map our categories to Cardmarket game types
const categoryToGame: Record<string, string> = {
  pokemon: "pokemon",
  yugioh: "yugioh",
  mtg: "magic",
  onepiece: "onepiece",
  lorcana: "lorcana",
  digimon: "digimon",
};

// Clean card name for better search matching
function cleanCardName(name: string): string {
  return name
    .replace(/PSA\s*\d+/gi, "")
    .replace(/BGS\s*[\d.]+/gi, "")
    .replace(/CGC\s*\d+/gi, "")
    .replace(/1st\s*Edition/gi, "")
    .replace(/Base\s*Set/gi, "")
    .replace(/Holo/gi, "")
    .replace(/Shadowless/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract search query from card name
function getSearchQuery(name: string, category: string): string {
  const cleaned = cleanCardName(name);
  
  // For Pokemon, extract the main Pokemon name
  if (category === "pokemon") {
    const pokemonMatch = cleaned.match(/^(\w+)/);
    if (pokemonMatch) {
      return pokemonMatch[1];
    }
  }
  
  // For Yu-Gi-Oh, use the full cleaned name
  if (category === "yugioh") {
    return cleaned.split(" ").slice(0, 3).join(" ");
  }
  
  // Default: use first 3 words
  return cleaned.split(" ").slice(0, 3).join(" ");
}

async function searchCardmarket(game: string, query: string, apiKey: string): Promise<CardmarketCard[]> {
  const url = `https://cardmarket-api-tcg.p.rapidapi.com/${game}/cards/search?search=${encodeURIComponent(query)}&sort=episode_newest`;
  
  console.log(`[sync-cardmarket] Searching: ${url}`);
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-rapidapi-host": "cardmarket-api-tcg.p.rapidapi.com",
      "x-rapidapi-key": apiKey,
    },
  });
  
  if (!response.ok) {
    console.error(`[sync-cardmarket] API error: ${response.status} ${response.statusText}`);
    return [];
  }
  
  const data: CardmarketResponse = await response.json();
  console.log(`[sync-cardmarket] Got ${JSON.stringify(data).substring(0, 200)}...`);
  
  // API returns { data: [...], results: <count>, paging: {...} }
  // data.results is a NUMBER (count), data.data is the actual array
  return Array.isArray(data.data) ? data.data : [];
}

function getImageUrl(card: CardmarketCard): string | null {
  // Check various image fields in the API response
  return card.images?.large || card.images?.small || card.image || card.imageUrl || null;
}

function findBestMatch(cardName: string, results: CardmarketCard[]): CardmarketCard | null {
  if (results.length === 0) return null;
  
  const normalizedName = cleanCardName(cardName).toLowerCase();
  
  // Try exact match first
  const exactMatch = results.find(r => 
    r.name && r.name.toLowerCase().includes(normalizedName)
  );
  if (exactMatch) return exactMatch;
  
  // Try partial match
  const words = normalizedName.split(" ");
  const partialMatch = results.find(r => {
    if (!r.name) return false;
    const resultName = r.name.toLowerCase();
    return words.some(word => word.length > 2 && resultName.includes(word));
  });
  if (partialMatch) return partialMatch;
  
  // Return first result as fallback
  return results[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CARDMARKET_API_KEY = Deno.env.get("CARDMARKET_RAPIDAPI_KEY");
    if (!CARDMARKET_API_KEY) {
      throw new Error("CARDMARKET_RAPIDAPI_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { limit = 20, offset = 0, category } = await req.json().catch(() => ({}));

    // Build query for cards needing images
    let query = supabase
      .from("market_items")
      .select("*")
      .or("image_url.is.null,image_url.like.%placeholder%,image_url.eq.")
      .order("current_price", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by category if specified
    if (category && categoryToGame[category]) {
      query = query.eq("category", category);
    } else {
      // Only process TCG categories
      query = query.in("category", Object.keys(categoryToGame));
    }

    const { data: items, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    console.log(`[sync-cardmarket] Processing ${items?.length || 0} items`);

    const results = {
      processed: 0,
      updated: 0,
      notFound: 0,
      errors: 0,
      items: [] as { name: string; status: string; image?: string }[],
    };

    for (const item of items || []) {
      try {
        results.processed++;
        
        const game = categoryToGame[item.category];
        if (!game) {
          console.log(`[sync-cardmarket] No game mapping for category: ${item.category}`);
          continue;
        }

        const searchQuery = getSearchQuery(item.name, item.category);
        console.log(`[sync-cardmarket] Searching "${searchQuery}" for "${item.name}" in ${game}`);

        // Rate limiting - wait 500ms between requests (3000/day = ~2/min sustained, but can burst)
        await new Promise(resolve => setTimeout(resolve, 500));

        const cardResults = await searchCardmarket(game, searchQuery, CARDMARKET_API_KEY);
        
        if (cardResults.length === 0) {
          results.notFound++;
          results.items.push({ name: item.name, status: "not_found" });
          console.log(`[sync-cardmarket] No results for: ${item.name}`);
          continue;
        }

        const bestMatch = findBestMatch(item.name, cardResults);
        if (!bestMatch) {
          results.notFound++;
          results.items.push({ name: item.name, status: "no_match" });
          continue;
        }

        const imageUrl = getImageUrl(bestMatch);
        if (!imageUrl) {
          results.notFound++;
          results.items.push({ name: item.name, status: "no_image" });
          console.log(`[sync-cardmarket] No image in result for: ${item.name}`);
          continue;
        }

        // Update the market item with the new image
        const updateData: Record<string, unknown> = {
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        };

        // Also update price trend if available
        if (bestMatch.priceTrend && bestMatch.priceTrend > 0) {
          updateData.data_source = "cardmarket";
        }

        const { error: updateError } = await supabase
          .from("market_items")
          .update(updateData)
          .eq("id", item.id);

        if (updateError) {
          console.error(`[sync-cardmarket] Update error for ${item.name}:`, updateError);
          results.errors++;
          results.items.push({ name: item.name, status: "error" });
        } else {
          results.updated++;
          results.items.push({ name: item.name, status: "updated", image: imageUrl });
          console.log(`[sync-cardmarket] Updated ${item.name} with image: ${imageUrl.substring(0, 50)}...`);
        }

      } catch (itemError) {
        console.error(`[sync-cardmarket] Error processing ${item.name}:`, itemError);
        results.errors++;
        results.items.push({ name: item.name, status: "error" });
      }
    }

    console.log(`[sync-cardmarket] Complete. Updated: ${results.updated}, Not found: ${results.notFound}, Errors: ${results.errors}`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[sync-cardmarket] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
