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
  80: { name: 'Dragon Ball Super', game: 'dbs' },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlKey) throw new Error('FIRECRAWL_API_KEY not configured')

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const body = await req.json().catch(() => ({}))
    const { category_id } = body

    const catIds = category_id ? [category_id] : Object.keys(CATEGORIES).map(Number)
    
    let totalQueued = 0
    const byCat: Record<string, number> = {}
    const errors: string[] = []
    const debug: Record<string, any> = {}

    for (const catId of catIds) {
      const cat = CATEGORIES[catId]
      if (!cat) continue

      console.log(`[discover] Scraping sets for ${cat.name} (cat ${catId})`)

      try {
        // Scrape the category page with Firecrawl (handles JS rendering)
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
            onlyMainContent: false,
            waitFor: 8000,
          }),
        })

        const scrapeData = await response.json()
        if (!response.ok) {
          errors.push(`${cat.name}: scrape failed ${scrapeData.error || response.status}`)
          continue
        }

        const markdown = scrapeData.data?.markdown || scrapeData.markdown || ''
        const links: string[] = (scrapeData.data?.links || scrapeData.links || []).map(
          (l: any) => typeof l === 'string' ? l : l?.url || ''
        ).filter(Boolean)

        console.log(`[discover] ${cat.name}: ${links.length} links, ${markdown.length} chars md`)
        
        // Store debug info
        debug[cat.name] = {
          links_count: links.length,
          markdown_length: markdown.length,
          sample_links: links.slice(0, 10),
          markdown_preview: markdown.substring(0, 500),
        }

        const seen = new Set<string>()

        // Parse both absolute and relative set URLs from links AND markdown
        const setPatterns = [
          /\/sets\/category\/(\d+)\/([a-z0-9][a-z0-9-]*[a-z0-9])/,
          /app\.getcollectr\.com\/sets\/category\/(\d+)\/([a-z0-9][a-z0-9-]*[a-z0-9])/,
        ]

        const allStrings = [...links, ...markdown.split(/[\s\n()"']/)]

        for (const str of allStrings) {
          for (const pattern of setPatterns) {
            const match = str.match(pattern)
            if (!match) continue

            const foundCatId = parseInt(match[1])
            const slug = match[2]
            if (category_id && foundCatId !== catId) continue
            if (!CATEGORIES[foundCatId]) continue

            const key = `${foundCatId}:${slug}`
            if (seen.has(key)) continue
            seen.add(key)

            const setName = slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
            const groupId = `${foundCatId}-${slug}`
            const foundCat = CATEGORIES[foundCatId]

            const { error } = await db
              .from('collectr_scrape_queue')
              .upsert({
                group_id: groupId,
                set_name: setName,
                category_id: foundCatId,
                category_name: foundCat.name,
                url: `https://app.getcollectr.com/sets/category/${foundCatId}/${slug}?cardType=cards`,
                status: 'pending',
              }, { onConflict: 'group_id' })

            if (error) {
              errors.push(`${setName}: ${error.message}`)
            } else {
              totalQueued++
              byCat[foundCat.name] = (byCat[foundCat.name] || 0) + 1
            }
          }
        }

        // Also try Firecrawl map on the category-specific URL
        try {
          const mapRes = await fetch(`${FIRECRAWL_V2}/map`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: `https://app.getcollectr.com/sets`,
              search: cat.game,
              limit: 5000,
              includeSubdomains: false,
            }),
          })
          const mapData = await mapRes.json()
          const mapLinks: any[] = (mapData.links || mapData.data?.links || [])

          for (const rawLink of mapLinks) {
            const linkStr = typeof rawLink === 'string' ? rawLink : rawLink?.url || ''
            for (const pattern of setPatterns) {
              const match = linkStr.match(pattern)
              if (!match) continue

              const foundCatId = parseInt(match[1])
              const slug = match[2]
              if (!CATEGORIES[foundCatId]) continue

              const key = `${foundCatId}:${slug}`
              if (seen.has(key)) continue
              seen.add(key)

              const setName = slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
              const groupId = `${foundCatId}-${slug}`
              const foundCat = CATEGORIES[foundCatId]

              const { error } = await db
                .from('collectr_scrape_queue')
                .upsert({
                  group_id: groupId,
                  set_name: setName,
                  category_id: foundCatId,
                  category_name: foundCat.name,
                  url: `https://app.getcollectr.com/sets/category/${foundCatId}/${slug}?cardType=cards`,
                  status: 'pending',
                }, { onConflict: 'group_id' })

              if (!error) {
                totalQueued++
                byCat[foundCat.name] = (byCat[foundCat.name] || 0) + 1
              }
            }
          }
          debug[`${cat.name}_map`] = { links_count: mapLinks.length }
        } catch (mapErr) {
          console.log(`[discover] Map failed for ${cat.name}`)
        }

        console.log(`[discover] ${cat.name}: queued ${byCat[cat.name] || 0} sets`)
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
      debug,
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
