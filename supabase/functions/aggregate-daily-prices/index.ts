import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AggregateRequest {
  category?: string
  limit?: number
  forceUpdate?: boolean
}

// Calculate median from array of numbers
function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Calculate MAD (Median Absolute Deviation) for outlier detection
function mad(arr: number[], med: number): number {
  if (arr.length === 0) return 0
  const deviations = arr.map(x => Math.abs(x - med))
  return median(deviations)
}

// Detect and filter outliers using MAD
function filterOutliers(prices: number[], multiplier = 4): number[] {
  if (prices.length < 5) return prices // Not enough data for outlier detection
  
  const med = median(prices)
  const madValue = mad(prices, med)
  
  if (madValue === 0) return prices // All values are the same
  
  const threshold = multiplier * madValue
  return prices.filter(p => Math.abs(p - med) <= threshold)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { category, limit = 500, forceUpdate = false }: AggregateRequest = await req.json().catch(() => ({}))
    
    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    console.log(`[aggregate-daily-prices] Starting aggregation for ${today}`)
    
    const results = {
      processed: 0,
      updated: 0,
      skipped: 0,
      volatility_gated: 0,
      insufficient_data: 0,
      errors: [] as string[],
    }

    // Get market items with external canonical key (matched items)
    let query = supabase
      .from('market_items')
      .select('id, name, current_price, external_canonical_key, cardmarket_trend, ebay_avg_30d, price_24h_ago, price_7d_ago, price_30d_ago, liquidity')
      .not('external_canonical_key', 'is', null)
      .limit(limit)
    
    if (category) {
      query = query.eq('category', category)
    }
    
    const { data: items, error: fetchError } = await query
    if (fetchError) throw fetchError
    
    console.log(`[aggregate-daily-prices] Processing ${items?.length || 0} matched items`)

    for (const item of items || []) {
      try {
        results.processed++
        
        // Fetch price events for this item in the last 30 days
        const { data: events, error: eventsError } = await supabase
          .from('price_events')
          .select('total_usd, source, event_type, is_outlier, sold_at')
          .eq('matched_market_item_id', item.id)
          .eq('is_outlier', false)
          .gte('ingested_at', thirtyDaysAgo)
          .order('ingested_at', { ascending: false })
        
        if (eventsError) {
          results.errors.push(`${item.id}: ${eventsError.message}`)
          continue
        }
        
        if (!events || events.length === 0) {
          results.insufficient_data++
          
          // Log skip
          await supabase.from('price_aggregation_log').upsert({
            market_item_id: item.id,
            run_date: today,
            previous_price: item.current_price,
            sample_count: 0,
            was_updated: false,
            skip_reason: 'insufficient_data',
          }, { onConflict: 'market_item_id,run_date' })
          
          continue
        }
        
        // Separate prices by source
        const cardmarketPrices = events
          .filter(e => e.source === 'cardmarket')
          .map(e => e.total_usd)
          .filter((p): p is number => p !== null && p > 0)
        
        const ebayPrices = events
          .filter(e => e.source === 'ebay' && e.event_type === 'sale')
          .map(e => e.total_usd)
          .filter((p): p is number => p !== null && p > 0)
        
        // Filter outliers
        const filteredCardmarket = filterOutliers(cardmarketPrices)
        const filteredEbay = filterOutliers(ebayPrices)
        
        // Calculate reference prices
        const cardmarketRef = filteredCardmarket.length > 0 ? median(filteredCardmarket) : null
        const ebayMedian = filteredEbay.length >= 3 ? median(filteredEbay) : null
        
        // Calculate blended price
        let blendedPrice: number | null = null
        
        if (cardmarketRef && ebayMedian) {
          // Both sources available: 60% Cardmarket, 40% eBay
          blendedPrice = cardmarketRef * 0.6 + ebayMedian * 0.4
        } else if (cardmarketRef) {
          blendedPrice = cardmarketRef
        } else if (ebayMedian) {
          blendedPrice = ebayMedian
        }
        
        if (!blendedPrice) {
          results.insufficient_data++
          
          await supabase.from('price_aggregation_log').upsert({
            market_item_id: item.id,
            run_date: today,
            previous_price: item.current_price,
            sample_count: events.length,
            was_updated: false,
            skip_reason: 'no_valid_prices',
          }, { onConflict: 'market_item_id,run_date' })
          
          continue
        }
        
        // Volatility gate: Skip if change > 30% and low liquidity
        const previousPrice = item.current_price || blendedPrice
        const changePercent = previousPrice > 0 
          ? ((blendedPrice - previousPrice) / previousPrice) * 100 
          : 0
        
        const isLowLiquidity = item.liquidity === 'low' || item.liquidity === 'none'
        const isHighVolatility = Math.abs(changePercent) > 30
        
        if (isHighVolatility && isLowLiquidity && !forceUpdate) {
          results.volatility_gated++
          
          // Queue for manual review
          await supabase.from('match_review_queue').insert({
            source: 'aggregation',
            source_event_id: `agg_${item.id}_${today}`,
            external_data: {
              previous_price: previousPrice,
              new_price: blendedPrice,
              change_percent: changePercent,
              sample_count: events.length,
            },
            proposed_market_item_id: item.id,
            proposed_confidence: 0.5,
            reason: `Volatility gate: ${changePercent.toFixed(1)}% change with low liquidity`,
            status: 'pending',
          })
          
          await supabase.from('price_aggregation_log').upsert({
            market_item_id: item.id,
            run_date: today,
            previous_price: previousPrice,
            new_price: blendedPrice,
            price_change_pct: changePercent,
            sample_count: events.length,
            cardmarket_price: cardmarketRef,
            ebay_median: ebayMedian,
            blended_price: blendedPrice,
            was_updated: false,
            skip_reason: 'volatility_gate',
          }, { onConflict: 'market_item_id,run_date' })
          
          continue
        }
        
        // Update market_items with new prices
        const now = new Date().toISOString()
        const updateData: Record<string, unknown> = {
          // Shift historical prices
          price_30d_ago: item.price_7d_ago || item.current_price,
          price_7d_ago: item.price_24h_ago || item.current_price,
          price_24h_ago: item.current_price,
          
          // Set new current price
          current_price: blendedPrice,
          blended_market_price: blendedPrice,
          cardmarket_trend: cardmarketRef,
          ebay_avg_30d: ebayMedian,
          
          // Recalculate changes
          change_24h: item.current_price && item.current_price > 0
            ? ((blendedPrice - item.current_price) / item.current_price) * 100
            : null,
          change_7d: item.price_7d_ago && item.price_7d_ago > 0
            ? ((blendedPrice - item.price_7d_ago) / item.price_7d_ago) * 100
            : null,
          change_30d: item.price_30d_ago && item.price_30d_ago > 0
            ? ((blendedPrice - item.price_30d_ago) / item.price_30d_ago) * 100
            : null,
          
          price_updated_at: now,
          price_confidence: events.length >= 10 ? 'high' : events.length >= 5 ? 'medium' : 'low',
          updated_at: now,
        }
        
        const { error: updateError } = await supabase
          .from('market_items')
          .update(updateData)
          .eq('id', item.id)
        
        if (updateError) {
          results.errors.push(`${item.id}: ${updateError.message}`)
          continue
        }
        
        // Log successful update
        await supabase.from('price_aggregation_log').upsert({
          market_item_id: item.id,
          run_date: today,
          previous_price: previousPrice,
          new_price: blendedPrice,
          price_change_pct: changePercent,
          sample_count: events.length,
          cardmarket_price: cardmarketRef,
          ebay_median: ebayMedian,
          blended_price: blendedPrice,
          was_updated: true,
        }, { onConflict: 'market_item_id,run_date' })
        
        // Mark processed events
        await supabase
          .from('price_events')
          .update({ is_processed: true })
          .eq('matched_market_item_id', item.id)
          .eq('is_processed', false)
        
        results.updated++
        
      } catch (itemError) {
        const msg = itemError instanceof Error ? itemError.message : 'Unknown error'
        results.errors.push(`${item.id}: ${msg}`)
        console.error(`[aggregate-daily-prices] Error processing ${item.id}:`, itemError)
      }
    }
    
    console.log(`[aggregate-daily-prices] Completed - Processed: ${results.processed}, Updated: ${results.updated}, Volatility Gated: ${results.volatility_gated}, Insufficient: ${results.insufficient_data}`)
    
    return new Response(JSON.stringify({
      success: true,
      date: today,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[aggregate-daily-prices] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})