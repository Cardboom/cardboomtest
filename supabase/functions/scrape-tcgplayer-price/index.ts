import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CardQuery {
  name: string;
  setCode: string;
  cardNumber: string;
  game?: string; // 'onepiece', 'pokemon', 'mtg', etc.
  variant?: string; // 'parallel', 'alt-art', etc.
  catalogCardId?: string; // If provided, store the price in card_price_snapshots
}

interface PriceResult {
  card: string;
  cardCode: string;
  tcgplayerUrl: string | null;
  marketPrice: number | null;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  source: string;
  stored: boolean; // Whether price was stored in DB
  error?: string;
}

// Build TCGPlayer search URL
function buildTcgPlayerSearchUrl(card: CardQuery): string {
  const gameMap: Record<string, string> = {
    'onepiece': 'one-piece-card-game',
    'pokemon': 'pokemon',
    'mtg': 'magic',
    'yugioh': 'yugioh',
    'lorcana': 'lorcana',
  };
  
  const game = gameMap[card.game || 'onepiece'] || 'one-piece-card-game';
  const cardCode = `${card.setCode.toUpperCase()}-${card.cardNumber.padStart(3, '0')}`;
  
  // Build search query
  const query = `${card.name} ${cardCode}`;
  return `https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent(query)}&view=grid&productLineName=${game}`;
}

// Build direct product URL pattern for One Piece
function buildOnePieceProductUrl(card: CardQuery): string {
  // TCGPlayer URL pattern: /product/{id}/one-piece-card-game-{set}-{name}-{number}-{variant}
  const setMap: Record<string, string> = {
    'OP01': 'romance-dawn',
    'OP02': 'paramount-war',
    'OP03': 'pillars-of-strength',
    'OP04': 'kingdoms-of-intrigue',
    'OP05': 'awakening-of-the-new-era',
    'OP06': 'wings-of-the-captain',
    'OP07': '500-years-in-the-future',
    'OP08': 'two-legends',
    'OP09': 'the-four-emperors',
    'OP10': 'royal-blood',
    'ST01': 'straw-hat-crew-starter-deck',
    'ST02': 'worst-generation-starter-deck',
  };
  
  const setSlug = setMap[card.setCode.toUpperCase()] || card.setCode.toLowerCase();
  const nameSlug = card.name.toLowerCase()
    .replace(/[.'"]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  const number = card.cardNumber.padStart(3, '0');
  
  // Search URL is more reliable than guessing product ID
  return buildTcgPlayerSearchUrl(card);
}

// Extract price from scraped markdown/html - improved patterns for TCGPlayer
function extractPricesFromMarkdown(markdown: string): { market: number | null; low: number | null; mid: number | null; high: number | null } {
  const result = { market: null as number | null, low: null as number | null, mid: null as number | null, high: null as number | null };
  
  // Debug: log first 500 chars to see what we're working with
  console.log('[extractPrices] Markdown sample:', markdown.substring(0, 500));
  
  // TCGPlayer specific patterns (their HTML structure)
  // Pattern: "Market Price: $X.XX" or "Market\n$X.XX"
  const marketPatterns = [
    /market\s*(?:price)?[:\s]*\$?([\d,]+\.?\d*)/i,
    /\bmarket\b[^\d]*\$?([\d,]+\.?\d*)/i,
    /price[:\s]+\$?([\d,]+\.?\d*)/i,
  ];
  
  for (const pattern of marketPatterns) {
    const match = markdown.match(pattern);
    if (match && match[1]) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (price >= 0.01 && price <= 100000) {
        result.market = price;
        break;
      }
    }
  }
  
  // Low price patterns
  const lowPatterns = [
    /(?:low(?:est)?|from|starting)[:\s]*\$?([\d,]+\.?\d*)/i,
    /\blow\b[^\d]*\$?([\d,]+\.?\d*)/i,
    /as\s+low\s+as[:\s]*\$?([\d,]+\.?\d*)/i,
  ];
  
  for (const pattern of lowPatterns) {
    const match = markdown.match(pattern);
    if (match && match[1]) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (price >= 0.01 && price <= 100000) {
        result.low = price;
        break;
      }
    }
  }
  
  // High price patterns  
  const highPatterns = [
    /(?:high(?:est)?)[:\s]*\$?([\d,]+\.?\d*)/i,
    /\bhigh\b[^\d]*\$?([\d,]+\.?\d*)/i,
  ];
  
  for (const pattern of highPatterns) {
    const match = markdown.match(pattern);
    if (match && match[1]) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (price >= 0.01 && price <= 100000) {
        result.high = price;
        break;
      }
    }
  }
  
  // Fallback: Look for ALL price patterns and use statistical approach
  if (!result.market && !result.low) {
    // Match all prices in the content
    const allPriceMatches = markdown.match(/\$\s*([\d,]+\.?\d*)/g);
    if (allPriceMatches && allPriceMatches.length > 0) {
      const prices = allPriceMatches
        .map(p => parseFloat(p.replace(/[$,\s]/g, '')))
        .filter(p => p >= 0.10 && p <= 10000 && !isNaN(p))
        .sort((a, b) => a - b);
      
      // Remove duplicates
      const uniquePrices = [...new Set(prices)];
      
      if (uniquePrices.length > 0) {
        result.low = uniquePrices[0];
        result.high = uniquePrices[uniquePrices.length - 1];
        // Use median as market price
        const midIdx = Math.floor(uniquePrices.length / 2);
        result.market = uniquePrices[midIdx];
        console.log(`[extractPrices] Fallback prices found: ${uniquePrices.join(', ')}`);
      }
    }
  }
  
  console.log(`[extractPrices] Extracted: market=$${result.market}, low=$${result.low}, high=$${result.high}`);
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { cards, storeResults = true } = await req.json();
    
    if (!cards || !Array.isArray(cards)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'cards array required',
          example: { cards: [{ name: 'Monkey.D.Luffy', setCode: 'OP01', cardNumber: '003', game: 'onepiece', catalogCardId: 'uuid-optional' }] }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: PriceResult[] = [];
    const today = new Date().toISOString().split('T')[0];

    for (const card of cards.slice(0, 5)) { // Limit to 5 cards per request
      const cardCode = `${card.setCode?.toUpperCase() || ''}-${(card.cardNumber || '').padStart(3, '0')}`;
      
      const result: PriceResult = {
        card: card.name,
        cardCode,
        tcgplayerUrl: null,
        marketPrice: null,
        lowPrice: null,
        midPrice: null,
        highPrice: null,
        source: 'tcgplayer_scrape',
        stored: false,
      };

      try {
        // Use Firecrawl search to find the card on TCGPlayer
        const searchQuery = `site:tcgplayer.com ${card.name} ${cardCode} one piece card game`;
        console.log(`[scrape-tcgplayer] Searching: ${searchQuery}`);
        
        const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 3,
            scrapeOptions: { formats: ['markdown'] },
          }),
        });

        const searchData = await searchResponse.json();
        
        if (searchData.success && searchData.data && searchData.data.length > 0) {
          // Find the best matching result
          const productResult = searchData.data.find((r: any) => 
            r.url?.includes('tcgplayer.com/product') && 
            r.url?.includes('one-piece')
          ) || searchData.data[0];
          
          result.tcgplayerUrl = productResult.url;
          
          // Search results often don't include prices - need to scrape the actual page
          let markdown = productResult.markdown || '';
          
          // If no prices in search result, scrape the product page directly
          if (productResult.url && !markdown.includes('$')) {
            console.log(`[scrape-tcgplayer] Scraping product page: ${productResult.url}`);
            
            try {
              const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  url: productResult.url,
                  formats: ['markdown'],
                  onlyMainContent: true,
                  waitFor: 2000, // Wait for dynamic content
                }),
              });
              
              const scrapeData = await scrapeResponse.json();
              if (scrapeData.success && scrapeData.data?.markdown) {
                markdown = scrapeData.data.markdown;
              } else if (scrapeData.markdown) {
                markdown = scrapeData.markdown;
              }
            } catch (scrapeErr) {
              console.error(`[scrape-tcgplayer] Direct scrape failed:`, scrapeErr);
            }
          }
          
          // Extract prices from the scraped content
          if (markdown) {
            const prices = extractPricesFromMarkdown(markdown);
            result.marketPrice = prices.market;
            result.lowPrice = prices.low;
            result.midPrice = prices.mid;
            result.highPrice = prices.high;
            
            console.log(`[scrape-tcgplayer] Found prices for ${cardCode}: market=$${prices.market}, low=$${prices.low}`);
            
            // Store price in card_price_snapshots if catalogCardId provided and storeResults is true
            if (storeResults && card.catalogCardId && prices.market && prices.market > 0) {
              try {
                const { error: upsertError } = await supabase
                  .from('card_price_snapshots')
                  .upsert({
                    catalog_card_id: card.catalogCardId,
                    snapshot_date: today,
                    median_usd: prices.market,
                    low_usd: prices.low || prices.market * 0.8,
                    high_usd: prices.high || prices.market * 1.5,
                    liquidity_count: 1,
                    confidence: 0.7,
                    sources: { tcgplayer: true, live_fetch: true },
                  }, { onConflict: 'catalog_card_id,snapshot_date' });
                
                if (!upsertError) {
                  result.stored = true;
                  console.log(`[scrape-tcgplayer] ✅ Stored price for ${cardCode} (${card.catalogCardId})`);
                } else {
                  console.error(`[scrape-tcgplayer] Failed to store price:`, upsertError);
                }
              } catch (storeErr) {
                console.error(`[scrape-tcgplayer] Store error:`, storeErr);
              }
            }
          }
        } else {
          console.log(`[scrape-tcgplayer] No results for ${cardCode}`);
          result.error = 'No TCGPlayer listing found';
        }
      } catch (err) {
        console.error(`[scrape-tcgplayer] Error for ${cardCode}:`, err);
        result.error = err instanceof Error ? err.message : 'Scrape failed';
      }

      results.push(result);
      
      // Small delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[scrape-tcgplayer] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
