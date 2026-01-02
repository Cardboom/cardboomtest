import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SnapshotRequest {
  batch_size?: number
  offset?: number
  category?: string
  update_historical?: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { batch_size = 1000, offset = 0, category, update_historical = true }: SnapshotRequest = await req.json().catch(() => ({}))

    // Get today's date at midnight UTC for deduplication
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const todayStr = today.toISOString()

    // Build query for market items
    let query = supabase
      .from('market_items')
      .select('id, name, current_price, category, liquidity, views_24h')
      .not('current_price', 'is', null)
      .gt('current_price', 0)
      .order('views_24h', { ascending: false, nullsFirst: false })
      .range(offset, offset + batch_size - 1)

    if (category) {
      query = query.eq('category', category)
    }

    const { data: items, error: fetchError } = await query

    if (fetchError) {
      throw fetchError
    }

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No items to snapshot',
        recorded: 0,
        offset,
        has_more: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check which items already have a snapshot for today
    const itemIds = items.map(i => i.id)
    const { data: existingSnapshots } = await supabase
      .from('price_history')
      .select('market_item_id')
      .in('market_item_id', itemIds)
      .gte('recorded_at', todayStr)

    const existingIds = new Set(existingSnapshots?.map(s => s.market_item_id) || [])

    // Filter out items that already have today's snapshot
    const itemsToSnapshot = items.filter(item => !existingIds.has(item.id))

    // Prepare price history records
    const now = new Date().toISOString()
    const priceRecords = itemsToSnapshot.map(item => ({
      product_id: item.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100) || item.id,
      market_item_id: item.id,
      price: item.current_price,
      source: 'daily_snapshot',
      recorded_at: now,
      volume: item.views_24h || 0,
      sample_count: 1
    }))

    // Insert in batches to avoid timeout
    const BATCH_INSERT_SIZE = 500
    let totalInserted = 0
    const errors: string[] = []

    for (let i = 0; i < priceRecords.length; i += BATCH_INSERT_SIZE) {
      const batch = priceRecords.slice(i, i + BATCH_INSERT_SIZE)
      const { error: insertError } = await supabase
        .from('price_history')
        .insert(batch)

      if (insertError) {
        errors.push(`Batch ${Math.floor(i / BATCH_INSERT_SIZE)}: ${insertError.message}`)
      } else {
        totalInserted += batch.length
      }
    }

    // PRICING HIERARCHY FALLBACK: For items with no external price, use active listings
    const { data: zeroPriceItems } = await supabase
      .from('market_items')
      .select('id, name, category')
      .eq('current_price', 0)
      .limit(500)

    if (zeroPriceItems && zeroPriceItems.length > 0) {
      console.log(`[daily-price-snapshot] Found ${zeroPriceItems.length} items with zero price, checking listings...`)
      
      for (const item of zeroPriceItems) {
        // Find active listings that match this item
        const { data: matchingListings } = await supabase
          .from('listings')
          .select('price')
          .eq('status', 'active')
          .eq('category', item.category)
          .ilike('title', `%${item.name.split(' ').slice(0, 3).join('%')}%`)
          .order('price', { ascending: true })
          .limit(10)

        if (matchingListings && matchingListings.length > 0) {
          // Use median price from listings (anti-manipulation: not min, not max)
          const prices = matchingListings.map(l => Number(l.price)).filter(p => p > 0)
          if (prices.length > 0) {
            const medianPrice = prices.length === 1 
              ? prices[0] 
              : prices[Math.floor(prices.length / 2)]
            
            await supabase
              .from('market_items')
              .update({ 
                current_price: medianPrice,
                data_source: 'user_listing',
                updated_at: now
              })
              .eq('id', item.id)
            
            console.log(`[daily-price-snapshot] Set ${item.name} price to $${medianPrice} from ${prices.length} listings`)
          }
        }
      }
    }

    // Update historical price references in market_items for accurate % changes
    if (update_historical && items.length > 0) {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      // Fetch historical prices for all items
      for (const item of items) {
        try {
          // Get price from 24h ago
          const { data: price24h } = await supabase
            .from('price_history')
            .select('price')
            .eq('market_item_id', item.id)
            .lte('recorded_at', yesterday.toISOString())
            .order('recorded_at', { ascending: false })
            .limit(1)

          // Get price from 7 days ago
          const { data: price7d } = await supabase
            .from('price_history')
            .select('price')
            .eq('market_item_id', item.id)
            .lte('recorded_at', sevenDaysAgo.toISOString())
            .order('recorded_at', { ascending: false })
            .limit(1)

          // Get price from 30 days ago
          const { data: price30d } = await supabase
            .from('price_history')
            .select('price')
            .eq('market_item_id', item.id)
            .lte('recorded_at', thirtyDaysAgo.toISOString())
            .order('recorded_at', { ascending: false })
            .limit(1)

          const updateData: Record<string, number | null> = {}
          
          if (price24h && price24h.length > 0) {
            updateData.price_24h_ago = Number(price24h[0].price)
            if (item.current_price && price24h[0].price > 0) {
              updateData.change_24h = ((item.current_price - price24h[0].price) / price24h[0].price) * 100
            }
          }
          
          if (price7d && price7d.length > 0) {
            updateData.price_7d_ago = Number(price7d[0].price)
            if (item.current_price && price7d[0].price > 0) {
              updateData.change_7d = ((item.current_price - price7d[0].price) / price7d[0].price) * 100
            }
          }
          
          if (price30d && price30d.length > 0) {
            updateData.price_30d_ago = Number(price30d[0].price)
            if (item.current_price && price30d[0].price > 0) {
              updateData.change_30d = ((item.current_price - price30d[0].price) / price30d[0].price) * 100
            }
          }

          if (Object.keys(updateData).length > 0) {
            await supabase
              .from('market_items')
              .update(updateData)
              .eq('id', item.id)
          }
        } catch (err) {
          console.error(`Error updating historical prices for ${item.id}:`, err)
        }
      }
    }

    console.log(`[daily-price-snapshot] Recorded: ${totalInserted}/${itemsToSnapshot.length}, Offset: ${offset}, Errors: ${errors.length}`)

    return new Response(JSON.stringify({
      success: true,
      recorded: totalInserted,
      skipped: existingIds.size,
      total_processed: items.length,
      offset,
      has_more: items.length === batch_size,
      next_offset: offset + batch_size,
      historical_updated: update_historical,
      errors: errors.slice(0, 5)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[daily-price-snapshot] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})