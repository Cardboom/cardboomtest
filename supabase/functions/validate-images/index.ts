import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FALLBACK_IMAGE = '/placeholder.svg'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { limit = 100 } = await req.json().catch(() => ({}))

    // Get items with image URLs to validate
    const { data: items, error: fetchError } = await supabase
      .from('market_items')
      .select('id, image_url')
      .not('image_url', 'is', null)
      .not('image_url', 'eq', FALLBACK_IMAGE)
      .not('image_url', 'eq', '')
      .limit(limit)

    if (fetchError) throw fetchError

    const results = {
      checked: 0,
      valid: 0,
      invalid: 0,
      fixed: 0,
      errors: [] as string[]
    }

    for (const item of items || []) {
      results.checked++
      
      try {
        // Skip relative URLs (local assets)
        if (item.image_url.startsWith('/')) {
          results.valid++
          continue
        }

        // Check if URL is valid and accessible
        const response = await fetch(item.image_url, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        })

        if (response.ok) {
          results.valid++
        } else {
          results.invalid++
          
          // Mark as needing replacement - set to null so UI shows placeholder
          const { error: updateError } = await supabase
            .from('market_items')
            .update({ image_url: null })
            .eq('id', item.id)

          if (!updateError) {
            results.fixed++
          } else {
            results.errors.push(`Update failed for ${item.id}: ${updateError.message}`)
          }
        }
      } catch (err) {
        // Network error or timeout - mark as invalid
        results.invalid++
        results.errors.push(`Check failed for ${item.id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    console.log(`[validate-images] Checked: ${results.checked}, Valid: ${results.valid}, Invalid: ${results.invalid}, Fixed: ${results.fixed}`)

    return new Response(JSON.stringify({
      success: true,
      ...results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[validate-images] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
