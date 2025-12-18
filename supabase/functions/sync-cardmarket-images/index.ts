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
  type?: string;
  card_number?: number;
  hp?: number;
  rarity?: string;
  supertype?: string;
  tcgid?: string;
  prices?: {
    cardmarket_price?: number;
    tcgplayer_price?: number;
    cardmarket?: {
      averageSellPrice?: number;
      lowPrice?: number;
      trendPrice?: number;
      avg1?: number;
      avg7?: number;
      avg30?: number;
    };
  };
  images?: {
    small?: string;
    large?: string;
  };
  set?: {
    id?: string;
    name?: string;
    series?: string;
  };
}

interface CardmarketResponse {
  data?: CardmarketCard[];
  results?: number;
  paging?: {
    current: number;
    total: number;
    per_page: number;
  };
}

// Map our categories to Cardmarket game types
// Note: Different APIs might use different game names
const categoryToGame: Record<string, string> = {
  pokemon: "pokemon",
  yugioh: "yugioh", 
  mtg: "mtg", // Try 'mtg' instead of 'magic'
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
    .replace(/\[.*?\]/g, "") // Remove bracketed text
    .replace(/#\d+/g, "") // Remove card numbers
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
  
  // API returns { data: [...], results: <count>, paging: {...} }
  return Array.isArray(data.data) ? data.data : [];
}

function getImageUrl(card: CardmarketCard): string | null {
  return card.images?.large || card.images?.small || null;
}

// Check if an image URL is a sample/placeholder that should be replaced
function isSampleOrBadImage(imageUrl: string | null): boolean {
  if (!imageUrl) return true;
  const lowerUrl = imageUrl.toLowerCase();
  return (
    lowerUrl.includes("sample") ||
    lowerUrl.includes("placeholder") ||
    lowerUrl.includes("no-image") ||
    lowerUrl.includes("noimage") ||
    lowerUrl.includes("default") ||
    lowerUrl.includes("blank") ||
    lowerUrl.length < 20 // Very short URLs are likely placeholders
  );
}

function getPriceData(card: CardmarketCard): { price: number | null; trend: number | null } {
  const prices = card.prices;
  if (!prices) return { price: null, trend: null };
  
  const price = prices.cardmarket?.averageSellPrice || 
                prices.cardmarket?.trendPrice || 
                prices.cardmarket_price || 
                prices.tcgplayer_price || 
                null;
  
  const trend = prices.cardmarket?.trendPrice || null;
  
  return { price, trend };
}

function findBestMatch(cardName: string, results: CardmarketCard[]): CardmarketCard | null {
  if (!Array.isArray(results) || results.length === 0) return null;
  
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

    const { 
      limit = 50, 
      offset = 0, 
      category,
      delay_ms = 200, // 200ms = 5 req/sec = 300/min
      prioritize_valuable = true,
      store_price_history = true,
      refresh_old_images = true, // Also update items with old cached images
      max_image_age_days = 30 // Refresh images older than this
    } = await req.json().catch(() => ({}));

    // Calculate cutoff date for old images
    const imageCutoffDate = new Date();
    imageCutoffDate.setDate(imageCutoffDate.getDate() - max_image_age_days);

    // Build query for cards needing images or price updates
    // Include: null images, placeholder images, sample images, and old cached images
    let query = supabase
      .from("market_items")
      .select("*")
      .range(offset, offset + limit - 1);

    // Order by value if prioritizing valuable cards
    if (prioritize_valuable) {
      query = query.order("current_price", { ascending: false });
    }

    // Filter by category if specified
    if (category && categoryToGame[category]) {
      query = query.eq("category", category);
    } else {
      // Only process TCG categories
      query = query.in("category", Object.keys(categoryToGame));
    }

    // Filter for items needing image updates
    if (refresh_old_images) {
      // Get items with: no image, sample images, placeholder images, or old cached images
      query = query.or(`image_url.is.null,image_url.like.%placeholder%,image_url.like.%sample%,image_url.eq.,updated_at.lt.${imageCutoffDate.toISOString()}`);
    } else {
      query = query.or("image_url.is.null,image_url.like.%placeholder%,image_url.like.%sample%,image_url.eq.");
    }

    const { data: items, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    console.log(`[sync-cardmarket] Processing ${items?.length || 0} items with ${delay_ms}ms delay`);

    const results = {
      processed: 0,
      updated: 0,
      images_added: 0,
      prices_updated: 0,
      price_history_added: 0,
      notFound: 0,
      errors: 0,
      items: [] as { name: string; status: string; image?: string; price?: number }[],
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

        // Rate limiting - configurable delay
        await new Promise(resolve => setTimeout(resolve, delay_ms));

        const cardResults = await searchCardmarket(game, searchQuery, CARDMARKET_API_KEY);
        
        if (!Array.isArray(cardResults) || cardResults.length === 0) {
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
        const priceData = getPriceData(bestMatch);
        
        // Build update data
        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        // Add image if found and it's better than current image
        // Only update if: new image exists, is not a sample, and either we have no image or current is bad
        const currentImageIsBad = isSampleOrBadImage(item.image_url);
        const newImageIsGood = imageUrl && !isSampleOrBadImage(imageUrl);
        
        if (newImageIsGood && currentImageIsBad) {
          updateData.image_url = imageUrl;
          results.images_added++;
          console.log(`[sync-cardmarket] Replacing image for ${item.name}: ${item.image_url?.substring(0, 50)} -> ${imageUrl.substring(0, 50)}`);
        } else if (newImageIsGood && !currentImageIsBad) {
          // Current image is fine, but check if it's old and needs refresh
          const itemUpdated = new Date(item.updated_at);
          const imageCutoff = new Date();
          imageCutoff.setDate(imageCutoff.getDate() - 30);
          
          if (itemUpdated < imageCutoff) {
            updateData.image_url = imageUrl;
            results.images_added++;
            console.log(`[sync-cardmarket] Refreshing old image for ${item.name}`);
          }
        }

        // Add price data if available and different
        if (priceData.price && priceData.price > 0) {
          // Store old price for history
          const oldPrice = item.current_price;
          
          // Only update price if significantly different (>5% change)
          const priceDiff = Math.abs((priceData.price - oldPrice) / oldPrice);
          if (priceDiff > 0.05 || oldPrice === 0) {
            updateData.current_price = priceData.price;
            updateData.base_price = priceData.price;
            updateData.data_source = "cardmarket";
            results.prices_updated++;
            
            // Store price history
            if (store_price_history && oldPrice > 0) {
              await supabase.from("price_history").insert({
                product_id: item.id,
                price: priceData.price,
                source: "cardmarket",
              });
              results.price_history_added++;
            }
          }
        }

        // Update set info if available
        if (bestMatch.set?.name) {
          updateData.set_name = bestMatch.set.name;
        }
        if (bestMatch.set?.series) {
          updateData.series = bestMatch.set.series;
        }
        if (bestMatch.rarity) {
          updateData.rarity = bestMatch.rarity;
        }

        // Only update if we have something to update
        if (Object.keys(updateData).length > 1) {
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
            results.items.push({ 
              name: item.name, 
              status: "updated", 
              image: imageUrl || undefined,
              price: priceData.price || undefined
            });
            console.log(`[sync-cardmarket] Updated ${item.name} - image: ${!!imageUrl}, price: ${priceData.price}`);
          }
        } else {
          results.items.push({ name: item.name, status: "no_update_needed" });
        }

      } catch (itemError) {
        console.error(`[sync-cardmarket] Error processing ${item.name}:`, itemError);
        results.errors++;
        results.items.push({ name: item.name, status: "error" });
      }
    }

    console.log(`[sync-cardmarket] Complete. Updated: ${results.updated}, Images: ${results.images_added}, Prices: ${results.prices_updated}, Not found: ${results.notFound}, Errors: ${results.errors}`);

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
