import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APITCG_BASE = 'https://apitcg.com/api'
const PRICECHARTING_BASE = 'https://www.pricecharting.com/api'

// Categories to seed with their API TCG slugs
const TCG_CATEGORIES_TO_SEED: Record<string, { apiSlug: string; limit: number }> = {
  'lorcana': { apiSlug: 'lorcana', limit: 200 },
  'digimon': { apiSlug: 'digimon', limit: 200 },
  'dragon-ball': { apiSlug: 'dragon-ball-fusion', limit: 200 },
  'star-wars': { apiSlug: 'star-wars-unlimited', limit: 200 },
}

interface ApiTcgCard {
  id: string
  name: string
  images?: {
    small?: string
    large?: string
  }
  set?: {
    id: string
    name: string
  }
  rarity?: string
  number?: string
}

async function fetchApiTcgCards(slug: string, limit: number): Promise<ApiTcgCard[]> {
  const allCards: ApiTcgCard[] = []
  let page = 1
  
  while (allCards.length < limit) {
    try {
      const response = await fetch(`${APITCG_BASE}/${slug}/cards?page=${page}&pageSize=50`)
      if (!response.ok) {
        console.error(`[seed] API error for ${slug}: ${response.status}`)
        break
      }
      
      const data = await response.json()
      if (!data.data || data.data.length === 0) break
      
      allCards.push(...data.data)
      console.log(`[seed] Fetched page ${page} for ${slug}: ${data.data.length} cards (total: ${allCards.length})`)
      
      if (page >= data.totalPages) break
      page++
      
      // Rate limit
      await new Promise(r => setTimeout(r, 200))
    } catch (error) {
      console.error(`[seed] Error fetching ${slug}:`, error)
      break
    }
  }
  
  return allCards.slice(0, limit)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const priceChartingKey = Deno.env.get('PRICECHARTING_API_KEY')
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { category, limit = 100 } = await req.json().catch(() => ({}))
    
    const categoriesToProcess = category 
      ? { [category]: TCG_CATEGORIES_TO_SEED[category] || { apiSlug: category, limit } }
      : TCG_CATEGORIES_TO_SEED
    
    const results = {
      totalSeeded: 0,
      byCategory: {} as Record<string, number>,
      errors: [] as string[],
    }
    
    for (const [dbCategory, config] of Object.entries(categoriesToProcess)) {
      console.log(`[seed] Processing ${dbCategory} (API: ${config.apiSlug})...`)
      
      // Check existing count
      const { count: existingCount } = await supabase
        .from('market_items')
        .select('*', { count: 'exact', head: true })
        .eq('category', dbCategory)
      
      console.log(`[seed] ${dbCategory} has ${existingCount || 0} existing items`)
      
      // Fetch cards from API TCG
      const cards = await fetchApiTcgCards(config.apiSlug, config.limit)
      
      if (cards.length === 0) {
        console.log(`[seed] No cards found for ${dbCategory}`)
        continue
      }
      
      let seeded = 0
      
      for (const card of cards) {
        try {
          // Check if already exists
          const { data: existing } = await supabase
            .from('market_items')
            .select('id')
            .eq('category', dbCategory)
            .ilike('name', card.name)
            .limit(1)
            .single()
          
          if (existing) continue
          
          // Get image URL
          const imageUrl = card.images?.large || card.images?.small || null
          
          // Try to get price from PriceCharting
          let price = 5.00 // Default price
          let externalId: string | null = null
          
          if (priceChartingKey) {
            try {
              const pcResponse = await fetch(
                `${PRICECHARTING_BASE}/products?t=${priceChartingKey}&q=${encodeURIComponent(card.name)}&limit=1`
              )
              if (pcResponse.ok) {
                const pcData = await pcResponse.json()
                if (pcData.products?.[0]) {
                  const product = pcData.products[0]
                  const pcPrice = product['loose-price'] || product['graded-price']
                  if (pcPrice) {
                    price = pcPrice / 100
                    externalId = `pc:${product.id}`
                  }
                }
              }
            } catch (pcError) {
              // Ignore PriceCharting errors
            }
          }
          
          // Insert the card
          const { error: insertError } = await supabase
            .from('market_items')
            .insert({
              name: card.name,
              category: dbCategory,
              image_url: imageUrl,
              current_price: price,
              set_name: card.set?.name || null,
              rarity: card.rarity || null,
              external_id: externalId,
              data_source: externalId ? 'pricecharting' : 'apitcg',
              price_confidence: 'low',
              liquidity: 'low',
            })
          
          if (insertError) {
            results.errors.push(`${dbCategory}:${card.name}: ${insertError.message}`)
          } else {
            seeded++
          }
          
          // Rate limit
          await new Promise(r => setTimeout(r, 100))
          
        } catch (cardError) {
          results.errors.push(`${dbCategory}:${card.name}: ${cardError}`)
        }
      }
      
      results.byCategory[dbCategory] = seeded
      results.totalSeeded += seeded
      console.log(`[seed] Seeded ${seeded} cards for ${dbCategory}`)
    }
    
    console.log(`[seed] Complete. Total seeded: ${results.totalSeeded}`)
    
    return new Response(JSON.stringify({
      success: true,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('[seed] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})