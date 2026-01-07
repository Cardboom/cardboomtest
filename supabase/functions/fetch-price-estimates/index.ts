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

    const { market_item_id, card_name, set_name, category, force_refresh }: PriceEstimateRequest = await req.json()

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

    if (!openaiKey) {
      console.error('[fetch-price-estimates] OPENAI_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'AI pricing not available' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[fetch-price-estimates] Fetching AI estimates for: ${card_name} (${category})`)

    const prompt = `You are a TCG and collectibles pricing expert with deep knowledge of current market values.

Analyze this card and provide realistic USD price estimates:

Card Name: ${card_name}
Set: ${set_name || 'Unknown'}
Category: ${category}

Provide price estimates in USD for each condition/grade:
1. Ungraded (Near Mint raw condition)
2. PSA 6 (Excellent-Mint)
3. PSA 7 (Near Mint)
4. PSA 8 (Near Mint-Mint)
5. PSA 9 (Mint)
6. PSA 10 (Gem Mint)

Consider:
- Current market demand and trends
- Recent sold comparables
- Card rarity and print run
- Historical price movements
- Population reports for graded cards

Return ONLY valid JSON in this exact format:
{
  "price_ungraded": 15.00,
  "price_psa_6": 25.00,
  "price_psa_7": 40.00,
  "price_psa_8": 75.00,
  "price_psa_9": 150.00,
  "price_psa_10": 500.00,
  "confidence_score": 0.85,
  "notes": "Brief explanation of pricing factors"
}

If you cannot find reliable data for this card, set confidence_score below 0.5 and explain in notes.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are a TCG card pricing expert. Provide accurate, realistic market values based on current data. Always return valid JSON.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[fetch-price-estimates] OpenAI error:', response.status, errorText)
      return new Response(
        JSON.stringify({ error: 'AI pricing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content in AI response')
    }

    // Parse JSON from response
    let estimates: PriceEstimates
    try {
      let jsonStr = content.trim()
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
      else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
      
      estimates = JSON.parse(jsonStr.trim())
    } catch (parseError) {
      console.error('[fetch-price-estimates] Failed to parse AI response:', content)
      return new Response(
        JSON.stringify({ error: 'Failed to parse pricing data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
      confidence_score: estimates.confidence_score || 0.7,
      notes: estimates.notes || null,
      data_source: 'openai_gpt4o',
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }

    // Upsert based on market_item_id or card_name
    if (market_item_id) {
      const { error: upsertError } = await supabase
        .from('card_price_estimates')
        .upsert(recordData, { onConflict: 'market_item_id' })

      if (upsertError) {
        console.error('[fetch-price-estimates] Upsert error:', upsertError)
      }
    } else {
      // Insert without conflict handling for non-market items
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
