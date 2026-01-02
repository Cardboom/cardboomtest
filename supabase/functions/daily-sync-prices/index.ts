import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncRequest {
  category?: string
  limit?: number
  forceAll?: boolean
}

// TCG categories that should use Cardmarket as primary source
const TCG_CATEGORIES = ['pokemon', 'yugioh', 'mtg', 'onepiece', 'lorcana', 'digimon', 'riftbound']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const priceChartingKey = Deno.env.get('PRICECHARTING_API_KEY')
    const cardmarketKey = Deno.env.get('CARDMARKET_RAPIDAPI_KEY')
    const justTcgKey = Deno.env.get('JUSTTCG_API_KEY')
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { category, limit = 500, forceAll = false }: SyncRequest = await req.json().catch(() => ({}))
    
    console.log(`[daily-sync-prices] Starting sync - category: ${category || 'all'}, limit: ${limit}`)
    
    // Get items that need price updates (not updated in last 24h or never updated)
    let query = supabase
      .from('market_items')
      .select('id, name, category, external_id, data_source, current_price')
      .not('external_id', 'is', null)
      
    if (!forceAll) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      query = query.or(`updated_at.lt.${yesterday.toISOString()},updated_at.is.null`)
    }
    
    if (category) {
      query = query.eq('category', category)
    }
    
    const { data: items, error: fetchError } = await query.limit(limit)
    
    if (fetchError) throw fetchError
    
    console.log(`[daily-sync-prices] Found ${items?.length || 0} items to sync`)
    
    const results = {
      updated: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    }
    
    // Process items in batches
    const batchSize = 10
    for (let i = 0; i < (items?.length || 0); i += batchSize) {
      const batch = items!.slice(i, i + batchSize)
      
      await Promise.all(batch.map(async (item) => {
        try {
          let newPrice: number | null = null
          let source = 'api'
          
          // Determine which API to use based on category
          const isTcgCategory = TCG_CATEGORIES.includes(item.category?.toLowerCase() || '')
          
          // TCG Categories: Try Cardmarket first, then JustTCG, then PriceCharting
          if (isTcgCategory && cardmarketKey) {
            try {
              const searchQuery = encodeURIComponent(item.name)
              const cmResponse = await fetch(
                `https://cardmarket-api.p.rapidapi.com/products/search?search=${searchQuery}&game=${item.category}&limit=1`,
                {
                  headers: {
                    'X-RapidAPI-Key': cardmarketKey,
                    'X-RapidAPI-Host': 'cardmarket-api.p.rapidapi.com',
                  }
                }
              )
              
              if (cmResponse.ok) {
                const cmData = await cmResponse.json()
                if (cmData.products?.[0]) {
                  const product = cmData.products[0]
                  // Use averageSellPrice or trendPrice
                  newPrice = product.averageSellPrice || product.trendPrice || product.lowestPrice
                  if (newPrice && newPrice > 0) {
                    source = 'cardmarket'
                  }
                }
              }
            } catch (cmError) {
              console.error(`[daily-sync-prices] Cardmarket error for ${item.id}:`, cmError)
            }
          }
          
          // Fallback to JustTCG for TCG items
          if (!newPrice && isTcgCategory && justTcgKey) {
            try {
              const jtResponse = await fetch(
                `https://api.justtcg.com/v1/products/search?q=${encodeURIComponent(item.name)}&limit=1`,
                {
                  headers: {
                    'Authorization': `Bearer ${justTcgKey}`,
                  }
                }
              )
              
              if (jtResponse.ok) {
                const jtData = await jtResponse.json()
                if (jtData.data?.[0]) {
                  newPrice = jtData.data[0].marketPrice || jtData.data[0].lowPrice
                  if (newPrice && newPrice > 0) {
                    source = 'justtcg'
                  }
                }
              }
            } catch (jtError) {
              console.error(`[daily-sync-prices] JustTCG error for ${item.id}:`, jtError)
            }
          }
          
          // Non-TCG or fallback: Use PriceCharting
          if (!newPrice && priceChartingKey) {
            const pcId = item.external_id?.replace('pc:', '') || ''
            
            // Try numeric ID first
            if (/^\d+$/.test(pcId)) {
              const pcResponse = await fetch(
                `https://www.pricecharting.com/api/product?t=${priceChartingKey}&id=${pcId}`
              )
              if (pcResponse.ok) {
                const pcData = await pcResponse.json()
                // Use loose-price or graded-price based on availability
                newPrice = pcData['loose-price'] || pcData['graded-price'] || pcData['cib-price']
                if (newPrice) newPrice = newPrice / 100 // PriceCharting returns cents
                source = 'pricecharting'
              }
            } else {
              // Try search-based lookup
              const searchResponse = await fetch(
                `https://www.pricecharting.com/api/products?t=${priceChartingKey}&q=${encodeURIComponent(item.name)}&limit=1`
              )
              if (searchResponse.ok) {
                const searchData = await searchResponse.json()
                if (searchData.products?.[0]) {
                  const product = searchData.products[0]
                  newPrice = product['loose-price'] || product['graded-price']
                  if (newPrice) newPrice = newPrice / 100
                  source = 'pricecharting'
                }
              }
            }
          }
          
          if (newPrice && newPrice > 0) {
            // Validate price (not more than 10x or less than 0.1x current price)
            const isValidPrice = !item.current_price || 
              (newPrice <= item.current_price * 10 && newPrice >= item.current_price * 0.1)
            
            if (isValidPrice) {
              // Update item price
              const { error: updateError } = await supabase
                .from('market_items')
                .update({
                  price_24h_ago: item.current_price,
                  current_price: newPrice,
                  data_source: source,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', item.id)
              
              if (updateError) {
                results.errors.push(`${item.id}: ${updateError.message}`)
                results.failed++
              } else {
                // Also record in price_history
                await supabase.from('price_history').insert({
                  market_item_id: item.id,
                  price: newPrice,
                  source,
                })
                
                results.updated++
              }
            } else {
              console.log(`[daily-sync-prices] Skipping suspicious price for ${item.name}: ${item.current_price} -> ${newPrice}`)
              results.skipped++
            }
          } else {
            results.skipped++
          }
        } catch (itemError) {
          console.error(`[daily-sync-prices] Error processing ${item.id}:`, itemError)
          results.failed++
        }
      }))
      
      // Small delay between batches to avoid rate limits
      if (i + batchSize < (items?.length || 0)) {
        await new Promise(r => setTimeout(r, 500))
      }
    }
    
    console.log(`[daily-sync-prices] Completed - Updated: ${results.updated}, Failed: ${results.failed}, Skipped: ${results.skipped}`)
    
    return new Response(JSON.stringify({
      success: true,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('[daily-sync-prices] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
