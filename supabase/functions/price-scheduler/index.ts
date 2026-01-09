import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * 24/7 Price Scheduler - MAX THROUGHPUT MODE
 * 
 * This function orchestrates continuous price syncing across all data sources.
 * Fetches BOTH graded (PSA 10) and ungraded prices for Pokemon & One Piece.
 */

interface SchedulerConfig {
  mode: 'high_priority' | 'medium_priority' | 'low_priority' | 'full_sync' | 'auto' | 'max_throughput'
  batchSize?: number
  delayMs?: number
}

interface GradedPrices {
  raw: number | null
  psa7: number | null
  psa8: number | null
  psa9: number | null
  psa10: number | null
  bgs9_5: number | null
  bgs10: number | null
  cgc10: number | null
}

// TCG categories for Cardmarket
const TCG_CATEGORIES = ['pokemon', 'yugioh', 'mtg', 'one-piece', 'lorcana', 'digimon', 'lol-riftbound', 'dragon-ball', 'star-wars']
const CARDMARKET_CATEGORIES = ['pokemon', 'lorcana', 'mtg', 'yugioh']
// Categories that should fetch PSA 10 graded prices
const GRADED_PRICE_CATEGORIES = ['pokemon', 'one-piece', 'yugioh', 'mtg', 'sports', 'nba', 'nfl', 'mlb']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const priceChartingKey = Deno.env.get('PRICECHARTING_API_KEY')
    const cardmarketKey = Deno.env.get('CARDMARKET_RAPIDAPI_KEY')
    const ebayKey = Deno.env.get('EBAY_RAPIDAPI_KEY')
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // MAX THROUGHPUT: 200 items per batch, 50ms delay (aggressive but API-safe)
    const { mode = 'max_throughput', batchSize = 200, delayMs = 50 }: SchedulerConfig = await req.json().catch(() => ({}))
    
    // MAX THROUGHPUT MODE: Always sync as many items as possible
    let effectiveMode = mode
    if (mode === 'auto' || mode === 'max_throughput') {
      // Always run at max throughput - sync ALL items continuously
      effectiveMode = 'max_throughput'
    }
    
    console.log(`[price-scheduler] 🚀 MAX THROUGHPUT Mode: ${effectiveMode}, Batch: ${batchSize}, Delay: ${delayMs}ms`)
    
    const results = {
      mode: effectiveMode,
      updated: 0,
      failed: 0,
      skipped: 0,
      sources: {
        pricecharting: 0,
        cardmarket: 0,
        ebay: 0,
      },
      errors: [] as string[],
    }
    
    // Get items to sync - MAX THROUGHPUT: get ALL items, prioritize stale ones
    let items: any[] = []
    
    if (effectiveMode === 'max_throughput') {
      // Get oldest updated items first - continuous rotation through entire catalog
      const { data } = await supabase
        .from('market_items')
        .select('id, name, category, external_id, cardmarket_id, current_price, data_source, updated_at')
        .gt('current_price', 0)
        .order('updated_at', { ascending: true, nullsFirst: true })
        .limit(batchSize)
      items = data || []
      
    } else if (effectiveMode === 'high_priority') {
      const { data } = await supabase
        .from('market_items')
        .select('id, name, category, external_id, cardmarket_id, current_price, data_source')
        .or('is_trending.eq.true,views_24h.gt.10')
        .order('views_24h', { ascending: false, nullsFirst: false })
        .limit(batchSize)
      items = data || []
      
    } else if (effectiveMode === 'medium_priority') {
      const { data: listingItems } = await supabase
        .from('listings')
        .select('market_item_id')
        .eq('status', 'active')
        .not('market_item_id', 'is', null)
        .limit(batchSize)
      
      const marketItemIds = listingItems?.map(l => l.market_item_id).filter(Boolean) || []
      
      if (marketItemIds.length > 0) {
        const { data } = await supabase
          .from('market_items')
          .select('id, name, category, external_id, cardmarket_id, current_price, data_source')
          .in('id', marketItemIds)
        items = data || []
      }
      
    } else if (effectiveMode === 'low_priority') {
      const sixHoursAgo = new Date()
      sixHoursAgo.setHours(sixHoursAgo.getHours() - 6)
      
      const { data } = await supabase
        .from('market_items')
        .select('id, name, category, external_id, cardmarket_id, current_price, data_source')
        .lt('updated_at', sixHoursAgo.toISOString())
        .order('updated_at', { ascending: true })
        .limit(batchSize)
      items = data || []
      
    } else if (effectiveMode === 'full_sync') {
      const { data } = await supabase
        .from('market_items')
        .select('id, name, category, external_id, cardmarket_id, current_price, data_source')
        .order('category')
        .limit(batchSize * 2)
      items = data || []
    }
    
    console.log(`[price-scheduler] Found ${items.length} items to sync`)
    
    // Process items
    for (const item of items) {
      try {
        let newPrice: number | null = null
        let source = ''
        
        const category = item.category?.toLowerCase() || ''
        const isTcg = TCG_CATEGORIES.includes(category)
        const isCardmarketTcg = CARDMARKET_CATEGORIES.includes(category)
        
        // Strategy 1: Cardmarket for supported TCGs
        if (isCardmarketTcg && cardmarketKey && item.cardmarket_id) {
          try {
            const gameMap: Record<string, string> = {
              'pokemon': 'pokemon',
              'lorcana': 'lorcana',
              'mtg': 'magic-the-gathering',
              'yugioh': 'yugioh',
            }
            const game = gameMap[category] || 'pokemon'
            
            const response = await fetch(
              `https://cardmarket-api-tcg.p.rapidapi.com/${game}/cards/${item.cardmarket_id}`,
              {
                headers: {
                  'X-RapidAPI-Key': cardmarketKey,
                  'X-RapidAPI-Host': 'cardmarket-api-tcg.p.rapidapi.com',
                }
              }
            )
            
            if (response.ok) {
              const data = await response.json()
              newPrice = data.averageSellPrice || data.trendPrice || data.lowestPrice
              if (newPrice && newPrice > 0) {
                source = 'cardmarket'
                results.sources.cardmarket++
              }
            }
          } catch (e) {
            console.error(`[price-scheduler] Cardmarket error for ${item.id}:`, e)
          }
        }
        
        // Strategy 2: PriceCharting for non-TCG or fallback (WITH GRADED PRICES)
        let gradedPrices: GradedPrices | null = null
        const shouldFetchGraded = GRADED_PRICE_CATEGORIES.includes(category)
        
        if (!newPrice && priceChartingKey) {
          try {
            const pcId = item.external_id?.replace('pc:', '').replace('pricecharting_', '') || ''
            let pcUrl = ''
            
            if (/^\d+$/.test(pcId)) {
              pcUrl = `https://www.pricecharting.com/api/product?t=${priceChartingKey}&id=${pcId}`
            } else {
              pcUrl = `https://www.pricecharting.com/api/products?t=${priceChartingKey}&q=${encodeURIComponent(item.name)}&limit=1`
            }
            
            const response = await fetch(pcUrl)
            
            if (response.ok) {
              const data = await response.json()
              const product = /^\d+$/.test(pcId) ? data : data.products?.[0]
              
              if (product) {
                // Get ungraded (loose) price
                newPrice = (product['loose-price'] || product['graded-price'] || product['cib-price']) / 100
                
                // Extract ALL graded prices for Pokemon, One Piece, etc.
                if (shouldFetchGraded) {
                  gradedPrices = {
                    raw: product['loose-price'] ? product['loose-price'] / 100 : null,
                    psa7: product['psa-7'] ? product['psa-7'] / 100 : null,
                    psa8: product['psa-8'] ? product['psa-8'] / 100 : null,
                    psa9: product['psa-9'] ? product['psa-9'] / 100 : null,
                    psa10: product['psa-10'] ? product['psa-10'] / 100 : null,
                    bgs9_5: product['bgs-9-5'] ? product['bgs-9-5'] / 100 : null,
                    bgs10: product['bgs-10'] ? product['bgs-10'] / 100 : null,
                    cgc10: product['cgc-10'] ? product['cgc-10'] / 100 : null,
                  }
                  
                  if (gradedPrices.psa10) {
                    console.log(`[price-scheduler] 🏆 PSA 10 price for ${item.name}: $${gradedPrices.psa10}`)
                  }
                }
                
                if (newPrice && newPrice > 0) {
                  source = 'pricecharting'
                  results.sources.pricecharting++
                }
              }
            }
          } catch (e) {
            console.error(`[price-scheduler] PriceCharting error for ${item.id}:`, e)
          }
        }
        
        // Strategy 3: eBay for special categories or additional validation
        if (!newPrice && ebayKey && (category === 'lol-riftbound' || category === 'figures')) {
          try {
            const response = await fetch(
              `https://ebay-search-result.p.rapidapi.com/search/${encodeURIComponent(item.name)}?page=1`,
              {
                headers: {
                  'X-RapidAPI-Key': ebayKey,
                  'X-RapidAPI-Host': 'ebay-search-result.p.rapidapi.com',
                }
              }
            )
            
            if (response.ok) {
              const data = await response.json()
              // Get median of recent sold prices
              const prices = data.results
                ?.filter((r: any) => r.price && r.price > 0)
                ?.map((r: any) => parseFloat(r.price))
                ?.sort((a: number, b: number) => a - b) || []
              
              if (prices.length >= 3) {
                // Use median price
                newPrice = prices[Math.floor(prices.length / 2)]
                source = 'ebay'
                results.sources.ebay++
              }
            }
          } catch (e) {
            console.error(`[price-scheduler] eBay error for ${item.id}:`, e)
          }
        }
        
        // Update if valid price found
        if (newPrice && newPrice > 0) {
          // Validate price (anti-manipulation check)
          const isValidPrice = !item.current_price || 
            (newPrice <= item.current_price * 5 && newPrice >= item.current_price * 0.2)
          
          if (isValidPrice) {
            // Calculate change
            const change24h = item.current_price && item.current_price > 0
              ? ((newPrice - item.current_price) / item.current_price) * 100
              : null
            
            const updateData: any = {
              price_24h_ago: item.current_price,
              current_price: newPrice,
              verified_price: newPrice,
              verified_source: source,
              verified_at: new Date().toISOString(),
              price_status: 'verified',
              change_24h: change24h,
              data_source: source,
              updated_at: new Date().toISOString(),
            }
            
            // Add graded prices to market_items if available
            if (gradedPrices) {
              updateData.psa10_price = gradedPrices.psa10
              updateData.psa9_price = gradedPrices.psa9
              updateData.raw_price = gradedPrices.raw
            }
            
            const { error: updateError } = await supabase
              .from('market_items')
              .update(updateData)
              .eq('id', item.id)
            
            if (updateError) {
              results.errors.push(`${item.id}: ${updateError.message}`)
              results.failed++
            } else {
              // Also log to price_history
              try {
                await supabase.from('price_history').insert({
                  market_item_id: item.id,
                  price: newPrice,
                  source,
                })
              } catch {} // Ignore history errors
              
              // Update market_item_grades table with all graded prices
              if (gradedPrices && shouldFetchGraded) {
                const grades = [
                  { grade: 'raw', price: gradedPrices.raw },
                  { grade: 'psa7', price: gradedPrices.psa7 },
                  { grade: 'psa8', price: gradedPrices.psa8 },
                  { grade: 'psa9', price: gradedPrices.psa9 },
                  { grade: 'psa10', price: gradedPrices.psa10 },
                  { grade: 'bgs9_5', price: gradedPrices.bgs9_5 },
                  { grade: 'bgs10', price: gradedPrices.bgs10 },
                  { grade: 'cgc10', price: gradedPrices.cgc10 },
                ].filter(g => g.price && g.price > 0)
                
                for (const gradeData of grades) {
                  try {
                    await supabase
                      .from('market_item_grades')
                      .upsert({
                        market_item_id: item.id,
                        grade: gradeData.grade,
                        current_price: gradeData.price,
                        updated_at: new Date().toISOString(),
                      }, { onConflict: 'market_item_id,grade' })
                  } catch {} // Ignore grade insert errors
                }
              }
              
              results.updated++
            }
          } else {
            console.log(`[price-scheduler] Suspicious price for ${item.name}: ${item.current_price} -> ${newPrice}`)
            results.skipped++
          }
        } else {
          results.skipped++
        }
        
        // Rate limiting delay
        await new Promise(r => setTimeout(r, delayMs))
        
      } catch (itemError) {
        console.error(`[price-scheduler] Error processing ${item.id}:`, itemError)
        results.failed++
      }
    }
    
    const duration = Date.now() - startTime
    console.log(`[price-scheduler] Completed in ${duration}ms - Updated: ${results.updated}, Failed: ${results.failed}, Skipped: ${results.skipped}`)
    
    // Log sync run to database
    try {
      await supabase.from('admin_audit_log').insert({
        action: 'price_sync',
        admin_id: '00000000-0000-0000-0000-000000000001', // System
        details: {
          mode: effectiveMode,
          duration_ms: duration,
          updated: results.updated,
          failed: results.failed,
          sources: results.sources,
        }
      })
    } catch {} // Ignore audit log errors
    
    return new Response(JSON.stringify({
      success: true,
      duration_ms: duration,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('[price-scheduler] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
