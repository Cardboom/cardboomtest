import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { limit = 500 } = await req.json().catch(() => ({}))

    // Get items with missing attributes
    const { data: items, error: fetchError } = await supabase
      .from('market_items')
      .select('id, name, category, set_name, rarity, series')
      .or('set_name.is.null,rarity.is.null,series.is.null')
      .limit(limit)

    if (fetchError) throw fetchError

    const results = {
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    }

    for (const item of items || []) {
      results.processed++

      try {
        const updates: Record<string, string> = {}
        const name = item.name || ''
        const category = item.category || ''

        // Parse set name from item name if missing
        if (!item.set_name && name) {
          // Common patterns: "Card Name - Set Name" or "Card Name (Set)"
          const setMatch = name.match(/[-–]\s*([^-–]+)$/) || name.match(/\(([^)]+)\)/)
          if (setMatch) {
            updates.set_name = setMatch[1].trim()
          }
        }

        // Infer rarity from name patterns
        if (!item.rarity && name) {
          const rarityPatterns: Record<string, RegExp> = {
            'Secret Rare': /secret\s*rare|SR\b/i,
            'Ultra Rare': /ultra\s*rare|UR\b/i,
            'Super Rare': /super\s*rare/i,
            'Rare': /\brare\b(?!\s*(holo|ultra|secret|super))/i,
            'Rare Holo': /rare\s*holo|holo\s*rare/i,
            'Common': /\bcommon\b/i,
            'Uncommon': /\buncommon\b/i,
            'Mythic': /\bmythic\b/i,
            'Legendary': /\blegendary\b/i,
          }

          for (const [rarity, pattern] of Object.entries(rarityPatterns)) {
            if (pattern.test(name)) {
              updates.rarity = rarity
              break
            }
          }
        }

        // Infer series/subcategory from category
        if (!item.series && category) {
          const seriesMap: Record<string, string> = {
            'pokemon': 'Pokémon TCG',
            'yugioh': 'Yu-Gi-Oh!',
            'magic': 'Magic: The Gathering',
            'one-piece': 'One Piece TCG',
            'lorcana': 'Disney Lorcana',
            'sports': 'Sports Cards',
            'figures': 'Collectible Figures',
          }
          
          for (const [key, series] of Object.entries(seriesMap)) {
            if (category.toLowerCase().includes(key)) {
              updates.series = series
              break
            }
          }
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('market_items')
            .update(updates)
            .eq('id', item.id)

          if (updateError) {
            results.errors.push(`${item.id}: ${updateError.message}`)
          } else {
            results.updated++
          }
        } else {
          results.skipped++
        }
      } catch (err) {
        results.errors.push(`${item.id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    console.log(`[backfill-attributes] Processed: ${results.processed}, Updated: ${results.updated}, Skipped: ${results.skipped}`)

    return new Response(JSON.stringify({
      success: true,
      ...results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[backfill-attributes] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
