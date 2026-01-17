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

// Extract card number from name (e.g., "Nami EB03-053" -> "EB03-053")
function extractCardInfo(name: string): { setCode?: string; cardNumber?: string } {
  const patterns = [
    /\b([A-Z]{2,4})[-]?(\d{2,4})\b/i,
    /\[.*?\]\s*([A-Z]{2,4})[-]?(\d{2,4})/i,
  ]
  
  for (const pattern of patterns) {
    const match = name.match(pattern)
    if (match) {
      return { setCode: match[1].toUpperCase(), cardNumber: match[2] }
    }
  }
  return {}
}

// Normalize category to game
function categoryToGame(category: string): string {
  const cat = category?.toLowerCase() || ''
  if (cat.includes('pokemon')) return 'pokemon'
  if (cat.includes('magic') || cat === 'mtg') return 'mtg'
  if (cat.includes('one piece') || cat.includes('onepiece') || cat === 'one-piece') return 'onepiece'
  if (cat.includes('yugioh') || cat.includes('yu-gi-oh')) return 'yugioh'
  if (cat.includes('lorcana')) return 'lorcana'
  if (cat.includes('digimon')) return 'digimon'
  return 'other'
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
    const { game, limit = 500, syncFromMarketItems = true } = body

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      linked_price_events: 0,
      errors: [] as string[]
    }

    if (syncFromMarketItems) {
      const tcgCategories = ['pokemon', 'mtg', 'onepiece', 'one-piece', 'yugioh', 'lorcana', 'digimon']
      
      let query = supabase
        .from('market_items')
        .select('id, name, category, set_code, set_name, card_number, variant, rarity, image_url, tcg, external_canonical_key')
        .in('category', tcgCategories)
        .limit(limit)

      if (game) {
        query = query.or(`tcg.eq.${game},category.eq.${game}`)
      }

      const { data: marketItems, error: fetchError } = await query

      if (fetchError) throw fetchError

      console.log(`[sync-catalog-cards] Found ${marketItems?.length || 0} TCG market items`)

      for (const item of marketItems || []) {
        try {

          const itemGame = item.tcg || categoryToGame(item.category)
          if (itemGame === 'other') {
            results.skipped++
            continue
          }
          
          let setCode = item.set_code
          let cardNumber = item.card_number
          
          if (!setCode || !cardNumber) {
            const extracted = extractCardInfo(item.name)
            setCode = setCode || extracted.setCode
            cardNumber = cardNumber || extracted.cardNumber
          }
          
          if (!setCode || !cardNumber) {
            results.skipped++
            continue
          }
          
          results.processed++

          const canonicalKey = item.external_canonical_key || 
            buildCanonicalKey(itemGame, setCode, cardNumber, item.variant || undefined)

          const { data: catalogCard, error: upsertError } = await supabase
            .from('catalog_cards')
            .upsert({
              game: itemGame,
              canonical_key: canonicalKey,
              set_code: setCode,
              set_name: item.set_name,
              card_number: cardNumber,
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
            if (upsertError.code === '23505') {
              const { data: existing } = await supabase
                .from('catalog_cards')
                .select('id')
                .eq('canonical_key', canonicalKey)
                .single()
              
              if (existing) {
                results.updated++
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
