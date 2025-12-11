import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simulated price data - replace with real API calls when keys are added
const mockPrices: Record<string, { price: number; change: number }> = {
  'nba-lebron-2003': { price: 245000, change: 5.2 },
  'nba-luka-prizm': { price: 12500, change: -2.1 },
  'nba-jordan-fleer': { price: 89000, change: 8.4 },
  'nba-curry-select': { price: 4500, change: 3.7 },
  'football-mahomes-prizm': { price: 15000, change: 4.2 },
  'football-chase-auto': { price: 8900, change: -1.5 },
  'football-brady-rookie': { price: 125000, change: 2.8 },
  'tcg-charizard-1st': { price: 420000, change: 12.3 },
  'tcg-pikachu-illustrator': { price: 2500000, change: 1.8 },
  'tcg-black-lotus': { price: 185000, change: 6.5 },
  'tcg-psa10-mewtwo': { price: 28000, change: -0.8 },
  'figure-kaws-companion': { price: 45000, change: 7.2 },
  'figure-bearbrick-1000': { price: 12000, change: 3.1 },
};

// Simulate price fluctuation
function getFluctuatedPrice(basePrice: number): number {
  const fluctuation = (Math.random() - 0.5) * 0.02; // +/- 1%
  return Math.round(basePrice * (1 + fluctuation));
}

function getFluctuatedChange(baseChange: number): number {
  const fluctuation = (Math.random() - 0.5) * 0.5;
  return Number((baseChange + fluctuation).toFixed(2));
}

// TODO: Implement real API calls
async function fetchFromTCGPlayer(productId: string): Promise<{ price: number; change: number } | null> {
  // Requires TCGPLAYER_API_KEY secret
  // const apiKey = Deno.env.get('TCGPLAYER_API_KEY');
  // if (!apiKey) return null;
  // Implement actual API call here
  console.log(`[TCGPlayer] Would fetch price for: ${productId}`);
  return null;
}

async function fetchFromEbay(productId: string): Promise<{ price: number; change: number } | null> {
  // Requires EBAY_API_KEY secret
  // const apiKey = Deno.env.get('EBAY_API_KEY');
  // if (!apiKey) return null;
  // Implement actual API call here
  console.log(`[eBay] Would fetch price for: ${productId}`);
  return null;
}

async function fetchFromSportsCardInvestor(productId: string): Promise<{ price: number; change: number } | null> {
  // Requires SPORTS_CARD_INVESTOR_API_KEY secret
  // const apiKey = Deno.env.get('SPORTS_CARD_INVESTOR_API_KEY');
  // if (!apiKey) return null;
  // Implement actual API call here
  console.log(`[SportsCardInvestor] Would fetch price for: ${productId}`);
  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productIds, source = 'all' } = await req.json();
    console.log(`Fetching prices for ${productIds?.length || 0} products from source: ${source}`);

    if (!productIds || !Array.isArray(productIds)) {
      return new Response(
        JSON.stringify({ error: 'productIds array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prices: Record<string, { price: number; change: number; source: string; timestamp: string }> = {};

    for (const productId of productIds) {
      let priceData: { price: number; change: number } | null = null;
      let priceSource = 'mock';

      // Try real APIs first based on source preference
      if (source === 'all' || source === 'tcgplayer') {
        priceData = await fetchFromTCGPlayer(productId);
        if (priceData) priceSource = 'tcgplayer';
      }

      if (!priceData && (source === 'all' || source === 'ebay')) {
        priceData = await fetchFromEbay(productId);
        if (priceData) priceSource = 'ebay';
      }

      if (!priceData && (source === 'all' || source === 'sportscardinvestor')) {
        priceData = await fetchFromSportsCardInvestor(productId);
        if (priceData) priceSource = 'sportscardinvestor';
      }

      // Fall back to mock data with simulated fluctuation
      if (!priceData) {
        const mockBase = mockPrices[productId];
        if (mockBase) {
          priceData = {
            price: getFluctuatedPrice(mockBase.price),
            change: getFluctuatedChange(mockBase.change),
          };
          priceSource = 'mock';
        }
      }

      if (priceData) {
        prices[productId] = {
          ...priceData,
          source: priceSource,
          timestamp: new Date().toISOString(),
        };
      }
    }

    console.log(`Returning prices for ${Object.keys(prices).length} products`);

    return new Response(
      JSON.stringify({ prices, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Price fetch error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});