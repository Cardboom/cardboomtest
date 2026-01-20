import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// Extract price from scraped markdown/html
function extractPricesFromMarkdown(markdown: string): { market: number | null; low: number | null; mid: number | null; high: number | null } {
  const result = { market: null as number | null, low: null as number | null, mid: null as number | null, high: null as number | null };
  
  // Common patterns for TCGPlayer prices
  // Market Price: $X.XX
  const marketMatch = markdown.match(/market\s*price[:\s]*\$?([\d,]+\.?\d*)/i);
  if (marketMatch) {
    result.market = parseFloat(marketMatch[1].replace(',', ''));
  }
  
  // Low: $X.XX or Lowest: $X.XX
  const lowMatch = markdown.match(/(?:low(?:est)?|from)[:\s]*\$?([\d,]+\.?\d*)/i);
  if (lowMatch) {
    result.low = parseFloat(lowMatch[1].replace(',', ''));
  }
  
  // Mid/Median: $X.XX
  const midMatch = markdown.match(/(?:mid|median)[:\s]*\$?([\d,]+\.?\d*)/i);
  if (midMatch) {
    result.mid = parseFloat(midMatch[1].replace(',', ''));
  }
  
  // High: $X.XX
  const highMatch = markdown.match(/(?:high(?:est)?)[:\s]*\$?([\d,]+\.?\d*)/i);
  if (highMatch) {
    result.high = parseFloat(highMatch[1].replace(',', ''));
  }
  
  // Also try to find standalone prices if specific labels not found
  if (!result.market) {
    // Look for price patterns like "$12.99" in product context
    const priceMatches = markdown.match(/\$(\d+\.?\d*)/g);
    if (priceMatches && priceMatches.length > 0) {
      // Filter reasonable prices (between $0.10 and $10000)
      const prices = priceMatches
        .map(p => parseFloat(p.replace('$', '')))
        .filter(p => p >= 0.10 && p <= 10000)
        .sort((a, b) => a - b);
      
      if (prices.length > 0) {
        result.low = prices[0];
        result.high = prices[prices.length - 1];
        result.market = prices[Math.floor(prices.length / 2)]; // median
      }
    }
  }
  
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { cards } = await req.json();
    
    if (!cards || !Array.isArray(cards)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'cards array required',
          example: { cards: [{ name: 'Monkey.D.Luffy', setCode: 'OP01', cardNumber: '003', game: 'onepiece' }] }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: PriceResult[] = [];

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
          
          // Extract prices from the scraped content
          if (productResult.markdown) {
            const prices = extractPricesFromMarkdown(productResult.markdown);
            result.marketPrice = prices.market;
            result.lowPrice = prices.low;
            result.midPrice = prices.mid;
            result.highPrice = prices.high;
            
            console.log(`[scrape-tcgplayer] Found prices for ${cardCode}: market=$${prices.market}, low=$${prices.low}`);
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
