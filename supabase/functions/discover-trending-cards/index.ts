import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TrendingCard {
  card_name: string
  category: string
  trend_reason: string
  predicted_direction: 'bullish' | 'bearish' | 'neutral'
  trend_score: number
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

    const { category, limit = 10 } = await req.json().catch(() => ({}))

    if (!openaiKey) {
      console.error('[discover-trending-cards] OPENAI_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'AI trending not available' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get recent market activity for context
    const { data: recentActivity } = await supabase
      .from('market_items')
      .select('name, category, current_price, change_24h, change_7d, views_24h')
      .order('views_24h', { ascending: false })
      .limit(50)

    const { data: recentListings } = await supabase
      .from('listings')
      .select('title, category, price')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(30)

    console.log(`[discover-trending-cards] Analyzing trends with ${recentActivity?.length || 0} market items`)

    const prompt = `You are a TCG market analyst. Based on current trends, social media buzz, tournament results, and market data, identify the hottest trading cards right now.

${category ? `Focus on category: ${category}` : 'Cover all major TCG categories: Pokemon, Yu-Gi-Oh!, Magic: The Gathering, One Piece, Disney Lorcana, Sports Cards'}

Current market activity (top viewed items):
${JSON.stringify(recentActivity?.slice(0, 20) || [], null, 2)}

Recent new listings:
${JSON.stringify(recentListings?.slice(0, 15) || [], null, 2)}

Identify ${limit} trending cards that collectors should watch. Consider:
- Recent price spikes or momentum
- Tournament meta changes
- New set releases
- Social media hype
- Investment potential
- Scarcity and population

Return ONLY valid JSON array:
[
  {
    "card_name": "Charizard ex 199/165",
    "category": "pokemon",
    "trend_reason": "Scarlet & Violet 151 chase card with strong demand",
    "predicted_direction": "bullish",
    "trend_score": 95
  }
]

trend_score: 0-100 (100 = most trending)
predicted_direction: bullish, bearish, or neutral`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        messages: [
          { 
            role: 'system', 
            content: 'You are a TCG market analyst. Provide trending card recommendations based on real market dynamics. Return valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.5,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[discover-trending-cards] OpenAI error:', response.status, errorText)
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content in AI response')
    }

    // Parse JSON
    let trendingCards: TrendingCard[]
    try {
      let jsonStr = content.trim()
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
      else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
      
      trendingCards = JSON.parse(jsonStr.trim())
    } catch (parseError) {
      console.error('[discover-trending-cards] Failed to parse:', content)
      return new Response(
        JSON.stringify({ error: 'Failed to parse trending data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Match to existing market items and store
    const results = []
    for (const card of trendingCards) {
      // Try to find matching market item
      const { data: matchedItem } = await supabase
        .from('market_items')
        .select('id')
        .ilike('name', `%${card.card_name.split(' ').slice(0, 3).join('%')}%`)
        .eq('category', card.category)
        .limit(1)
        .maybeSingle()

      const recordData = {
        market_item_id: matchedItem?.id || null,
        card_name: card.card_name,
        category: card.category,
        trend_score: card.trend_score,
        trend_reason: card.trend_reason,
        predicted_direction: card.predicted_direction,
        data_sources: ['openai_gpt4o', 'market_analysis'],
        is_active: true,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

      const { data: inserted, error } = await supabase
        .from('ai_trending_cards')
        .insert(recordData)
        .select()
        .single()

      if (error) {
        console.error('[discover-trending-cards] Insert error:', error)
      } else {
        results.push(inserted)
      }
    }

    console.log(`[discover-trending-cards] Discovered ${results.length} trending cards`)

    return new Response(JSON.stringify({
      success: true,
      discovered: results.length,
      cards: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[discover-trending-cards] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
