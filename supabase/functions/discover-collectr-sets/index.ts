import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2'

const CATEGORIES: Record<number, { name: string; game: string }> = {
  3: { name: 'Pokemon', game: 'pokemon' },
  4: { name: 'One Piece', game: 'onepiece' },
  5: { name: 'Yu-Gi-Oh!', game: 'yugioh' },
  1: { name: 'Magic: The Gathering', game: 'mtg' },
  6: { name: 'Disney Lorcana', game: 'lorcana' },
  7: { name: 'Digimon', game: 'digimon' },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlKey) throw new Error('FIRECRAWL_API_KEY not configured')

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const body = await req.json().catch(() => ({}))
    const { category_id } = body

    // Use Firecrawl map to discover all set URLs on Collectr
    console.log(`[discover-sets] Using Firecrawl map to discover Collectr set URLs`)
    
    const mapResponse = await fetch(`${FIRECRAWL_V2}/map`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://app.getcollectr.com/sets',
        search: category_id ? `category/${category_id}` : 'sets/category',
        limit: 5000,
        includeSubdomains: false,
      }),
    })
    
    const mapData = await mapResponse.json()
    if (!mapResponse.ok) throw new Error(mapData.error || `Map failed: ${mapResponse.status}`)
    
    const links: string[] = mapData.links || mapData.data?.links || []
    console.log(`[discover-sets] Map found ${links.length} URLs`)

    // Parse set URLs: /sets/category/{catId}/{slug}?groupId={id}
    const setPattern = /\/sets\/category\/(\d+)\/([^?&\s]+)\?groupId=(\d+)/
    const sets: Array<{ category_id: number; slug: string; group_id: string; set_name: string; url: string }> = []
    const seen = new Set<string>()
    
    for (const link of links) {
      const match = link.match(setPattern)
      if (!match) continue
      
      const catId = parseInt(match[1])
      const slug = match[2]
      const groupId = match[3]
      
      if (seen.has(groupId)) continue
      seen.add(groupId)
      
      if (category_id && catId !== category_id) continue
      if (!CATEGORIES[catId]) continue
      
      const setName = slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
      sets.push({
        category_id: catId,
        slug,
        group_id: groupId,
        set_name: setName,
        url: `https://app.getcollectr.com/sets/category/${catId}/${slug}?groupId=${groupId}&cardType=cards`,
      })
    }

    console.log(`[discover-sets] Parsed ${sets.length} unique sets`)

    // Queue them
    let queued = 0
    const errors: string[] = []
    
    for (const set of sets) {
      const cat = CATEGORIES[set.category_id]
      const { error } = await db
        .from('collectr_scrape_queue')
        .upsert({
          group_id: set.group_id,
          set_name: set.set_name,
          category_id: set.category_id,
          category_name: cat.name,
          url: set.url,
          status: 'pending',
        }, { onConflict: 'group_id' })
      
      if (error) {
        errors.push(`${set.set_name}: ${error.message}`)
      } else {
        queued++
      }
    }

    // Group by category for summary
    const byCat: Record<string, number> = {}
    for (const set of sets) {
      const cat = CATEGORIES[set.category_id]
      byCat[cat.name] = (byCat[cat.name] || 0) + 1
    }

    return new Response(JSON.stringify({
      total_urls_found: links.length,
      sets_parsed: sets.length,
      sets_queued: queued,
      by_category: byCat,
      errors,
      sample_urls: links.slice(0, 10),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
