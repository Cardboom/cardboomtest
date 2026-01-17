import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Statistical helpers
function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function mad(arr: number[], med: number): number {
  if (arr.length === 0) return 0
  const deviations = arr.map(x => Math.abs(x - med))
  return median(deviations)
}

function filterOutliers(prices: number[], multiplier = 3): number[] {
  if (prices.length < 5) return prices
  const med = median(prices)
  const madVal = mad(prices, med)
  if (madVal === 0) return prices
  return prices.filter(p => Math.abs(p - med) <= multiplier * madVal)
}

function calculateConfidence(sampleCount: number, daysCovered: number): number {
  // Confidence based on sample size and recency
  let conf = 0
  if (sampleCount >= 10) conf += 0.5
  else if (sampleCount >= 5) conf += 0.3
  else if (sampleCount >= 2) conf += 0.15
  else if (sampleCount >= 1) conf += 0.05
  
  if (daysCovered <= 7) conf += 0.5
  else if (daysCovered <= 14) conf += 0.35
  else if (daysCovered <= 30) conf += 0.2
  
  return Math.min(1, conf)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Get all catalog cards
    const { data: catalogCards, error: cardsError } = await supabase
      .from('catalog_cards')
      .select('id, canonical_key, name, game')
      .limit(500)

    if (cardsError) throw cardsError

    const results = {
      processed: 0,
      snapshots_created: 0,
      insufficient_data: 0,
      errors: [] as string[]
    }

    for (const card of catalogCards || []) {
      try {
        // Get price events for this catalog card
        const { data: events, error: eventsError } = await supabase
          .from('price_events')
          .select('total_usd, total_try, total_eur, source, sold_at, is_outlier')
          .eq('catalog_card_id', card.id)
          .eq('is_outlier', false)
          .gte('sold_at', thirtyDaysAgo)
          .order('sold_at', { ascending: false })

        if (eventsError) {
          results.errors.push(`${card.id}: ${eventsError.message}`)
          continue
        }

        results.processed++

        if (!events || events.length === 0) {
          results.insufficient_data++
          continue
        }

        // Extract prices
        const usdPrices = events.map(e => e.total_usd).filter((p): p is number => p !== null && p > 0)
        const tryPrices = events.map(e => e.total_try).filter((p): p is number => p !== null && p > 0)
        const eurPrices = events.map(e => e.total_eur).filter((p): p is number => p !== null && p > 0)

        // Filter outliers
        const filteredUsd = filterOutliers(usdPrices)
        const filteredTry = filterOutliers(tryPrices)
        const filteredEur = filterOutliers(eurPrices)

        if (filteredUsd.length === 0) {
          results.insufficient_data++
          continue
        }

        // Calculate metrics
        const medianUsd = median(filteredUsd)
        const medianTry = filteredTry.length > 0 ? median(filteredTry) : null
        const medianEur = filteredEur.length > 0 ? median(filteredEur) : null
        const lowUsd = Math.min(...filteredUsd)
        const highUsd = Math.max(...filteredUsd)

        // Calculate days covered
        const sortedDates = events.map(e => new Date(e.sold_at!).getTime()).sort()
        const daysCovered = sortedDates.length > 1 
          ? Math.ceil((sortedDates[sortedDates.length - 1] - sortedDates[0]) / (24 * 60 * 60 * 1000))
          : 30

        const confidence = calculateConfidence(filteredUsd.length, daysCovered)

        // Upsert snapshot
        const { error: upsertError } = await supabase
          .from('card_price_snapshots')
          .upsert({
            catalog_card_id: card.id,
            snapshot_date: today,
            median_usd: medianUsd,
            median_try: medianTry,
            median_eur: medianEur,
            low_usd: lowUsd,
            high_usd: highUsd,
            liquidity_count: filteredUsd.length,
            confidence,
            sources: [...new Set(events.map(e => e.source))]
          }, { onConflict: 'catalog_card_id,snapshot_date' })

        if (upsertError) {
          results.errors.push(`Snapshot ${card.id}: ${upsertError.message}`)
        } else {
          results.snapshots_created++
        }

      } catch (err) {
        results.errors.push(`${card.id}: ${err.message}`)
      }
    }

    console.log(`[catalog-price-snapshot] Results:`, results)

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[catalog-price-snapshot] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
