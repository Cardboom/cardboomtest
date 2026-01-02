import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CardmarketPriceHistory {
  date: string;
  price: number;
}

interface SyncRequest {
  category?: string;
  cardId?: number;
  marketItemId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

// Cardmarket TCG categories supported by the RapidAPI endpoint
const CARDMARKET_GAME_MAP: Record<string, string> = {
  'pokemon': 'pokemon',
  'lorcana': 'lorcana',
  'mtg': 'magic-the-gathering',
  'yugioh': 'yugioh',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const cardmarketKey = Deno.env.get('CARDMARKET_RAPIDAPI_KEY')
    
    if (!cardmarketKey) {
      throw new Error('CARDMARKET_RAPIDAPI_KEY not configured')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { category, cardId, marketItemId, dateFrom, dateTo, limit = 50 }: SyncRequest = await req.json().catch(() => ({}))
    
    console.log(`[sync-cardmarket-prices] Starting sync - category: ${category}, cardId: ${cardId}, limit: ${limit}`)
    
    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
    }
    
    // If specific cardId provided, fetch price history for that card
    if (cardId && marketItemId) {
      const game = category ? CARDMARKET_GAME_MAP[category] || 'pokemon' : 'pokemon'
      
      // Calculate date range (default to last 30 days)
      const now = new Date()
      const from = dateFrom || new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0]
      const to = dateTo || new Date().toISOString().split('T')[0]
      
      try {
        const historyUrl = `https://cardmarket-api-tcg.p.rapidapi.com/${game}/cards/${cardId}/history-prices?id=${cardId}&date_from=${from}&date_to=${to}`
        
        console.log(`[sync-cardmarket-prices] Fetching history from: ${historyUrl}`)
        
        const response = await fetch(historyUrl, {
          headers: {
            'X-RapidAPI-Key': cardmarketKey,
            'X-RapidAPI-Host': 'cardmarket-api-tcg.p.rapidapi.com',
          }
        })
        
        if (!response.ok) {
          throw new Error(`Cardmarket API error: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Parse and store price history
        if (data.prices || data.history || Array.isArray(data)) {
          const priceHistory = data.prices || data.history || data
          
          for (const entry of priceHistory) {
            const price = entry.price || entry.average || entry.trend || entry.low
            const date = entry.date || entry.timestamp
            
            if (price && date) {
              await supabase.from('price_history').upsert({
                market_item_id: marketItemId,
                price: price,
                source: 'cardmarket',
                recorded_at: new Date(date).toISOString(),
              }, {
                onConflict: 'market_item_id,recorded_at',
              })
              results.synced++
            }
          }
          
          // Update market item with latest price
          if (priceHistory.length > 0) {
            const latestPrice = priceHistory[priceHistory.length - 1]
            const price = latestPrice.price || latestPrice.average || latestPrice.trend
            
            if (price) {
              await supabase
                .from('market_items')
                .update({
                  current_price: price,
                  data_source: 'cardmarket',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', marketItemId)
            }
          }
        }
      } catch (error) {
        console.error(`[sync-cardmarket-prices] Error fetching history:`, error)
        results.failed++
        results.errors.push(error instanceof Error ? error.message : 'Unknown error')
      }
      
      return new Response(JSON.stringify({
        success: true,
        ...results,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Batch sync: Get items that need Cardmarket price updates
    let query = supabase
      .from('market_items')
      .select('id, name, category, external_id, cardmarket_id')
      .in('category', Object.keys(CARDMARKET_GAME_MAP))
      .not('cardmarket_id', 'is', null)
      .limit(limit)
    
    if (category) {
      query = query.eq('category', category)
    }
    
    const { data: items, error: fetchError } = await query
    
    if (fetchError) throw fetchError
    
    console.log(`[sync-cardmarket-prices] Found ${items?.length || 0} items to sync`)
    
    // Process items in batches
    for (const item of items || []) {
      const game = CARDMARKET_GAME_MAP[item.category] || 'pokemon'
      const cmId = item.cardmarket_id
      
      try {
        // Get current price
        const priceUrl = `https://cardmarket-api-tcg.p.rapidapi.com/${game}/cards/${cmId}`
        
        const response = await fetch(priceUrl, {
          headers: {
            'X-RapidAPI-Key': cardmarketKey,
            'X-RapidAPI-Host': 'cardmarket-api-tcg.p.rapidapi.com',
          }
        })
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        
        const cardData = await response.json()
        
        // Extract price (different fields possible)
        const price = cardData.averageSellPrice || 
                     cardData.trendPrice || 
                     cardData.priceEUR || 
                     cardData.lowestPrice ||
                     cardData.price
        
        if (price && price > 0) {
          await supabase
            .from('market_items')
            .update({
              current_price: price,
              data_source: 'cardmarket',
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id)
          
          // Log to price history
          await supabase.from('price_history').insert({
            market_item_id: item.id,
            price: price,
            source: 'cardmarket',
            recorded_at: new Date().toISOString(),
          })
          
          results.synced++
        }
        
        // Rate limit: 200ms delay between requests
        await new Promise(r => setTimeout(r, 200))
        
      } catch (error) {
        console.error(`[sync-cardmarket-prices] Error syncing ${item.id}:`, error)
        results.failed++
      }
    }
    
    console.log(`[sync-cardmarket-prices] Completed - Synced: ${results.synced}, Failed: ${results.failed}`)
    
    return new Response(JSON.stringify({
      success: true,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('[sync-cardmarket-prices] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})