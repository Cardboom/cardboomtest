import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Product ID to market_items name mapping
const productIdToMarketItem: Record<string, string> = {
  // Pokemon
  'tcg-charizard-1st': 'Charizard 1st Edition',
  'tcg-pikachu-illustrator': 'Pikachu Illustrator',
  'tcg-psa10-mewtwo': 'Mewtwo Rainbow',
  // MTG
  'tcg-black-lotus': 'Black Lotus',
  'mtg-mox-sapphire': 'Black Lotus', // Using Black Lotus as fallback
  // Yu-Gi-Oh
  'yugioh-blue-eyes': 'Blue-Eyes White Dragon',
  'yugioh-dark-magician': 'Dark Magician',
  // NBA
  'nba-lebron-2003': 'LeBron James Rookie',
  'nba-jordan-fleer': 'Michael Jordan Fleer',
  'nba-luka-prizm': 'Luka Dončić Prizm',
  // NFL
  'football-mahomes-prizm': 'Patrick Mahomes Prizm',
  'football-brady-rookie': 'Tom Brady Contenders',
  'football-chase-auto': "Ja'Marr Chase Optic",
  // One Piece
  'onepiece-luffy-alt': 'Monkey D. Luffy',
  'onepiece-shanks-manga': 'Shanks',
  // Lorcana
  'lorcana-elsa-enchanted': 'Elsa - Snow Queen',
  'lorcana-mickey-enchanted': 'Mickey Mouse',
  // Figures
  'figure-kaws-companion': 'KAWS Companion',
  'figure-bearbrick-1000': 'Bearbrick KAWS',
};

// Fallback prices for game points and items not in database
const fallbackPrices: Record<string, { price: number; change: number }> = {
  'digimon-omnimon-alt': { price: 180, change: 9.1 },
  'dbz-goku-secret': { price: 250, change: 13.6 },
  'starwars-vader-showcase': { price: 120, change: 20.0 },
  'riftbound-genesis': { price: 75, change: 15.4 },
  'pubg-600uc': { price: 10.20, change: 0 },
  'pubg-1500uc': { price: 25.50, change: 0 },
  'pubg-3850uc': { price: 51.00, change: 0 },
  'valorant-1000vp': { price: 10.20, change: 0 },
  'valorant-2050vp': { price: 20.40, change: 0 },
  'valorant-5350vp': { price: 51.00, change: 0 },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productIds } = await req.json();
    console.log(`[fetch-prices] Fetching prices for ${productIds?.length || 0} products from database`);

    if (!productIds || !Array.isArray(productIds)) {
      return new Response(
        JSON.stringify({ error: 'productIds array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all market items from database
    const { data: marketItems, error: dbError } = await supabase
      .from('market_items')
      .select('name, current_price, change_24h, category');

    if (dbError) {
      console.error('[fetch-prices] Database error:', dbError);
      throw dbError;
    }

    console.log(`[fetch-prices] Found ${marketItems?.length || 0} market items in database`);

    // Create a map for quick lookup
    const marketItemMap: Record<string, { price: number; change: number }> = {};
    if (marketItems) {
      for (const item of marketItems) {
        marketItemMap[item.name] = {
          price: Number(item.current_price) || 0,
          change: Number(item.change_24h) || 0,
        };
      }
    }

    const prices: Record<string, { 
      price: number; 
      change: number; 
      source: string; 
      timestamp: string;
    }> = {};
    
    for (const productId of productIds) {
      // First try to find in database via mapping
      const marketItemName = productIdToMarketItem[productId];
      const dbData = marketItemName ? marketItemMap[marketItemName] : null;
      
      if (dbData && dbData.price > 0) {
        prices[productId] = {
          price: dbData.price,
          change: dbData.change,
          source: 'database',
          timestamp: new Date().toISOString(),
        };
        console.log(`[fetch-prices] ${productId}: $${dbData.price} (${dbData.change}%) from database`);
      } else if (fallbackPrices[productId]) {
        // Use fallback for game points etc
        const fallback = fallbackPrices[productId];
        prices[productId] = {
          price: fallback.price,
          change: fallback.change,
          source: 'cardboom',
          timestamp: new Date().toISOString(),
        };
        console.log(`[fetch-prices] ${productId}: $${fallback.price} from fallback`);
      } else {
        console.log(`[fetch-prices] ${productId}: No price found`);
      }
    }

    console.log(`[fetch-prices] Returning prices for ${Object.keys(prices).length} products`);

    return new Response(
      JSON.stringify({ prices, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[fetch-prices] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
