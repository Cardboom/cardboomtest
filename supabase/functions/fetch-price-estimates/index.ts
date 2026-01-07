import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PriceEstimateRequest {
  market_item_id?: string
  card_name: string
  set_name?: string
  category: string
  force_refresh?: boolean
  image_url?: string
}

interface XimilarPricing {
  item_id: string
  item_link: string
  name: string
  price: number
  currency: string
  source: string
  grade_company?: string
  grade?: string
}

interface PriceEstimates {
  price_ungraded: number | null
  price_psa_6: number | null
  price_psa_7: number | null
  price_psa_8: number | null
  price_psa_9: number | null
  price_psa_10: number | null
  confidence_score: number
  notes: string
  data_source: string
}

// Map Ximilar pricing data to grade-specific prices
function processPricingData(pricingList: XimilarPricing[]): PriceEstimates {
  const prices: Record<string, number[]> = {
    ungraded: [],
    psa_6: [],
    psa_7: [],
    psa_8: [],
    psa_9: [],
    psa_10: [],
  }

  const sources = new Set<string>()

  for (const item of pricingList) {
    // Convert to USD if needed
    let priceUSD = item.price
    if (item.currency === 'EUR') priceUSD = item.price * 1.08
    else if (item.currency === 'GBP') priceUSD = item.price * 1.27
    
    sources.add(item.source)

    if (item.grade_company && item.grade) {
      const gradeNum = parseFloat(item.grade)
      if (item.grade_company.toUpperCase() === 'PSA') {
        if (gradeNum === 10) prices.psa_10.push(priceUSD)
        else if (gradeNum === 9) prices.psa_9.push(priceUSD)
        else if (gradeNum === 8) prices.psa_8.push(priceUSD)
        else if (gradeNum === 7) prices.psa_7.push(priceUSD)
        else if (gradeNum >= 5 && gradeNum <= 6) prices.psa_6.push(priceUSD)
      } else if (['BGS', 'CGC', 'SGC'].includes(item.grade_company.toUpperCase())) {
        // Map other grading companies to PSA equivalents
        if (gradeNum >= 9.5) prices.psa_10.push(priceUSD * 0.9) // BGS 9.5 ≈ PSA 10 value
        else if (gradeNum === 9) prices.psa_9.push(priceUSD)
        else if (gradeNum === 8 || gradeNum === 8.5) prices.psa_8.push(priceUSD)
      }
    } else {
      // Ungraded/raw card
      prices.ungraded.push(priceUSD)
    }
  }

  // Calculate median for each grade
  const getMedian = (arr: number[]): number | null => {
    if (arr.length === 0) return null
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  }

  const rawPrice = getMedian(prices.ungraded)
  const psa10Price = getMedian(prices.psa_10)
  const psa9Price = getMedian(prices.psa_9)
  const psa8Price = getMedian(prices.psa_8)
  const psa7Price = getMedian(prices.psa_7)
  const psa6Price = getMedian(prices.psa_6)

  // Estimate missing grades based on available data
  const estimatedPrices = estimateMissingGrades(rawPrice, psa6Price, psa7Price, psa8Price, psa9Price, psa10Price)

  // Calculate confidence based on data availability
  const dataPoints = [rawPrice, psa6Price, psa7Price, psa8Price, psa9Price, psa10Price].filter(p => p !== null).length
  const confidence = Math.min(0.95, 0.4 + (dataPoints * 0.1) + (pricingList.length * 0.02))

  const sourceList = Array.from(sources).join(', ')
  
  return {
    price_ungraded: estimatedPrices.ungraded,
    price_psa_6: estimatedPrices.psa_6,
    price_psa_7: estimatedPrices.psa_7,
    price_psa_8: estimatedPrices.psa_8,
    price_psa_9: estimatedPrices.psa_9,
    price_psa_10: estimatedPrices.psa_10,
    confidence_score: Math.round(confidence * 100) / 100,
    notes: `Data from ${sourceList || 'market sources'}. Based on ${pricingList.length} listings.`,
    data_source: 'ximilar_tcgplayer_ebay',
  }
}

// Estimate missing grade prices using market multipliers
function estimateMissingGrades(
  raw: number | null,
  psa6: number | null,
  psa7: number | null,
  psa8: number | null,
  psa9: number | null,
  psa10: number | null
): Record<string, number | null> {
  // Standard multipliers based on market data
  const multipliers = {
    raw_to_psa10: 0.08,      // Raw is typically 8% of PSA 10
    psa6_to_psa10: 0.15,     // PSA 6 is ~15% of PSA 10
    psa7_to_psa10: 0.25,     // PSA 7 is ~25% of PSA 10
    psa8_to_psa10: 0.40,     // PSA 8 is ~40% of PSA 10
    psa9_to_psa10: 0.60,     // PSA 9 is ~60% of PSA 10
  }

  let basePSA10 = psa10

  // Try to derive PSA 10 from other grades if not available
  if (!basePSA10) {
    if (psa9) basePSA10 = psa9 / multipliers.psa9_to_psa10
    else if (psa8) basePSA10 = psa8 / multipliers.psa8_to_psa10
    else if (psa7) basePSA10 = psa7 / multipliers.psa7_to_psa10
    else if (psa6) basePSA10 = psa6 / multipliers.psa6_to_psa10
    else if (raw) basePSA10 = raw / multipliers.raw_to_psa10
  }

  if (!basePSA10) {
    return { ungraded: raw, psa_6: psa6, psa_7: psa7, psa_8: psa8, psa_9: psa9, psa_10: psa10 }
  }

  return {
    ungraded: raw ?? Math.round(basePSA10 * multipliers.raw_to_psa10),
    psa_6: psa6 ?? Math.round(basePSA10 * multipliers.psa6_to_psa10),
    psa_7: psa7 ?? Math.round(basePSA10 * multipliers.psa7_to_psa10),
    psa_8: psa8 ?? Math.round(basePSA10 * multipliers.psa8_to_psa10),
    psa_9: psa9 ?? Math.round(basePSA10 * multipliers.psa9_to_psa10),
    psa_10: psa10 ?? Math.round(basePSA10),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ximilarToken = Deno.env.get('XIMILAR_API_TOKEN')
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { market_item_id, card_name, set_name, category, force_refresh, image_url }: PriceEstimateRequest = await req.json()

    if (!card_name || !category) {
      return new Response(
        JSON.stringify({ error: 'card_name and category are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for existing non-expired estimate
    if (market_item_id && !force_refresh) {
      const { data: existing } = await supabase
        .from('card_price_estimates')
        .select('*')
        .eq('market_item_id', market_item_id)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (existing) {
        console.log(`[fetch-price-estimates] Using cached estimate for ${card_name}`)
        return new Response(JSON.stringify(existing), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Check by card name if no market_item_id
    if (!market_item_id && !force_refresh) {
      const { data: existingByName } = await supabase
        .from('card_price_estimates')
        .select('*')
        .eq('card_name', card_name)
        .eq('category', category)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (existingByName) {
        console.log(`[fetch-price-estimates] Using cached estimate by name for ${card_name}`)
        return new Response(JSON.stringify(existingByName), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    if (!ximilarToken) {
      console.error('[fetch-price-estimates] XIMILAR_API_TOKEN not configured')
      return new Response(
        JSON.stringify({ error: 'Pricing service not available' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[fetch-price-estimates] Fetching Ximilar pricing for: ${card_name} (${category})`)

    // Build search query for Ximilar
    const searchQuery = `${card_name} ${set_name || ''}`.trim()
    
    // Try to get image URL from market_items if not provided
    let cardImageUrl = image_url
    if (!cardImageUrl && market_item_id) {
      const { data: marketItem } = await supabase
        .from('market_items')
        .select('image_url')
        .eq('id', market_item_id)
        .single()
      cardImageUrl = marketItem?.image_url
    }

    let pricingData: XimilarPricing[] = []
    let ximilarSuccess = false

    // If we have an image, use Ximilar's visual search with pricing
    if (cardImageUrl) {
      try {
        const ximilarResponse = await fetch('https://api.ximilar.com/collectibles/v2/tcg_id', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${ximilarToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            records: [{ _url: cardImageUrl }],
            pricing: true,
          }),
        })

        if (ximilarResponse.ok) {
          const ximilarData = await ximilarResponse.json()
          const record = ximilarData.records?.[0]
          const bestMatch = record?._objects?.[0]?._identification?.best_match
          
          if (bestMatch?.pricing?.list) {
            pricingData = bestMatch.pricing.list
            ximilarSuccess = true
            console.log(`[fetch-price-estimates] Got ${pricingData.length} pricing records from Ximilar`)
          }
        }
      } catch (ximilarError) {
        console.error('[fetch-price-estimates] Ximilar image lookup failed:', ximilarError)
      }
    }

    // If no image or Ximilar failed, try text-based search via TCGPlayer/eBay data in our DB
    if (!ximilarSuccess || pricingData.length === 0) {
      console.log('[fetch-price-estimates] Falling back to database price history')
      
      // Check price_history table for recent sales
      const { data: priceHistory } = await supabase
        .from('price_history')
        .select('price, source')
        .eq('product_id', market_item_id || '')
        .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: false })
        .limit(50)

      if (priceHistory && priceHistory.length > 0) {
        // Convert to Ximilar format for processing
        pricingData = priceHistory.map(ph => ({
          item_id: '',
          item_link: '',
          name: card_name,
          price: Number(ph.price),
          currency: 'USD',
          source: ph.source || 'price_history',
        }))
      }
    }

    // If still no data, check market_items for current price as baseline
    if (pricingData.length === 0 && market_item_id) {
      const { data: marketItem } = await supabase
        .from('market_items')
        .select('current_price, psa_10_price, psa_9_price')
        .eq('id', market_item_id)
        .single()

      if (marketItem?.current_price) {
        // Use existing market data
        const gradeEstimates = estimateMissingGrades(
          null,
          null,
          null,
          null,
          marketItem.psa_9_price ? Number(marketItem.psa_9_price) : null,
          marketItem.psa_10_price ? Number(marketItem.psa_10_price) : marketItem.current_price
        )

        const recordData = {
          market_item_id: market_item_id || null,
          card_name,
          set_name: set_name || null,
          category,
          price_ungraded: gradeEstimates.ungraded,
          price_psa_6: gradeEstimates.psa_6,
          price_psa_7: gradeEstimates.psa_7,
          price_psa_8: gradeEstimates.psa_8,
          price_psa_9: gradeEstimates.psa_9,
          price_psa_10: gradeEstimates.psa_10,
          confidence_score: 0.6,
          notes: 'Estimated from current market price. Limited historical data.',
          data_source: 'market_items_estimate',
          updated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days for estimates
        }

        // Upsert the estimate
        if (market_item_id) {
          await supabase
            .from('card_price_estimates')
            .upsert(recordData, { onConflict: 'market_item_id' })
        }

        return new Response(JSON.stringify({
          ...recordData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Process pricing data
    if (pricingData.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No pricing data available',
          card_name,
          category,
          confidence_score: 0,
          notes: 'Insufficient data - no market prices found for this card.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const estimates = processPricingData(pricingData)

    // Store in database
    const recordData = {
      market_item_id: market_item_id || null,
      card_name,
      set_name: set_name || null,
      category,
      price_ungraded: estimates.price_ungraded,
      price_psa_6: estimates.price_psa_6,
      price_psa_7: estimates.price_psa_7,
      price_psa_8: estimates.price_psa_8,
      price_psa_9: estimates.price_psa_9,
      price_psa_10: estimates.price_psa_10,
      confidence_score: estimates.confidence_score,
      notes: estimates.notes,
      data_source: estimates.data_source,
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }

    // Upsert based on market_item_id
    if (market_item_id) {
      const { error: upsertError } = await supabase
        .from('card_price_estimates')
        .upsert(recordData, { onConflict: 'market_item_id' })

      if (upsertError) {
        console.error('[fetch-price-estimates] Upsert error:', upsertError)
      }
    } else {
      const { error: insertError } = await supabase
        .from('card_price_estimates')
        .insert(recordData)

      if (insertError && !insertError.message.includes('duplicate')) {
        console.error('[fetch-price-estimates] Insert error:', insertError)
      }
    }

    console.log(`[fetch-price-estimates] Successfully fetched estimates for ${card_name}`)

    return new Response(JSON.stringify({
      ...recordData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[fetch-price-estimates] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
