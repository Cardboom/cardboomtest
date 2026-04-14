import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2'

const CATEGORIES: Record<number, { name: string; game: string }> = {
  1: { name: 'Magic: The Gathering', game: 'mtg' },
  3: { name: 'Pokemon', game: 'pokemon' },
  4: { name: 'One Piece', game: 'onepiece' },
  5: { name: 'Yu-Gi-Oh!', game: 'yugioh' },
  6: { name: 'Disney Lorcana', game: 'lorcana' },
  7: { name: 'Digimon', game: 'digimon' },
  27: { name: 'Dragon Ball Super', game: 'dbs' },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlKey) throw new Error('FIRECRAWL_API_KEY not configured')

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const body = await req.json().catch(() => ({}))
    const { category_id, mode = 'scrape' } = body

    // Determine which categories to discover
    const catIds = category_id ? [category_id] : Object.keys(CATEGORIES).map(Number)
    
    let totalQueued = 0
    const byCat: Record<string, number> = {}
    const errors: string[] = []

    for (const catId of catIds) {
      const cat = CATEGORIES[catId]
      if (!cat) continue

      console.log(`[discover] Scraping sets page for ${cat.name} (category ${catId})`)

      try {
        // Scrape the category sets page
        const scrapeUrl = `https://app.getcollectr.com/sets?categoryId=${catId}`
        const response = await fetch(`${FIRECRAWL_V2}/scrape`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: scrapeUrl,
            formats: ['markdown', 'links'],
            onlyMainContent: true,
            waitFor: 5000,
          }),
        })

        const scrapeData = await response.json()
        if (!response.ok) {
          errors.push(`${cat.name}: ${scrapeData.error || response.status}`)
          continue
        }

        const markdown = scrapeData.data?.markdown || scrapeData.markdown || ''
        const links: string[] = scrapeData.data?.links || scrapeData.links || []

        console.log(`[discover] ${cat.name}: got ${links.length} links, markdown ${markdown.length} chars`)

        // Strategy 1: Parse links for set URLs
        const setPattern = /\/sets\/category\/(\d+)\/([a-z0-9][a-z0-9-]*[a-z0-9])/
        const seen = new Set<string>()

        for (const link of links) {
          const linkStr = typeof link === 'string' ? link : (link as any)?.url || ''
          const match = linkStr.match(setPattern)
          if (!match) continue

          const foundCatId = parseInt(match[1])
          const slug = match[2]
          if (foundCatId !== catId) continue

          const key = `${catId}:${slug}`
          if (seen.has(key)) continue
          seen.add(key)

          const setName = slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
          const groupId = `${catId}-${slug}`

          const { error } = await db
            .from('collectr_scrape_queue')
            .upsert({
              group_id: groupId,
              set_name: setName,
              category_id: catId,
              category_name: cat.name,
              url: `https://app.getcollectr.com/sets/category/${catId}/${slug}?cardType=cards`,
              status: 'pending',
            }, { onConflict: 'group_id' })

          if (error) {
            errors.push(`${setName}: ${error.message}`)
          } else {
            totalQueued++
            byCat[cat.name] = (byCat[cat.name] || 0) + 1
          }
        }

        // Strategy 2: Parse markdown for set names & links
        // Collectr markdown often has sets as links like [Set Name](/sets/category/4/set-slug)
        const mdLinkPattern = /\[([^\]]+)\]\(\/sets\/category\/(\d+)\/([a-z0-9][a-z0-9-]*[a-z0-9])[^)]*\)/g
        let mdMatch
        while ((mdMatch = mdLinkPattern.exec(markdown)) !== null) {
          const foundCatId = parseInt(mdMatch[2])
          const slug = mdMatch[3]
          if (foundCatId !== catId) continue

          const key = `${catId}:${slug}`
          if (seen.has(key)) continue
          seen.add(key)

          const setName = mdMatch[1].trim() || slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
          const groupId = `${catId}-${slug}`

          const { error } = await db
            .from('collectr_scrape_queue')
            .upsert({
              group_id: groupId,
              set_name: setName,
              category_id: catId,
              category_name: cat.name,
              url: `https://app.getcollectr.com/sets/category/${catId}/${slug}?cardType=cards`,
              status: 'pending',
            }, { onConflict: 'group_id' })

          if (error) {
            errors.push(`${setName}: ${error.message}`)
          } else {
            totalQueued++
            byCat[cat.name] = (byCat[cat.name] || 0) + 1
          }
        }

        // Strategy 3: Also try the Firecrawl map for this specific category URL
        try {
          const mapRes = await fetch(`${FIRECRAWL_V2}/map`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: `https://app.getcollectr.com/sets/category/${catId}`,
              limit: 5000,
              includeSubdomains: false,
            }),
          })
          const mapData = await mapRes.json()
          const mapLinks: any[] = mapData.links || mapData.data?.links || []

          for (const rawLink of mapLinks) {
            const linkStr = typeof rawLink === 'string' ? rawLink : rawLink?.url || ''
            const match = linkStr.match(setPattern)
            if (!match) continue

            const foundCatId = parseInt(match[1])
            const slug = match[2]
            if (foundCatId !== catId) continue

            const key = `${catId}:${slug}`
            if (seen.has(key)) continue
            seen.add(key)

            const setName = slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
            const groupId = `${catId}-${slug}`

            const { error } = await db
              .from('collectr_scrape_queue')
              .upsert({
                group_id: groupId,
                set_name: setName,
                category_id: catId,
                category_name: cat.name,
                url: `https://app.getcollectr.com/sets/category/${catId}/${slug}?cardType=cards`,
                status: 'pending',
              }, { onConflict: 'group_id' })

            if (!error) {
              totalQueued++
              byCat[cat.name] = (byCat[cat.name] || 0) + 1
            }
          }
        } catch (mapErr) {
          console.log(`[discover] Map fallback failed for ${cat.name}`)
        }

        console.log(`[discover] ${cat.name}: queued ${byCat[cat.name] || 0} sets`)
        
        // Rate limit between categories
        await new Promise(r => setTimeout(r, 2000))
      } catch (catErr: unknown) {
        const msg = catErr instanceof Error ? catErr.message : String(catErr)
        errors.push(`${cat.name}: ${msg}`)
      }
    }

    return new Response(JSON.stringify({
      sets_queued: totalQueued,
      by_category: byCat,
      errors: errors.slice(0, 20),
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
