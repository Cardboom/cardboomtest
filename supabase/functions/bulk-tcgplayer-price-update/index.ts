import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Bulk TCGPlayer Price Updater
 * 
 * Scrapes TCGPlayer prices for catalog cards that are missing pricing data.
 * Uses Firecrawl to search and extract market prices.
 */

interface CardToPrice {
  id: string
  name: string
  set_code: string
  card_number: string
  game: string
  variant?: string
}

// Extract price from scraped markdown
function extractPricesFromMarkdown(markdown: string): { market: number | null; low: number | null } {
  let market: number | null = null
  let low: number | null = null
  
  // Market Price: $X.XX
  const marketMatch = markdown.match(/market\s*price[:\s]*\$?([\d,]+\.?\d*)/i)
  if (marketMatch) {
    market = parseFloat(marketMatch[1].replace(',', ''))
  }
  
  // Low: $X.XX
  const lowMatch = markdown.match(/(?:low(?:est)?|from)[:\s]*\$?([\d,]+\.?\d*)/i)
  if (lowMatch) {
    low = parseFloat(lowMatch[1].replace(',', ''))
  }
  
  // Fallback: find any prices
  if (!market) {
    const priceMatches = markdown.match(/\$(\d+\.?\d*)/g)
    if (priceMatches && priceMatches.length > 0) {
      const prices = priceMatches
        .map(p => parseFloat(p.replace('$', '')))
        .filter(p => p >= 0.05 && p <= 10000)
        .sort((a, b) => a - b)
      
      if (prices.length > 0) {
        low = prices[0]
        market = prices[Math.floor(prices.length / 2)]
      }
    }
  }
  
  return { market, low }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
    
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { limit = 20, game = 'onepiece', forceUpdate = false } = await req.json().catch(() => ({}))
    
    console.log(`[bulk-tcgplayer] Starting bulk update for ${game}, limit: ${limit}, forceUpdate: ${forceUpdate}`)
    
    // Get catalog cards that need pricing
    // Cards without a recent snapshot or with null pricing
    const today = new Date().toISOString().split('T')[0]
    
    let query = supabase
      .from('catalog_cards')
      .select(`
        id,
        name,
        set_code,
        card_number,
        game,
        variant
      `)
      .eq('game', game)
      .not('card_number', 'is', null)
      .not('set_code', 'is', null)
    
    const { data: catalogCards, error: cardsError } = await query.limit(limit * 2) // Get extra to filter
    
    if (cardsError) {
      console.error('[bulk-tcgplayer] Error fetching catalog cards:', cardsError)
      return new Response(
        JSON.stringify({ success: false, error: cardsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!catalogCards || catalogCards.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No catalog cards found', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Get existing snapshots to filter out cards with recent prices
    const cardIds = catalogCards.map(c => c.id)
    const { data: existingSnapshots } = await supabase
      .from('card_price_snapshots')
      .select('catalog_card_id, median_usd')
      .in('catalog_card_id', cardIds)
      .gte('snapshot_date', today)
    
    const cardsWithPrices = new Set(
      (existingSnapshots || [])
        .filter(s => s.median_usd && s.median_usd > 0)
        .map(s => s.catalog_card_id)
    )
    
    // Filter to cards needing prices (unless forceUpdate)
    const cardsToPrice: CardToPrice[] = forceUpdate 
      ? catalogCards.slice(0, limit)
      : catalogCards.filter(c => !cardsWithPrices.has(c.id)).slice(0, limit)
    
    console.log(`[bulk-tcgplayer] Found ${cardsToPrice.length} cards needing prices out of ${catalogCards.length} total`)
    
    const results = {
      updated: 0,
      failed: 0,
      skipped: 0,
      prices: [] as { card: string; code: string; price: number | null }[],
      errors: [] as string[],
    }
    
    // Process cards in batches of 5 (Firecrawl friendly)
    for (let i = 0; i < cardsToPrice.length; i += 5) {
      const batch = cardsToPrice.slice(i, i + 5)
      
      for (const card of batch) {
        const cardCode = `${card.set_code.toUpperCase()}-${card.card_number.padStart(3, '0')}`
        
        try {
          // Build game-specific search query
          const gameSearchMap: Record<string, string> = {
            'onepiece': 'one piece card game',
            'pokemon': 'pokemon tcg',
            'mtg': 'magic the gathering',
            'yugioh': 'yugioh',
            'lorcana': 'disney lorcana',
          }
          const gameSearch = gameSearchMap[card.game] || card.game
          
          // Skip premium variants for regular pricing
          const skipVariants = ['manga', 'alt art', 'secret rare', 'parallel']
          const isVariant = card.variant && skipVariants.some(v => 
            card.variant!.toLowerCase().includes(v)
          )
          
          const searchQuery = `site:tcgplayer.com ${card.name} ${cardCode} ${gameSearch}${isVariant ? '' : ' -parallel -alt'}`
          console.log(`[bulk-tcgplayer] Searching: ${searchQuery}`)
          
          const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: searchQuery,
              limit: 3,
              scrapeOptions: { formats: ['markdown'] },
            }),
          })
          
          const searchData = await searchResponse.json()
          
          if (searchData.success && searchData.data && searchData.data.length > 0) {
            // Find best matching result (prefer product pages)
            const productResult = searchData.data.find((r: any) => 
              r.url?.includes('tcgplayer.com/product')
            ) || searchData.data[0]
            
            if (productResult.markdown) {
              const prices = extractPricesFromMarkdown(productResult.markdown)
              
              if (prices.market && prices.market > 0) {
                // Upsert to card_price_snapshots
                const { error: upsertError } = await supabase
                  .from('card_price_snapshots')
                  .upsert({
                    catalog_card_id: card.id,
                    snapshot_date: today,
                    median_usd: prices.market,
                    low_usd: prices.low || prices.market * 0.8,
                    high_usd: prices.market * 1.5,
                    liquidity_count: 1,
                    confidence: 0.7,
                    sources: { tcgplayer: true },
                  }, { onConflict: 'catalog_card_id,snapshot_date' })
                
                if (upsertError) {
                  console.error(`[bulk-tcgplayer] Upsert error for ${cardCode}:`, upsertError)
                  results.failed++
                  results.errors.push(`${cardCode}: ${upsertError.message}`)
                } else {
                  console.log(`[bulk-tcgplayer] ✅ ${card.name} (${cardCode}): $${prices.market}`)
                  results.updated++
                  results.prices.push({ card: card.name, code: cardCode, price: prices.market })
                }
              } else {
                console.log(`[bulk-tcgplayer] No price found for ${cardCode}`)
                results.skipped++
              }
            } else {
              results.skipped++
            }
          } else {
            console.log(`[bulk-tcgplayer] No TCGPlayer results for ${cardCode}`)
            results.skipped++
          }
          
        } catch (err) {
          console.error(`[bulk-tcgplayer] Error for ${cardCode}:`, err)
          results.failed++
          results.errors.push(`${cardCode}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
        
        // Delay between requests
        await new Promise(r => setTimeout(r, 300))
      }
      
      // Longer delay between batches
      if (i + 5 < cardsToPrice.length) {
        await new Promise(r => setTimeout(r, 1000))
      }
    }
    
    const duration = Date.now() - startTime
    console.log(`[bulk-tcgplayer] Completed in ${duration}ms - Updated: ${results.updated}, Failed: ${results.failed}, Skipped: ${results.skipped}`)
    
    return new Response(JSON.stringify({
      success: true,
      duration_ms: duration,
      game,
      processed: cardsToPrice.length,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('[bulk-tcgplayer] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
