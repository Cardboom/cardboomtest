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
    
    const { dryRun = true, categories = ['pokemon', 'onepiece', 'one-piece'] } = await req.json().catch(() => ({}))
    
    console.log(`[cleanup-duplicates] Starting cleanup - dryRun: ${dryRun}`)
    
    // Find duplicates - same name + category but different IDs
    const { data: duplicates, error: dupeError } = await supabase
      .rpc('find_duplicate_market_items', { p_categories: categories })
    
    if (dupeError) {
      // Fallback to manual query if RPC doesn't exist
      console.log('[cleanup-duplicates] Using fallback duplicate detection')
    }
    
    // Get all items grouped by name+category
    const { data: items, error: fetchError } = await supabase
      .from('market_items')
      .select('id, name, category, verified_price, set_name, image_url, created_at')
      .in('category', categories)
      .order('name')
      .order('verified_price', { ascending: false, nullsFirst: false })
    
    if (fetchError) throw fetchError
    
    // Group by name+category
    const groups: Record<string, typeof items> = {}
    for (const item of items || []) {
      const key = `${item.name}|${item.category}`
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    }
    
    const toDelete: string[] = []
    const kept: { id: string; name: string; price: number }[] = []
    
    for (const [key, group] of Object.entries(groups)) {
      if (group.length > 1) {
        // Sort by: has image > has price > newest
        group.sort((a, b) => {
          // Prefer items with images
          if (a.image_url && !b.image_url) return -1
          if (!a.image_url && b.image_url) return 1
          // Then prefer items with verified price
          if (a.verified_price && !b.verified_price) return -1
          if (!a.verified_price && b.verified_price) return 1
          // Then by highest price
          if ((a.verified_price || 0) > (b.verified_price || 0)) return -1
          if ((a.verified_price || 0) < (b.verified_price || 0)) return 1
          // Then by newest
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        
        // Keep the first (best), mark rest for deletion
        const [keeper, ...extras] = group
        kept.push({ id: keeper.id, name: keeper.name, price: keeper.verified_price || 0 })
        
        for (const extra of extras) {
          toDelete.push(extra.id)
        }
      }
    }
    
    console.log(`[cleanup-duplicates] Found ${toDelete.length} duplicates to remove`)
    console.log(`[cleanup-duplicates] Keeping ${kept.length} unique items`)
    
    let deleted = 0
    if (!dryRun && toDelete.length > 0) {
      // Delete in batches
      const batchSize = 50
      for (let i = 0; i < toDelete.length; i += batchSize) {
        const batch = toDelete.slice(i, i + batchSize)
        const { error: deleteError } = await supabase
          .from('market_items')
          .delete()
          .in('id', batch)
        
        if (deleteError) {
          console.error(`[cleanup-duplicates] Delete error:`, deleteError)
        } else {
          deleted += batch.length
        }
      }
      console.log(`[cleanup-duplicates] Deleted ${deleted} duplicates`)
    }
    
    return new Response(JSON.stringify({
      success: true,
      dryRun,
      duplicatesFound: toDelete.length,
      deleted: dryRun ? 0 : deleted,
      sampleDuplicates: toDelete.slice(0, 10),
      sampleKept: kept.slice(0, 10),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('[cleanup-duplicates] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
