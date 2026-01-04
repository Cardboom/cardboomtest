import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * 24/7 Price Scheduler
 * 
 * This function orchestrates continuous price syncing across all data sources.
 * Call this via cron job every 5-15 minutes for maximum price freshness.
 * 
 * Sync Strategy:
 * - High priority (every 5 min): Top viewed items, trending items
 * - Medium priority (every 15 min): Items with active listings/bids
 * - Low priority (every hour): All other catalog items
 * - Full sync (daily): Complete catalog refresh
 */

interface SchedulerConfig {
  mode: 'high_priority' | 'medium_priority' | 'low_priority' | 'full_sync' | 'auto'
  batchSize?: number
  delayMs?: number
}

// TCG categories for Cardmarket
const TCG_CATEGORIES = ['pokemon', 'yugioh', 'mtg', 'one-piece', 'lorcana', 'digimon', 'lol-riftbound', 'dragon-ball', 'star-wars']
const CARDMARKET_CATEGORIES = ['pokemon', 'lorcana', 'mtg', 'yugioh']

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
    
    const { mode = 'auto', batchSize = 50, delayMs = 150 }: SchedulerConfig = await req.json().catch(() => ({}))
    
    // Auto-detect mode based on current time
    let effectiveMode = mode
    if (mode === 'auto') {
      const now = new Date()
      const minute = now.getMinutes()
      const hour = now.getHours()
      
      if (hour === 3 && minute < 15) {
        effectiveMode = 'full_sync' // Full sync at 3 AM
      } else if (minute % 5 === 0) {
        effectiveMode = 'high_priority'
      } else if (minute % 15 === 0) {
        effectiveMode = 'medium_priority'
      } else {
        effectiveMode = 'low_priority'
      }
    }
    
    console.log(`[price-scheduler] Mode: ${effectiveMode}, Batch: ${batchSize}`)
    
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
    
    // Get items to sync based on mode
    let items: any[] = []
    
    if (effectiveMode === 'high_priority') {
      // Top viewed, trending, recently active
      const { data } = await supabase
        .from('market_items')
        .select('id, name, category, external_id, cardmarket_id, current_price, data_source')
        .or('is_trending.eq.true,views_24h.gt.10')
        .order('views_24h', { ascending: false, nullsFirst: false })
        .limit(batchSize)
      items = data || []
      
    } else if (effectiveMode === 'medium_priority') {
      // Items with active listings or bids
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
      // Items not updated in last 6 hours
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
      // All items, paginated
      const { data } = await supabase
        .from('market_items')
        .select('id, name, category, external_id, cardmarket_id, current_price, data_source')
        .order('category')
        .limit(batchSize * 2) // Larger batch for full sync
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
        
        // Strategy 2: PriceCharting for non-TCG or fallback
        if (!newPrice && priceChartingKey) {
          try {
            const pcId = item.external_id?.replace('pc:', '') || ''
            let pcUrl = ''
            
            if (/^\d+$/.test(pcId)) {
              pcUrl = `https://www.pricecharting.com/api/product?t=${priceChartingKey}&id=${pcId}`
            } else {
              pcUrl = `https://www.pricecharting.com/api/products?t=${priceChartingKey}&q=${encodeURIComponent(item.name)}&limit=1`
            }
            
            const response = await fetch(pcUrl)
            
            if (response.ok) {
              const data = await response.json()
              
              if (/^\d+$/.test(pcId)) {
                // Single product response
                newPrice = (data['loose-price'] || data['graded-price'] || data['cib-price']) / 100
              } else if (data.products?.[0]) {
                // Search response
                newPrice = (data.products[0]['loose-price'] || data.products[0]['graded-price']) / 100
              }
              
              if (newPrice && newPrice > 0) {
                source = 'pricecharting'
                results.sources.pricecharting++
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
            
            const { error: updateError } = await supabase
              .from('market_items')
              .update({
                price_24h_ago: item.current_price,
                current_price: newPrice,
                change_24h: change24h,
                data_source: source,
                updated_at: new Date().toISOString(),
              })
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
