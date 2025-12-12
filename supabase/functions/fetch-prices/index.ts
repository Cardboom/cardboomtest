import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Apply Cardboom markup: $1-3 for < $100, 1-2% for >= $100
function applyMarkup(price: number): number {
  if (price < 100) {
    // Add $1-3 random markup for items under $100
    const markup = 1 + Math.random() * 2;
    return Math.round((price + markup) * 100) / 100;
  } else {
    // Add 1-2% markup for items $100 and above
    const markupPercent = 0.01 + Math.random() * 0.01;
    return Math.round(price * (1 + markupPercent) * 100) / 100;
  }
}

// Base prices for simulation - will be enhanced with real API data
const basePrices: Record<string, { price: number; change: number; category: string }> = {
  // Pokemon TCG
  'tcg-charizard-1st': { price: 420000, change: 12.3, category: 'pokemon' },
  'tcg-pikachu-illustrator': { price: 2500000, change: 1.8, category: 'pokemon' },
  'tcg-psa10-mewtwo': { price: 28000, change: -0.8, category: 'pokemon' },
  
  // MTG
  'tcg-black-lotus': { price: 185000, change: 6.5, category: 'mtg' },
  
  // NBA Cards
  'nba-lebron-2003': { price: 245000, change: 5.2, category: 'sports' },
  'nba-luka-prizm': { price: 12500, change: -2.1, category: 'sports' },
  'nba-jordan-fleer': { price: 89000, change: 8.4, category: 'sports' },
  'nba-curry-select': { price: 4500, change: 3.7, category: 'sports' },
  
  // Football Cards
  'football-mahomes-prizm': { price: 15000, change: 4.2, category: 'sports' },
  'football-chase-auto': { price: 8900, change: -1.5, category: 'sports' },
  'football-brady-rookie': { price: 125000, change: 2.8, category: 'sports' },
  
  // Figures
  'figure-kaws-companion': { price: 45000, change: 7.2, category: 'figure' },
  'figure-bearbrick-1000': { price: 12000, change: 3.1, category: 'figure' },
};

// Simulate realistic price fluctuation
function getFluctuatedPrice(basePrice: number): number {
  const fluctuation = (Math.random() - 0.5) * 0.02; // +/- 1%
  return Math.round(basePrice * (1 + fluctuation));
}

function getFluctuatedChange(baseChange: number): number {
  const fluctuation = (Math.random() - 0.5) * 0.5;
  return Number((baseChange + fluctuation).toFixed(2));
}

// Fetch from Scryfall API (MTG cards) - Free, no API key needed
async function fetchFromScryfall(cardName: string): Promise<{ price: number; change: number } | null> {
  try {
    // For Black Lotus example
    const searchName = cardName.includes('black-lotus') ? 'Black Lotus' : null;
    if (!searchName) return null;

    const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(searchName)}`, {
      headers: {
        'User-Agent': 'Cardboom/1.0',
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.log(`[Scryfall] Card not found: ${cardName}`);
      return null;
    }

    const data = await response.json();
    const priceUsd = parseFloat(data.prices?.usd || data.prices?.usd_foil || '0');
    
    if (priceUsd > 0) {
      // Scryfall prices are current retail, apply markup
      const markedUpPrice = applyMarkup(priceUsd);
      // Generate a simulated daily change
      const change = (Math.random() - 0.5) * 10; // -5% to +5%
      console.log(`[Scryfall] Found ${cardName}: $${priceUsd} -> $${markedUpPrice} (with markup)`);
      return { price: markedUpPrice, change: Number(change.toFixed(2)) };
    }
    return null;
  } catch (error) {
    console.error('[Scryfall] Error:', error);
    return null;
  }
}

// Fetch from YGOPRODeck API (Yu-Gi-Oh cards) - Free, no API key needed
async function fetchFromYGOPRODeck(cardName: string): Promise<{ price: number; change: number } | null> {
  try {
    const response = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(cardName)}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      console.log(`[YGOPRODeck] Card not found: ${cardName}`);
      return null;
    }

    const data = await response.json();
    if (data.data && data.data.length > 0) {
      const card = data.data[0];
      // Get TCGPlayer price or Cardmarket price
      const priceData = card.card_prices?.[0];
      const price = parseFloat(priceData?.tcgplayer_price || priceData?.cardmarket_price || '0');
      
      if (price > 0) {
        const markedUpPrice = applyMarkup(price);
        const change = (Math.random() - 0.5) * 8;
        console.log(`[YGOPRODeck] Found ${cardName}: $${price} -> $${markedUpPrice} (with markup)`);
        return { price: markedUpPrice, change: Number(change.toFixed(2)) };
      }
    }
    return null;
  } catch (error) {
    console.error('[YGOPRODeck] Error:', error);
    return null;
  }
}

// Fetch from Pokemon TCG API - Free, no API key needed for basic usage
async function fetchFromPokemonTCG(cardName: string): Promise<{ price: number; change: number } | null> {
  try {
    // Map our IDs to Pokemon card names
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
    
    if (!response.ok) {
      console.log(`[PokemonTCG] Card not found: ${cardName}`);
      return null;
    }

    const data = await response.json();
    if (data.data && data.data.length > 0) {
      const card = data.data[0];
      // Get TCGPlayer market price
      const prices = card.tcgplayer?.prices;
      const price = prices?.holofoil?.market || prices?.normal?.market || prices?.['1stEditionHolofoil']?.market || 0;
      
      if (price > 0) {
        const markedUpPrice = applyMarkup(price);
        const change = (Math.random() - 0.5) * 6;
        console.log(`[PokemonTCG] Found ${cardName}: $${price} -> $${markedUpPrice} (with markup)`);
        return { price: markedUpPrice, change: Number(change.toFixed(2)) };
      }
    }
    return null;
  } catch (error) {
    console.error('[PokemonTCG] Error:', error);
    return null;
  }
}

// Main price fetching logic with fallback chain
async function fetchPrice(productId: string): Promise<{ price: number; change: number; source: string } | null> {
  const baseData = basePrices[productId];
  
  // Try real APIs based on category
  if (baseData?.category === 'mtg' || productId.includes('mtg') || productId.includes('lotus')) {
    const scryfallData = await fetchFromScryfall(productId);
    if (scryfallData) {
      return { ...scryfallData, source: 'scryfall' };
    }
  }
  
  if (baseData?.category === 'pokemon' || productId.includes('pokemon') || productId.includes('charizard') || productId.includes('pikachu') || productId.includes('mewtwo')) {
    const pokemonData = await fetchFromPokemonTCG(productId);
    if (pokemonData) {
      return { ...pokemonData, source: 'pokemontcg' };
    }
  }
  
  if (productId.includes('yugioh') || productId.includes('ygo')) {
    const ygoData = await fetchFromYGOPRODeck(productId);
    if (ygoData) {
      return { ...ygoData, source: 'ygoprodeck' };
    }
  }
  
  // Fallback to base prices with fluctuation and markup
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productIds, source = 'all' } = await req.json();
    console.log(`[fetch-prices] Fetching prices for ${productIds?.length || 0} products`);

    if (!productIds || !Array.isArray(productIds)) {
      return new Response(
        JSON.stringify({ error: 'productIds array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prices: Record<string, { price: number; change: number; source: string; timestamp: string }> = {};
    
    // Process in batches to respect rate limits
    for (const productId of productIds) {
      const priceData = await fetchPrice(productId);
      
      if (priceData) {
        prices[productId] = {
          ...priceData,
          timestamp: new Date().toISOString(),
        };
      }
      
      // Small delay to respect API rate limits (50-100ms as per Scryfall guidelines)
      await new Promise(resolve => setTimeout(resolve, 60));
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