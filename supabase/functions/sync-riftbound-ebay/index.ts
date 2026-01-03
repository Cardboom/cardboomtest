import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EBAY_RAPIDAPI_KEY = Deno.env.get("EBAY_RAPIDAPI_KEY");

interface EbayProduct {
  title: string;
  image?: string;
  images?: string[];
  price?: {
    value: string;
    currency: string;
  };
  condition?: string;
  itemId?: string;
}

interface EbaySearchResponse {
  products?: EbayProduct[];
  total?: number;
}

// Parse variant name from eBay title (e.g., "Origins", "Gilded", "Secret Rare")
function parseVariantFromTitle(title: string, baseName: string): string | null {
  const lowerTitle = title.toLowerCase();
  
  // Common Riftbound variants
  const variants = [
    { keyword: 'origins', label: 'Origins' },
    { keyword: 'gilded', label: 'Gilded' },
    { keyword: 'secret rare', label: 'Secret Rare' },
    { keyword: 'alt art', label: 'Alt Art' },
    { keyword: 'full art', label: 'Full Art' },
    { keyword: 'holo', label: 'Holo' },
    { keyword: 'foil', label: 'Foil' },
    { keyword: 'promo', label: 'Promo' },
    { keyword: 'showcase', label: 'Showcase' },
    { keyword: 'textured', label: 'Textured' },
    { keyword: 'extended art', label: 'Extended Art' },
  ];
  
  for (const v of variants) {
    if (lowerTitle.includes(v.keyword)) {
      return v.label;
    }
  }
  
  return null;
}

// Extract base character name from eBay title
function extractCharacterName(title: string): string | null {
  // Common LoL champions in Riftbound
  const champions = [
    'Ahri', 'Jinx', 'Yasuo', 'Lee Sin', 'Kai\'Sa', 'Kaisa', 'Leona', 'Darius',
    'Garen', 'Lux', 'Teemo', 'Miss Fortune', 'Annie', 'Volibear', 'Sett',
    'Viktor', 'Master Yi', 'Vayne', 'Thresh', 'Zed', 'Ashe', 'Morgana',
    'Ekko', 'Vi', 'Caitlyn', 'Jayce', 'Heimerdinger', 'Singed'
  ];
  
  const lowerTitle = title.toLowerCase();
  
  for (const champ of champions) {
    if (lowerTitle.includes(champ.toLowerCase())) {
      return champ;
    }
  }
  
  return null;
}

function parsePrice(priceStr: string | undefined): number | null {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[^0-9.]/g, '');
  const price = parseFloat(cleaned);
  return isNaN(price) || price <= 0 ? null : price;
}

// Calculate match score
function calculateMatchScore(itemName: string, ebayTitle: string): number {
  const normalizedItem = itemName.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const normalizedTitle = ebayTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  
  const itemWords = normalizedItem.split(/\s+/).filter(w => w.length > 2);
  const titleWords = normalizedTitle.split(/\s+/);
  
  let matchCount = 0;
  for (const word of itemWords) {
    if (titleWords.some(tw => tw.includes(word) || word.includes(tw))) {
      matchCount++;
    }
  }
  
  return itemWords.length > 0 ? matchCount / itemWords.length : 0;
}

// Filter outliers using MAD
function filterOutliers(prices: number[]): number[] {
  if (prices.length < 5) return prices;
  
  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  const deviations = sorted.map(p => Math.abs(p - median));
  deviations.sort((a, b) => a - b);
  const mad = deviations[Math.floor(deviations.length / 2)] * 1.4826;
  
  const threshold = 3 * mad;
  return prices.filter(p => Math.abs(p - median) <= threshold);
}

// Calculate robust price
function calculateRobustPrice(prices: number[]): { price: number; confidence: string; sampleSize: number } {
  if (prices.length === 0) return { price: 0, confidence: 'none', sampleSize: 0 };
  
  const filtered = filterOutliers(prices);
  
  if (filtered.length < 3) {
    return { 
      price: prices.length === 1 ? prices[0] : prices.reduce((a, b) => a + b, 0) / prices.length,
      confidence: 'low',
      sampleSize: prices.length 
    };
  }
  
  const trimCount = Math.floor(filtered.length * 0.1);
  const trimmed = filtered.slice(trimCount, filtered.length - trimCount);
  const price = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  
  const confidence = filtered.length >= 10 ? 'high' : filtered.length >= 5 ? 'medium' : 'low';
  
  return { price, confidence, sampleSize: filtered.length };
}

async function searchEbay(query: string): Promise<EbayProduct[]> {
  if (!EBAY_RAPIDAPI_KEY) {
    console.log('eBay RapidAPI key not configured');
    return [];
  }

  try {
    const url = `https://api-for-ebay.p.rapidapi.com/searchProducts?query=${encodeURIComponent(query)}&page=1`;
    
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': EBAY_RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'api-for-ebay.p.rapidapi.com',
      },
    });

    if (!response.ok) {
      console.error(`eBay API error: ${response.status}`);
      return [];
    }

    const data: EbaySearchResponse = await response.json();
    return data.products || [];
  } catch (error) {
    console.error('Error searching eBay:', error);
    return [];
  }
}

// Create URL-friendly slug
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Allow unauthenticated access for admin testing
  const authHeader = req.headers.get('Authorization');
  // Skip auth check for now - this function should only be called by admins

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { 
      dryRun = false,
      limit = 20 
    } = await req.json().catch(() => ({}));

    // Get existing Riftbound items
    const { data: existingItems, error: fetchError } = await supabase
      .from('market_items')
      .select('id, name, current_price, image_url')
      .eq('category', 'lol-riftbound')
      .order('current_price', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch items: ${fetchError.message}`);
    }

    console.log(`Found ${existingItems?.length || 0} existing Riftbound items`);

    const results = {
      processed: 0,
      variantsFound: 0,
      pricesUpdated: 0,
      newVariantsCreated: 0,
      errors: 0,
      details: [] as { name: string; variants: { name: string; price: number; image?: string }[] }[],
    };

    // Track which variants we've already created
    const processedVariants = new Set<string>();

    for (const item of (existingItems || []).slice(0, limit)) {
      try {
        // Extract character name
        const charName = item.name.split(' - ')[0];
        const query = `${charName} riftbound card`;
        
        console.log(`Searching eBay for: ${query}`);
        const products = await searchEbay(query);
        results.processed++;

        if (products.length === 0) {
          console.log(`No eBay results for: ${item.name}`);
          continue;
        }

        // Group products by variant
        const variantGroups: Map<string, { prices: number[]; images: string[]; titles: string[] }> = new Map();
        
        for (const product of products) {
          // Make sure it's a Riftbound card
          if (!product.title.toLowerCase().includes('riftbound')) continue;
          
          // Check if it matches our character
          const productChar = extractCharacterName(product.title);
          if (!productChar || productChar.toLowerCase() !== charName.toLowerCase()) continue;
          
          // Parse variant
          const variant = parseVariantFromTitle(product.title, charName) || 'Standard';
          const price = parsePrice(product.price?.value);
          
          if (!variantGroups.has(variant)) {
            variantGroups.set(variant, { prices: [], images: [], titles: [] });
          }
          
          const group = variantGroups.get(variant)!;
          if (price && price > 0) {
            group.prices.push(price);
          }
          if (product.image) {
            group.images.push(product.image);
          }
          group.titles.push(product.title);
        }

        console.log(`Found ${variantGroups.size} variants for ${charName}`);
        
        const itemDetails: { name: string; price: number; image?: string }[] = [];

        for (const [variant, group] of variantGroups) {
          if (group.prices.length === 0) continue;
          
          const { price: robustPrice, confidence, sampleSize } = calculateRobustPrice(group.prices);
          if (robustPrice <= 0) continue;

          const variantName = variant === 'Standard' 
            ? item.name 
            : `${charName} - ${item.name.split(' - ')[1]} (${variant})`;
          
          const variantKey = `${charName.toLowerCase()}-${variant.toLowerCase()}`;
          
          itemDetails.push({
            name: variantName,
            price: Math.round(robustPrice * 100) / 100,
            image: group.images[0],
          });

          // Update or create the variant
          if (!processedVariants.has(variantKey)) {
            processedVariants.add(variantKey);
            
            if (!dryRun) {
              if (variant === 'Standard' || variant === 'Origins') {
                // Update the main item with the Origins/Standard price
                const { error: updateError } = await supabase
                  .from('market_items')
                  .update({
                    current_price: Math.round(robustPrice * 100) / 100,
                    data_source: 'ebay',
                    image_url: group.images[0] || item.image_url,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', item.id);

                if (updateError) {
                  console.error(`Error updating ${item.name}:`, updateError);
                  results.errors++;
                } else {
                  results.pricesUpdated++;
                  console.log(`Updated ${item.name} to $${robustPrice} from eBay`);
                }
              } else {
                // Create a new variant entry
                const newName = `${charName} - ${item.name.split(' - ')[1]} (${variant})`;
                const slug = createSlug(newName);
                
                // Check if this variant already exists
                const { data: existing } = await supabase
                  .from('market_items')
                  .select('id')
                  .eq('category', 'lol-riftbound')
                  .ilike('name', `%${charName}%${variant}%`)
                  .limit(1);

                if (!existing || existing.length === 0) {
                  const { error: insertError } = await supabase
                    .from('market_items')
                    .insert({
                      name: newName,
                      category: 'lol-riftbound',
                      set_name: 'Riftbound',
                      character_name: charName,
                      current_price: Math.round(robustPrice * 100) / 100,
                      image_url: group.images[0],
                      data_source: 'ebay',
                      rarity: variant.toLowerCase().includes('secret') ? 'Secret Rare' 
                            : variant.toLowerCase().includes('gilded') ? 'Gilded'
                            : 'Rare',
                      liquidity: sampleSize >= 5 ? 'medium' : 'low',
                    });

                  if (insertError) {
                    console.error(`Error creating variant ${newName}:`, insertError);
                    results.errors++;
                  } else {
                    results.newVariantsCreated++;
                    console.log(`Created new variant: ${newName} at $${robustPrice}`);
                  }
                }
              }
            }
          }
          
          results.variantsFound++;
        }

        if (itemDetails.length > 0) {
          results.details.push({
            name: item.name,
            variants: itemDetails,
          });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`Error processing ${item.name}:`, error);
        results.errors++;
      }
    }

    console.log('Riftbound eBay sync completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        ...results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Riftbound sync error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
