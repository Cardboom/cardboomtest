import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Build canonical key from card data
function buildCanonicalKey(game: string, setCode: string, cardNumber: string, variant?: string): string {
  const parts = [game.toLowerCase(), setCode.toLowerCase(), cardNumber.toLowerCase()]
  if (variant) parts.push(variant.toLowerCase().replace(/\s+/g, '-'))
  return parts.join(':')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = await req.json().catch(() => ({}))
    const { game, limit = 100, syncFromMarketItems = true } = body

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      linked_price_events: 0,
      errors: [] as string[]
    }

    if (syncFromMarketItems) {
      // Sync catalog_cards from existing market_items
      let query = supabase
        .from('market_items')
        .select('id, name, category, set_code, set_name, card_number, variant, rarity, image_url, tcg, external_canonical_key')
        .not('external_canonical_key', 'is', null)
        .limit(limit)

      if (game) {
        query = query.eq('tcg', game)
      }

      const { data: marketItems, error: fetchError } = await query

      if (fetchError) throw fetchError

      for (const item of marketItems || []) {
        try {
          results.processed++

          // Determine game from tcg or category
          const itemGame = item.tcg || 
            (item.category?.toLowerCase().includes('pokemon') ? 'pokemon' :
             item.category?.toLowerCase().includes('magic') || item.category?.toLowerCase().includes('mtg') ? 'mtg' :
             item.category?.toLowerCase().includes('one piece') ? 'onepiece' :
             item.category?.toLowerCase().includes('yugioh') || item.category?.toLowerCase().includes('yu-gi-oh') ? 'yugioh' :
             'other')

          // Use existing canonical key or build one
          const canonicalKey = item.external_canonical_key || 
            buildCanonicalKey(itemGame, item.set_code || 'unknown', item.card_number || item.id.slice(0, 8), item.variant || undefined)

          // Upsert catalog card
          const { data: catalogCard, error: upsertError } = await supabase
            .from('catalog_cards')
            .upsert({
              game: itemGame,
              canonical_key: canonicalKey,
              set_code: item.set_code,
              set_name: item.set_name,
              card_number: item.card_number,
              variant: item.variant,
              rarity: item.rarity,
              image_url: item.image_url,
              name: item.name,
            }, { 
              onConflict: 'canonical_key',
              ignoreDuplicates: false 
            })
            .select('id')
            .single()

          if (upsertError) {
            // If it's a duplicate key constraint, try to fetch existing
            if (upsertError.code === '23505') {
              const { data: existing } = await supabase
                .from('catalog_cards')
                .select('id')
                .eq('canonical_key', canonicalKey)
                .single()
              
              if (existing) {
                results.updated++
                // Link price events
                const { data: updatedEvents } = await supabase
                  .from('price_events')
                  .update({ catalog_card_id: existing.id })
                  .eq('external_canonical_key', canonicalKey)
                  .is('catalog_card_id', null)
                  .select('id')
                
                results.linked_price_events += updatedEvents?.length || 0
              }
            } else {
              results.errors.push(`${item.name}: ${upsertError.message}`)
            }
            continue
          }

          if (catalogCard) {
            results.created++
            
            // Link existing price_events to this catalog card
            const { data: linkedEvents } = await supabase
              .from('price_events')
              .update({ catalog_card_id: catalogCard.id })
              .eq('external_canonical_key', canonicalKey)
              .is('catalog_card_id', null)
              .select('id')
            
            results.linked_price_events += linkedEvents?.length || 0
          }

        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err)
          results.errors.push(`${item.name}: ${errMsg}`)
        }
      }
    }

    console.log(`[sync-catalog-cards] Results:`, results)

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[sync-catalog-cards] Error:', errMsg)
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
