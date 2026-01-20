import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRICECHARTING_API_KEY = Deno.env.get('PRICECHARTING_API_KEY');
const EBAY_RAPIDAPI_KEY = Deno.env.get('EBAY_RAPIDAPI_KEY');

interface TestResult {
  card: string;
  cardCode: string;
  rarity: string;
  pricecharting: {
    query: string;
    matchedProduct: string | null;
    price: number | null;
    allResults: Array<{ name: string; price: number }>;
  } | null;
  ebay: {
    query: string;
    medianPrice: number | null;
    sampleCount: number;
  } | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cards } = await req.json();
    
    if (!cards || !Array.isArray(cards)) {
      return new Response(
        JSON.stringify({ error: 'cards array required', example: { cards: [{ name: 'Sanji', setCode: 'OP01', cardNumber: '013', rarity: 'C' }] } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const results: TestResult[] = [];

    for (const card of cards) {
      const { name, setCode, cardNumber, rarity } = card;
      const normalizedNumber = (cardNumber || '').replace(/[^0-9]/g, '').padStart(3, '0');
      const cardCode = `${(setCode || '').toUpperCase()}-${normalizedNumber}`;
      
      const result: TestResult = {
        card: name,
        cardCode,
        rarity: rarity || 'unknown',
        pricecharting: null,
        ebay: null,
      };

      // Test PriceCharting
      if (PRICECHARTING_API_KEY) {
        const pcQuery = `${cardCode} One Piece`;
        console.log(`[test-price] PriceCharting query: "${pcQuery}"`);
        
        try {
          const pcUrl = `https://www.pricecharting.com/api/products?t=${PRICECHARTING_API_KEY}&q=${encodeURIComponent(pcQuery)}`;
          const pcResp = await fetch(pcUrl);
          const pcData = await pcResp.json();
          
          const products = pcData.products || [];
          const allResults = products.slice(0, 5).map((p: any) => ({
            name: p['product-name'] || 'unknown',
            price: parseFloat(p['loose-price'] || p['cib-price'] || p['new-price'] || '0') / 100,
          }));
          
          // Find exact match
          let matchedProduct = null;
          let matchedPrice = null;
          
          const isRegularCard = rarity && ['C', 'UC', 'Common', 'Uncommon'].includes(rarity);
          const altArtKeywords = ['ALTERNATE ART', 'ALT ART', '[MANGA]', 'MANGA ART', 'PARALLEL', 'GIFT COLLECTION', '[PROMO]'];
          
          for (const product of products) {
            const productName = (product['product-name'] || '').toUpperCase();
            if (!productName.includes(cardCode.toUpperCase())) continue;
            
            // Skip alt art for regular cards
            if (isRegularCard && altArtKeywords.some(kw => productName.includes(kw))) {
              console.log(`[test-price] Skipping alt art for regular card: ${productName}`);
              continue;
            }
            
            matchedProduct = product['product-name'];
            matchedPrice = parseFloat(product['loose-price'] || product['cib-price'] || product['new-price'] || '0') / 100;
            break;
          }
          
          result.pricecharting = {
            query: pcQuery,
            matchedProduct,
            price: matchedPrice,
            allResults,
          };
        } catch (err) {
          console.error('[test-price] PriceCharting error:', err);
        }
      } else {
        console.log('[test-price] No PRICECHARTING_API_KEY configured');
      }

      // Test eBay
      if (EBAY_RAPIDAPI_KEY) {
        const ebayQuery = `${name} ${cardCode} one piece card game`;
        console.log(`[test-price] eBay query: "${ebayQuery}"`);
        
        try {
          const ebayUrl = `https://ebay32.p.rapidapi.com/search/${encodeURIComponent(ebayQuery)}`;
          const ebayResp = await fetch(ebayUrl, {
            headers: {
              'X-RapidAPI-Key': EBAY_RAPIDAPI_KEY,
              'X-RapidAPI-Host': 'ebay32.p.rapidapi.com',
            },
          });
          const ebayData = await ebayResp.json();
          
          const items = ebayData.search || [];
          const prices = items
            .filter((item: any) => item.price && item.price > 0)
            .map((item: any) => parseFloat(item.price))
            .filter((p: number) => p > 0.5 && p < 1000)
            .sort((a: number, b: number) => a - b);
          
          const medianPrice = prices.length >= 3 
            ? prices[Math.floor(prices.length / 2)] 
            : null;
          
          result.ebay = {
            query: ebayQuery,
            medianPrice,
            sampleCount: prices.length,
          };
        } catch (err) {
          console.error('[test-price] eBay error:', err);
        }
      } else {
        console.log('[test-price] No EBAY_RAPIDAPI_KEY configured');
      }

      results.push(result);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        apiKeysConfigured: {
          pricecharting: !!PRICECHARTING_API_KEY,
          ebay: !!EBAY_RAPIDAPI_KEY,
        },
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[test-price] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
