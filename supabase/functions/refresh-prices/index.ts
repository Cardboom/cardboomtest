import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RefreshRequest {
  type: 'top_viewed' | 'portfolio' | 'all'
  limit?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { type = 'top_viewed', limit = 100 }: RefreshRequest = await req.json().catch(() => ({}))

    let itemIds: string[] = []

    if (type === 'top_viewed') {
      // Get top viewed items in last 24h
      const { data: viewedItems } = await supabase
        .from('market_items')
        .select('id')
        .order('views_24h', { ascending: false, nullsFirst: false })
        .limit(limit)

      itemIds = viewedItems?.map(i => i.id) || []
    } else if (type === 'portfolio') {
      // Get unique items in user portfolios
      const { data: portfolioItems } = await supabase
        .from('portfolio_items')
        .select('market_item_id')
        .not('market_item_id', 'is', null)
        .limit(limit)

      itemIds = [...new Set(portfolioItems?.map(i => i.market_item_id).filter(Boolean) || [])]
    } else if (type === 'all') {
      // Get all items for nightly refresh
      const { data: allItems } = await supabase
        .from('market_items')
        .select('id')
        .limit(limit)

      itemIds = allItems?.map(i => i.id) || []
    }

    if (itemIds.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No items to refresh',
        refreshed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch current prices and update
    const { data: items, error: fetchError } = await supabase
      .from('market_items')
      .select('id, current_price, price_24h_ago, price_7d_ago, price_30d_ago')
      .in('id', itemIds)

    if (fetchError) throw fetchError

    const now = new Date().toISOString()
    let updatedCount = 0
    const errors: string[] = []

    for (const item of items || []) {
      try {
        // Calculate price changes based on historical data
        const change24h = item.price_24h_ago && item.price_24h_ago > 0
          ? ((item.current_price - item.price_24h_ago) / item.price_24h_ago) * 100
          : null

        const change7d = item.price_7d_ago && item.price_7d_ago > 0
          ? ((item.current_price - item.price_7d_ago) / item.price_7d_ago) * 100
          : null

        const change30d = item.price_30d_ago && item.price_30d_ago > 0
          ? ((item.current_price - item.price_30d_ago) / item.price_30d_ago) * 100
          : null

        // Update item with recalculated changes
        const { error: updateError } = await supabase
          .from('market_items')
          .update({
            change_24h: change24h,
            change_7d: change7d,
            change_30d: change30d,
            updated_at: now
          })
          .eq('id', item.id)

        if (updateError) {
          errors.push(`${item.id}: ${updateError.message}`)
        } else {
          updatedCount++
        }
      } catch (err) {
        errors.push(`${item.id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    // Log refresh job
    console.log(`[refresh-prices] Type: ${type}, Refreshed: ${updatedCount}/${itemIds.length}, Errors: ${errors.length}`)

    return new Response(JSON.stringify({
      success: true,
      type,
      refreshed: updatedCount,
      total: itemIds.length,
      errors: errors.slice(0, 10) // Return first 10 errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[refresh-prices] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
