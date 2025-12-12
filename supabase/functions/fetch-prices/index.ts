import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRICECHARTING_API_KEY = Deno.env.get('PRICECHARTING_API_KEY');

// Apply Cardboom markup: $1-3 for < $100, 1-2% for >= $100
function applyMarkup(price: number): number {
  if (price < 100) {
    const markup = 1 + Math.random() * 2;
    return Math.round((price + markup) * 100) / 100;
  } else {
    const markupPercent = 0.01 + Math.random() * 0.01;
    return Math.round(price * (1 + markupPercent) * 100) / 100;
  }
}

// Product ID to PriceCharting search mapping
const priceChartingMap: Record<string, { query: string; console?: string }> = {
  // Pokemon TCG
  'tcg-charizard-1st': { query: 'Charizard Base Set 1st Edition', console: 'Pokemon' },
  'tcg-pikachu-illustrator': { query: 'Pikachu Illustrator', console: 'Pokemon' },
  'tcg-psa10-mewtwo': { query: 'Mewtwo GX Rainbow', console: 'Pokemon' },
  // MTG
  'tcg-black-lotus': { query: 'Black Lotus Alpha', console: 'Magic' },
  'mtg-mox-sapphire': { query: 'Mox Sapphire Alpha', console: 'Magic' },
  // Yu-Gi-Oh
  'yugioh-blue-eyes': { query: 'Blue-Eyes White Dragon LOB', console: 'Yu-Gi-Oh' },
  'yugioh-dark-magician': { query: 'Dark Magician Starter Deck', console: 'Yu-Gi-Oh' },
  // NBA Cards
  'nba-lebron-2003': { query: 'LeBron James Topps Chrome Rookie', console: 'Trading Cards' },
  'nba-jordan-fleer': { query: 'Michael Jordan Fleer Rookie', console: 'Trading Cards' },
  'nba-luka-prizm': { query: 'Luka Doncic Prizm Silver', console: 'Trading Cards' },
  // Football Cards
  'football-mahomes-prizm': { query: 'Patrick Mahomes Prizm Silver', console: 'Trading Cards' },
  'football-brady-rookie': { query: 'Tom Brady Contenders Auto', console: 'Trading Cards' },
  'football-chase-auto': { query: 'Ja\'Marr Chase Optic Auto', console: 'Trading Cards' },
  // One Piece
  'onepiece-luffy-alt': { query: 'Monkey D Luffy Alt Art', console: 'One Piece' },
  'onepiece-shanks-manga': { query: 'Shanks Manga Art', console: 'One Piece' },
  // Lorcana
  'lorcana-elsa-enchanted': { query: 'Elsa Spirit of Winter Enchanted', console: 'Disney Lorcana' },
  'lorcana-mickey-enchanted': { query: 'Mickey Mouse Enchanted', console: 'Disney Lorcana' },
  // Figures
  'figure-kaws-companion': { query: 'KAWS Companion', console: 'Toys' },
  'figure-bearbrick-1000': { query: 'Bearbrick 1000%', console: 'Toys' },
};

// Base prices fallback
const basePrices: Record<string, { price: number; change: number; category: string }> = {
  'tcg-charizard-1st': { price: 420000, change: 12.3, category: 'pokemon' },
  'tcg-pikachu-illustrator': { price: 2500000, change: 1.8, category: 'pokemon' },
  'tcg-psa10-mewtwo': { price: 28000, change: -0.8, category: 'pokemon' },
  'tcg-black-lotus': { price: 185000, change: 6.5, category: 'mtg' },
  'mtg-mox-sapphire': { price: 95000, change: 3.3, category: 'mtg' },
  'yugioh-blue-eyes': { price: 15000, change: 5.6, category: 'yugioh' },
  'yugioh-dark-magician': { price: 8500, change: 3.7, category: 'yugioh' },
  'nba-lebron-2003': { price: 245000, change: 5.2, category: 'sports' },
  'nba-luka-prizm': { price: 12500, change: -2.1, category: 'sports' },
  'nba-jordan-fleer': { price: 89000, change: 8.4, category: 'sports' },
  'football-mahomes-prizm': { price: 15000, change: 4.2, category: 'sports' },
  'football-chase-auto': { price: 8900, change: -1.5, category: 'sports' },
  'football-brady-rookie': { price: 125000, change: 2.8, category: 'sports' },
  'figure-kaws-companion': { price: 45000, change: 7.2, category: 'figure' },
  'figure-bearbrick-1000': { price: 12000, change: 3.1, category: 'figure' },
  'onepiece-luffy-alt': { price: 450, change: 18.4, category: 'onepiece' },
  'onepiece-shanks-manga': { price: 890, change: 18.7, category: 'onepiece' },
  'lorcana-elsa-enchanted': { price: 320, change: 10.3, category: 'lorcana' },
  'lorcana-mickey-enchanted': { price: 280, change: 12.0, category: 'lorcana' },
  'digimon-omnimon-alt': { price: 180, change: 9.1, category: 'digimon' },
  'dbz-goku-secret': { price: 250, change: 13.6, category: 'dragonball' },
  'starwars-vader-showcase': { price: 120, change: 20.0, category: 'starwars' },
  'riftbound-genesis': { price: 75, change: 15.4, category: 'riftbound' },
};

// Fetch from PriceCharting API
async function fetchFromPriceCharting(productId: string): Promise<{ 
  price: number; 
  change: number;
  loosePrice?: number;
  cibPrice?: number;
  gradedPrice?: number;
} | null> {
  if (!PRICECHARTING_API_KEY) {
    console.log('[PriceCharting] API key not configured');
    return null;
  }

  const mapping = priceChartingMap[productId];
  if (!mapping) {
    console.log(`[PriceCharting] No mapping for: ${productId}`);
    return null;
  }

  try {
    const searchQuery = mapping.console 
      ? `${mapping.query} ${mapping.console}` 
      : mapping.query;
    
    const url = `https://www.pricecharting.com/api/product?t=${PRICECHARTING_API_KEY}&q=${encodeURIComponent(searchQuery)}`;
    console.log(`[PriceCharting] Searching: ${searchQuery}`);
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[PriceCharting] API error (${response.status}): ${errorText}`);
      return null;
    }

    const data = await response.json();
    
    if (data.status !== 'success') {
      console.log(`[PriceCharting] Search failed for: ${productId}`, data);
      return null;
    }

    // PriceCharting returns prices in pennies
    const loosePrice = data['loose-price'] ? data['loose-price'] / 100 : 0;
    const cibPrice = data['cib-price'] ? data['cib-price'] / 100 : 0;
    const newPrice = data['new-price'] ? data['new-price'] / 100 : 0;
    const gradedPrice = data['graded-price'] ? data['graded-price'] / 100 : 0;
    
    // Use graded price if available, otherwise CIB, then loose
    const primaryPrice = gradedPrice || cibPrice || newPrice || loosePrice;
    
    if (primaryPrice > 0) {
      // Calculate a simulated change based on variance
      const change = (Math.random() - 0.3) * 10; // Slight bullish bias
      
      console.log(`[PriceCharting] Found ${productId}: $${primaryPrice} (loose: $${loosePrice}, graded: $${gradedPrice})`);
      
      return {
        price: primaryPrice,
        change: Number(change.toFixed(2)),
        loosePrice,
        cibPrice,
        gradedPrice: gradedPrice || undefined,
      };
    }
    
    return null;
  } catch (error) {
    console.error('[PriceCharting] Error:', error);
    return null;
  }
}

// Fetch from Scryfall API (MTG cards) - Free, no API key needed
async function fetchFromScryfall(cardName: string): Promise<{ price: number; change: number } | null> {
  try {
    const searchName = cardName.includes('black-lotus') ? 'Black Lotus' 
      : cardName.includes('mox-sapphire') ? 'Mox Sapphire' 
      : null;
    if (!searchName) return null;

    const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(searchName)}`, {
      headers: { 'User-Agent': 'Cardboom/1.0', 'Accept': 'application/json' }
    });
    
    if (!response.ok) return null;

    const data = await response.json();
    const priceUsd = parseFloat(data.prices?.usd || data.prices?.usd_foil || '0');
    
    if (priceUsd > 0) {
      const markedUpPrice = applyMarkup(priceUsd);
      const change = (Math.random() - 0.5) * 10;
      console.log(`[Scryfall] Found ${cardName}: $${priceUsd} -> $${markedUpPrice}`);
      return { price: markedUpPrice, change: Number(change.toFixed(2)) };
    }
    return null;
  } catch (error) {
    console.error('[Scryfall] Error:', error);
    return null;
  }
}

// Fetch from Pokemon TCG API
async function fetchFromPokemonTCG(cardName: string): Promise<{ price: number; change: number } | null> {
  try {
    const pokemonCardMap: Record<string, string> = {
      'tcg-charizard-1st': 'Charizard',
      'tcg-pikachu-illustrator': 'Pikachu',
      'tcg-psa10-mewtwo': 'Mewtwo',
    };

    const searchName = pokemonCardMap[cardName];
    if (!searchName) return null;

    const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(searchName)}&pageSize=1`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) return null;

    const data = await response.json();
    if (data.data && data.data.length > 0) {
      const card = data.data[0];
      const prices = card.tcgplayer?.prices;
      const price = prices?.holofoil?.market || prices?.normal?.market || prices?.['1stEditionHolofoil']?.market || 0;
      
      if (price > 0) {
        const markedUpPrice = applyMarkup(price);
        const change = (Math.random() - 0.5) * 6;
        console.log(`[PokemonTCG] Found ${cardName}: $${price} -> $${markedUpPrice}`);
        return { price: markedUpPrice, change: Number(change.toFixed(2)) };
      }
    }
    return null;
  } catch (error) {
    console.error('[PokemonTCG] Error:', error);
    return null;
  }
}

function getFluctuatedPrice(basePrice: number): number {
  const fluctuation = (Math.random() - 0.5) * 0.02;
  return Math.round(basePrice * (1 + fluctuation));
}

function getFluctuatedChange(baseChange: number): number {
  const fluctuation = (Math.random() - 0.5) * 0.5;
  return Number((baseChange + fluctuation).toFixed(2));
}

// Main price fetching logic with PriceCharting as primary source
async function fetchPrice(productId: string): Promise<{ 
  price: number; 
  change: number; 
  source: string;
  loosePrice?: number;
  gradedPrice?: number;
} | null> {
  
  // 1. Try PriceCharting first (most comprehensive)
  const priceChartingData = await fetchFromPriceCharting(productId);
  if (priceChartingData) {
    const markedUpPrice = applyMarkup(priceChartingData.price);
    return { 
      price: markedUpPrice, 
      change: priceChartingData.change, 
      source: 'pricecharting',
      loosePrice: priceChartingData.loosePrice,
      gradedPrice: priceChartingData.gradedPrice,
    };
  }
  
  // 2. Try Scryfall for MTG
  if (productId.includes('mtg') || productId.includes('lotus') || productId.includes('mox')) {
    const scryfallData = await fetchFromScryfall(productId);
    if (scryfallData) {
      return { ...scryfallData, source: 'scryfall' };
    }
  }
  
  // 3. Try Pokemon TCG API
  if (productId.includes('pokemon') || productId.includes('charizard') || productId.includes('pikachu') || productId.includes('mewtwo') || productId.startsWith('tcg-')) {
    const pokemonData = await fetchFromPokemonTCG(productId);
    if (pokemonData) {
      return { ...pokemonData, source: 'pokemontcg' };
    }
  }
  
  // 4. Fallback to base prices with fluctuation
  const baseData = basePrices[productId];
  if (baseData) {
    const fluctuatedPrice = getFluctuatedPrice(baseData.price);
    const markedUpPrice = applyMarkup(fluctuatedPrice);
    return {
      price: markedUpPrice,
      change: getFluctuatedChange(baseData.change),
      source: 'cardboom',
    };
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productIds, source = 'all' } = await req.json();
    console.log(`[fetch-prices] Fetching prices for ${productIds?.length || 0} products (PriceCharting: ${PRICECHARTING_API_KEY ? 'enabled' : 'disabled'})`);

    if (!productIds || !Array.isArray(productIds)) {
      return new Response(
        JSON.stringify({ error: 'productIds array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prices: Record<string, { 
      price: number; 
      change: number; 
      source: string; 
      timestamp: string;
      loosePrice?: number;
      gradedPrice?: number;
    }> = {};
    
    for (const productId of productIds) {
      const priceData = await fetchPrice(productId);
      
      if (priceData) {
        prices[productId] = {
          ...priceData,
          timestamp: new Date().toISOString(),
        };
      }
      
      // Rate limit: PriceCharting allows reasonable usage
      await new Promise(resolve => setTimeout(resolve, 100));
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
