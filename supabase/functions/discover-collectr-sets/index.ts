import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2'

const CATEGORIES: Record<number, { name: string; game: string }> = {
  1: { name: 'Magic: The Gathering', game: 'mtg' },
  2: { name: 'Yu-Gi-Oh!', game: 'yugioh' },
  3: { name: 'Pokemon', game: 'pokemon' },
  63: { name: 'Digimon', game: 'digimon' },
  68: { name: 'One Piece', game: 'onepiece' },
  71: { name: 'Disney Lorcana', game: 'lorcana' },
  80: { name: 'Dragon Ball Super', game: 'dbs' },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlKey) throw new Error('FIRECRAWL_API_KEY not configured')

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const body = await req.json().catch(() => ({}))
    const { category_id, search_term } = body

    // Use Firecrawl map to discover set URLs
    const mapBody: any = {
      url: 'https://app.getcollectr.com/sets',
      limit: 5000,
      includeSubdomains: false,
    }
    if (search_term) mapBody.search = search_term
    
    const mapResponse = await fetch(`${FIRECRAWL_V2}/map`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mapBody),
    })
    
    const mapData = await mapResponse.json()
    if (!mapResponse.ok) throw new Error(mapData.error || `Map failed: ${mapResponse.status}`)
    
    // Links can be objects or strings
    const rawLinks: any[] = mapData.links || mapData.data?.links || []
    const links: string[] = rawLinks.map((l: any) => typeof l === 'string' ? l : l?.url || '').filter(Boolean)
    
    console.log(`[discover-sets] Map found ${links.length} URLs`)

    // Parse set URLs: /sets/category/{catId}/{slug}
    const setPattern = /\/sets\/category\/(\d+)\/([a-z0-9][a-z0-9-]+[a-z0-9])/
    const sets: Array<{ category_id: number; slug: string; set_name: string; url: string }> = []
    const seen = new Set<string>()
    
    for (const link of links) {
      const match = link.match(setPattern)
      if (!match) continue
      
      const catId = parseInt(match[1])
      const slug = match[2]
      const key = `${catId}:${slug}`
      
      if (seen.has(key)) continue
      seen.add(key)
      
      if (category_id && catId !== category_id) continue
      if (!CATEGORIES[catId]) continue
      
      const setName = slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
      
      // Get groupId from URL if present, otherwise use slug as group_id
      const groupIdMatch = link.match(/groupId=(\d+)/)
      const groupId = groupIdMatch ? groupIdMatch[1] : `slug-${catId}-${slug}`
      
      sets.push({
        category_id: catId,
        slug,
        set_name: setName,
        url: `https://app.getcollectr.com/sets/category/${catId}/${slug}?cardType=cards`,
      })
    }

    console.log(`[discover-sets] Parsed ${sets.length} unique sets`)

    let queued = 0
    const errors: string[] = []
    
    for (const set of sets) {
      const cat = CATEGORIES[set.category_id]
      // Use slug-catId as group_id since map doesn't return groupId
      const groupId = `${set.category_id}-${set.slug}`
      
      const { error } = await db
        .from('collectr_scrape_queue')
        .upsert({
          group_id: groupId,
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
      errors: errors.slice(0, 10),
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
