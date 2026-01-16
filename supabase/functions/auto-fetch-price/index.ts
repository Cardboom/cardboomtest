import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PRICECHARTING_API_KEY = Deno.env.get('PRICECHARTING_API_KEY');
const EBAY_RAPIDAPI_KEY = Deno.env.get('EBAY_RAPIDAPI_KEY');

interface CardData {
  name: string;
  variant?: string;
  setCode?: string;
  cardNumber?: string;
  rarity?: string;
  category?: string;
  setName?: string;
  language?: string;
}

// Build search query for PriceCharting
function buildPriceChartingQuery(card: CardData): string {
  const parts: string[] = [card.name];
  
  // Add variant/rarity info for specific searches
  if (card.variant && card.variant !== 'regular') {
    parts.push(card.variant);
  } else if (card.rarity) {
    // Include special rarities in search
    const specialTerms = ['Manga', 'Alt Art', 'Alternate Art', 'SEC', 'SP', 'SP CARD'];
    for (const term of specialTerms) {
      if (card.rarity.toLowerCase().includes(term.toLowerCase())) {
        parts.push(term);
        break;
      }
    }
  }
  
  // Add set code
  if (card.setCode) {
    parts.push(card.setCode);
  }
  
  // Add game context - for English cards, use English set name
  const gameKeywords: Record<string, string> = {
    'pokemon': 'Pokemon',
    'mtg': 'Magic',
    'yugioh': 'Yu-Gi-Oh',
    'onepiece': 'One Piece',
    'lorcana': 'Disney Lorcana',
  };
  
  if (card.category && gameKeywords[card.category]) {
    parts.push(gameKeywords[card.category]);
  }
  
  // Add language context - English version is usually listed as "Azure Sea's Seven" not "Japanese Azure Sea's Seven"
  // Only add "English" or use non-Japanese set name when language is English
  if (card.language && card.language.toLowerCase() === 'english' && card.setName) {
    // For One Piece English, set name already differentiates from Japanese
    // Don't add "English" keyword as PriceCharting uses set name
  }
  
  return parts.join(' ');
}

// Build eBay search query
function buildEbayQuery(card: CardData): string {
  const parts: string[] = [card.name];
  
  if (card.setCode && card.cardNumber) {
    parts.push(`${card.setCode}-${card.cardNumber}`);
  }
  
  // Add rarity for more specific matches
  if (card.rarity && ['Manga', 'Alt Art', 'SEC', 'SP'].some(r => card.rarity?.includes(r))) {
    parts.push(card.rarity);
  }
  
  // Add game context
  const gameKeywords: Record<string, string> = {
    'onepiece': 'one piece card game',
    'pokemon': 'pokemon tcg',
    'mtg': 'magic the gathering',
    'yugioh': 'yugioh',
    'lorcana': 'disney lorcana',
  };
  
  if (card.category && gameKeywords[card.category]) {
    parts.push(gameKeywords[card.category]);
  }
  
  return parts.join(' ');
}

// Fetch from PriceCharting
async function fetchPriceCharting(query: string): Promise<{ price: number; id: string; productName: string } | null> {
  if (!PRICECHARTING_API_KEY) return null;
  
  try {
    const url = `https://www.pricecharting.com/api/products?t=${PRICECHARTING_API_KEY}&q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const products = data.products || [];
    
    if (products.length > 0) {
      const product = products[0];
      // PriceCharting returns prices in cents
      const loosePrice = product['loose-price'] ? product['loose-price'] / 100 : null;
      
      if (loosePrice && loosePrice > 0) {
        return {
          price: loosePrice,
          id: String(product.id),
          productName: product['product-name'],
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('[auto-fetch-price] PriceCharting error:', error);
    return null;
  }
}

// Fetch from eBay SOLD listings
async function fetchEbaySold(query: string): Promise<{ price: number; source: string } | null> {
  if (!EBAY_RAPIDAPI_KEY) return null;
  
  try {
    const url = `https://ebay-search-result.p.rapidapi.com/search/${encodeURIComponent(query)}?page=1&type=sold`;
    
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': EBAY_RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'ebay-search-result.p.rapidapi.com',
      },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const results = data.results || [];
    
    // Extract valid prices
    const prices = results
      .map((r: any) => parseFloat(r.price || r.sold_price || 0))
      .filter((p: number) => !isNaN(p) && p > 0)
      .sort((a: number, b: number) => a - b);
    
    if (prices.length >= 2) {
      // Use median price from sold data
      const medianPrice = prices[Math.floor(prices.length / 2)];
      console.log(`[auto-fetch-price] eBay SOLD median: $${medianPrice} (${prices.length} sales)`);
      return { price: medianPrice, source: 'ebay_sold' };
    }
    
    return null;
  } catch (error) {
    console.error('[auto-fetch-price] eBay SOLD error:', error);
    return null;
  }
}

// Fetch from eBay ACTIVE listings (fallback)
async function fetchEbayActive(query: string): Promise<{ price: number; source: string } | null> {
  if (!EBAY_RAPIDAPI_KEY) return null;
  
  try {
    const url = `https://ebay-search-result.p.rapidapi.com/search/${encodeURIComponent(query)}?page=1`;
    
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': EBAY_RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'ebay-search-result.p.rapidapi.com',
      },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const results = data.results || [];
    
    // Extract valid prices from active listings
    const prices = results
      .map((r: any) => parseFloat(r.price || 0))
      .filter((p: number) => !isNaN(p) && p > 0)
      .sort((a: number, b: number) => a - b);
    
    if (prices.length >= 3) {
      // Use lower quartile for active listings (asking prices are often higher than sold)
      const lowerQuartile = prices[Math.floor(prices.length / 4)];
      console.log(`[auto-fetch-price] eBay ACTIVE lower quartile: $${lowerQuartile} (${prices.length} listings)`);
      return { price: lowerQuartile, source: 'ebay_active' };
    }
    
    return null;
  } catch (error) {
    console.error('[auto-fetch-price] eBay ACTIVE error:', error);
    return null;
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { marketItemId, cardData } = await req.json();
    
    if (!marketItemId || !cardData?.name) {
      return new Response(
        JSON.stringify({ error: 'marketItemId and cardData.name are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[auto-fetch-price] Fetching price for: ${cardData.name} (${cardData.setCode}-${cardData.cardNumber})`);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    let fetchedPrice: number | null = null;
    let dataSource: string | null = null;
    let externalId: string | null = null;
    let matchedName: string | null = null;
    
    // Strategy 1: Try PriceCharting first (most accurate for TCG)
    const pcQuery = buildPriceChartingQuery(cardData);
    console.log(`[auto-fetch-price] PriceCharting query: ${pcQuery}`);
    
    const pcResult = await fetchPriceCharting(pcQuery);
    if (pcResult) {
      fetchedPrice = pcResult.price;
      dataSource = 'pricecharting';
      externalId = `pricecharting_${pcResult.id}`;
      matchedName = pcResult.productName;
      console.log(`[auto-fetch-price] ✅ PriceCharting match: ${matchedName} = $${fetchedPrice}`);
    }
    
    // Strategy 2: Try eBay SOLD listings if PriceCharting didn't find anything
    if (!fetchedPrice) {
      const ebayQuery = buildEbayQuery(cardData);
      console.log(`[auto-fetch-price] eBay SOLD query: ${ebayQuery}`);
      
      const ebaySoldResult = await fetchEbaySold(ebayQuery);
      if (ebaySoldResult) {
        fetchedPrice = ebaySoldResult.price;
        dataSource = 'ebay_sold';
        console.log(`[auto-fetch-price] ✅ eBay SOLD price: $${fetchedPrice}`);
      }
    }
    
    // Strategy 3: Try eBay ACTIVE listings as last resort
    if (!fetchedPrice) {
      const ebayQuery = buildEbayQuery(cardData);
      console.log(`[auto-fetch-price] eBay ACTIVE query: ${ebayQuery}`);
      
      const ebayActiveResult = await fetchEbayActive(ebayQuery);
      if (ebayActiveResult) {
        fetchedPrice = ebayActiveResult.price;
        dataSource = 'ebay_active';
        console.log(`[auto-fetch-price] ✅ eBay ACTIVE price: $${fetchedPrice}`);
      }
    }
    
    // Update market item if we found a price
    if (fetchedPrice && fetchedPrice > 0) {
      const updateData: Record<string, unknown> = {
        current_price: fetchedPrice,
        verified_price: fetchedPrice,
        verified_source: dataSource,
        verified_at: new Date().toISOString(),
        data_source: dataSource,
        price_status: 'verified',
        updated_at: new Date().toISOString(),
      };
      
      if (externalId) {
        updateData.external_id = externalId;
      }
      
      const { error: updateError } = await supabase
        .from('market_items')
        .update(updateData)
        .eq('id', marketItemId);
      
      if (updateError) {
        console.error('[auto-fetch-price] Update error:', updateError);
      } else {
        console.log(`[auto-fetch-price] ✅ Updated market item ${marketItemId} with price $${fetchedPrice}`);
        
        // Also log to price history
        await supabase.from('price_history').insert({
          market_item_id: marketItemId,
          price: fetchedPrice,
          source: dataSource,
        });
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          price: fetchedPrice,
          source: dataSource,
          externalId,
          matchedName,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[auto-fetch-price] ❌ No price found for ${cardData.name}`);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'No external price found',
        queriesAttempted: {
          pricecharting: buildPriceChartingQuery(cardData),
          ebay: buildEbayQuery(cardData),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('[auto-fetch-price] Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
