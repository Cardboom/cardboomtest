import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get API key from header
    const apiKey = req.headers.get('x-api-key')
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required. Include x-api-key header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate API key and check subscription
    const { data: subscription, error: subError } = await supabase
      .from('api_subscriptions')
      .select('*')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single()

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limit
    if (subscription.requests_today >= subscription.requests_limit) {
      return new Response(
        JSON.stringify({ error: 'Daily request limit exceeded', limit: subscription.requests_limit }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check expiration
    if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'API subscription expired' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Increment request count
    await supabase
      .from('api_subscriptions')
      .update({ requests_today: subscription.requests_today + 1 })
      .eq('id', subscription.id)

    // Parse URL for endpoint
    const url = new URL(req.url)
    const endpoint = url.pathname.replace('/market-api', '') || '/items'
    const params = Object.fromEntries(url.searchParams)

    // Log the request
    await supabase.from('api_request_logs').insert({
      api_key: apiKey,
      endpoint: endpoint,
      response_code: 200
    })

    // Handle different endpoints
    if (endpoint === '/items' || endpoint === '/' || endpoint === '') {
      const { category, limit = '50', offset = '0', search } = params
      
      let query = supabase
        .from('market_items')
        .select('id, name, category, current_price, change_24h, change_7d, change_30d, liquidity, image_url, set_name, rarity')
        .order('current_price', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

      if (category) {
        query = query.eq('category', category)
      }
      if (search) {
        query = query.ilike('name', `%${search}%`)
      }

      const { data, error } = await query

      if (error) throw error

      return new Response(
        JSON.stringify({
          success: true,
          data: data,
          meta: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: data?.length || 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (endpoint.startsWith('/item/')) {
      const itemId = endpoint.replace('/item/', '')
      
      const { data, error } = await supabase
        .from('market_items')
        .select('*')
        .eq('id', itemId)
        .single()

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Item not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (endpoint === '/prices') {
      const { ids } = params
      
      if (!ids) {
        return new Response(
          JSON.stringify({ error: 'ids parameter required (comma-separated)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const itemIds = ids.split(',')
      
      const { data, error } = await supabase
        .from('market_items')
        .select('id, name, current_price, change_24h')
        .in('id', itemIds)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (endpoint === '/categories') {
      const { data, error } = await supabase
        .from('market_items')
        .select('category')
        
      if (error) throw error
      
      const categories = [...new Set(data?.map(item => item.category) || [])]

      return new Response(
        JSON.stringify({ success: true, data: categories }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        error: 'Unknown endpoint',
        available_endpoints: [
          'GET /items - List all items (params: category, limit, offset, search)',
          'GET /item/:id - Get single item details',
          'GET /prices?ids=id1,id2 - Get prices for multiple items',
          'GET /categories - List all categories'
        ]
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('API Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})