import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CardSearchResult {
  id: string;
  name: string;
  game: string;
  canonical_key: string;
  set_name: string | null;
  image_url: string | null;
  rarity: string | null;
}

interface PriceHistoryPoint {
  snapshot_date: string;
  median_usd: number;
  liquidity_count: number;
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const url = new URL(req.url)
    const path = url.pathname.replace('/catalog-api', '')

    // GET /search?q=&game=&limit=
    if (path === '/search' && req.method === 'GET') {
      const query = url.searchParams.get('q') || ''
      const game = url.searchParams.get('game')
      const limit = parseInt(url.searchParams.get('limit') || '20')

      if (query.length < 2) {
        return new Response(JSON.stringify({ results: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      let queryBuilder = supabase
        .from('catalog_cards')
        .select('id, name, game, canonical_key, set_name, image_url, rarity')
        .ilike('name', `%${query}%`)
        .limit(Math.min(limit, 50))

      if (game) {
        queryBuilder = queryBuilder.eq('game', game)
      }

      const { data, error } = await queryBuilder

      if (error) throw error

      return new Response(JSON.stringify({ results: data || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /cards/:canonicalKey
    if (path.startsWith('/cards/') && req.method === 'GET') {
      const canonicalKey = decodeURIComponent(path.replace('/cards/', ''))

      const { data: card, error: cardError } = await supabase
        .from('catalog_cards')
        .select('*')
        .eq('canonical_key', canonicalKey)
        .maybeSingle()

      if (cardError) throw cardError
      if (!card) {
        return new Response(JSON.stringify({ error: 'Card not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Get latest price
      const { data: latestPrice } = await supabase
        .from('card_price_snapshots')
        .select('*')
        .eq('catalog_card_id', card.id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Get active listings count
      const { count: listingsCount } = await supabase
        .from('catalog_card_listings')
        .select('id', { count: 'exact', head: true })
        .eq('catalog_card_id', card.id)

      return new Response(JSON.stringify({
        card,
        price: latestPrice,
        listings_count: listingsCount || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /cards/:canonicalKey/price-history?range=30
    if (path.includes('/price-history') && req.method === 'GET') {
      const canonicalKey = decodeURIComponent(path.split('/price-history')[0].replace('/cards/', ''))
      const range = parseInt(url.searchParams.get('range') || '30')

      // Get card ID
      const { data: card } = await supabase
        .from('catalog_cards')
        .select('id')
        .eq('canonical_key', canonicalKey)
        .maybeSingle()

      if (!card) {
        return new Response(JSON.stringify({ error: 'Card not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - range)

      const { data: history, error } = await supabase
        .from('card_price_snapshots')
        .select('snapshot_date, median_usd, liquidity_count, confidence')
        .eq('catalog_card_id', card.id)
        .gte('snapshot_date', startDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true })

      if (error) throw error

      return new Response(JSON.stringify({ history: history || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET /cards/:canonicalKey/listings
    if (path.includes('/listings') && req.method === 'GET') {
      const canonicalKey = decodeURIComponent(path.split('/listings')[0].replace('/cards/', ''))

      // Get card ID
      const { data: card } = await supabase
        .from('catalog_cards')
        .select('id')
        .eq('canonical_key', canonicalKey)
        .maybeSingle()

      if (!card) {
        return new Response(JSON.stringify({ error: 'Card not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data: listings, error } = await supabase
        .from('catalog_card_listings')
        .select(`
          listing_id,
          match_confidence,
          listings!inner (
            id, title, price, image_url, condition, status
          )
        `)
        .eq('catalog_card_id', card.id)
        .eq('listings.status', 'active')
        .limit(50)

      if (error) throw error

      return new Response(JSON.stringify({ listings: listings || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[catalog-api] Error:', errMsg)
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
