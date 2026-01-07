import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { listing_id, batch_process = false, limit = 50 } = await req.json().catch(() => ({}))

    // Get listings to process
    let listingsQuery = supabase
      .from('listings')
      .select('id, title, category, set_name, set_code, card_number, rarity, language, cvi_key, image_url')
      .eq('status', 'active')

    if (listing_id) {
      listingsQuery = listingsQuery.eq('id', listing_id)
    } else if (batch_process) {
      // Get listings not yet processed
      const { data: processedIds } = await supabase
        .from('listing_card_data')
        .select('listing_id')
      
      const processed = new Set(processedIds?.map(p => p.listing_id) || [])
      
      listingsQuery = listingsQuery.limit(limit)
    }

    const { data: listings, error: listingsError } = await listingsQuery

    if (listingsError) throw listingsError
    if (!listings || listings.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No listings to process',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[process-listing-data] Processing ${listings.length} listings`)

    let processedCount = 0
    let matchedCount = 0

    for (const listing of listings) {
      // Check if already processed
      const { data: existing } = await supabase
        .from('listing_card_data')
        .select('id')
        .eq('listing_id', listing.id)
        .maybeSingle()

      if (existing) continue

      // Extract card data from listing
      const cardData = {
        detected_card_name: listing.title,
        detected_set_name: listing.set_name || null,
        detected_card_number: listing.card_number || null,
        detected_rarity: listing.rarity || null,
        detected_language: listing.language || null,
        detected_category: listing.category,
      }

      // Try to match with existing market items
      let matchedMarketItemId = null
      let matchConfidence = 0

      // Strategy 1: Match by CVI key (highest confidence)
      if (listing.cvi_key) {
        const { data: cviMatch } = await supabase
          .from('market_items')
          .select('id')
          .eq('cvi_key', listing.cvi_key)
          .maybeSingle()

        if (cviMatch) {
          matchedMarketItemId = cviMatch.id
          matchConfidence = 0.98
        }
      }

      // Strategy 2: Match by set_code + card_number
      if (!matchedMarketItemId && listing.set_code && listing.card_number) {
        const { data: setMatch } = await supabase
          .from('market_items')
          .select('id')
          .eq('set_code', listing.set_code)
          .eq('card_number', listing.card_number)
          .eq('category', listing.category)
          .maybeSingle()

        if (setMatch) {
          matchedMarketItemId = setMatch.id
          matchConfidence = 0.9
        }
      }

      // Strategy 3: Fuzzy name match
      if (!matchedMarketItemId) {
        const searchTerms = listing.title.split(' ').slice(0, 4).join('%')
        const { data: nameMatches } = await supabase
          .from('market_items')
          .select('id, name')
          .eq('category', listing.category)
          .ilike('name', `%${searchTerms}%`)
          .limit(5)

        if (nameMatches && nameMatches.length > 0) {
          // Find best match
          const titleLower = listing.title.toLowerCase()
          const bestMatch = nameMatches.find(m => 
            titleLower.includes(m.name.toLowerCase()) || 
            m.name.toLowerCase().includes(titleLower)
          )
          
          if (bestMatch) {
            matchedMarketItemId = bestMatch.id
            matchConfidence = 0.7
          } else {
            matchedMarketItemId = nameMatches[0].id
            matchConfidence = 0.5
          }
        }
      }

      // Store the extracted data
      const { error: insertError } = await supabase
        .from('listing_card_data')
        .insert({
          listing_id: listing.id,
          ...cardData,
          matched_market_item_id: matchedMarketItemId,
          match_confidence: matchConfidence,
          contributed_to_catalog: false,
        })

      if (insertError) {
        console.error(`[process-listing-data] Error inserting for ${listing.id}:`, insertError)
        continue
      }

      processedCount++
      if (matchedMarketItemId) matchedCount++
    }

    console.log(`[process-listing-data] Processed ${processedCount} listings, matched ${matchedCount}`)

    return new Response(JSON.stringify({
      success: true,
      processed: processedCount,
      matched: matchedCount,
      total_listings: listings.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[process-listing-data] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
