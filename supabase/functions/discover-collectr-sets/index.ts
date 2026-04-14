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
    const { category_id, mode = 'all' } = body

    const catIds = category_id ? [category_id] : Object.keys(CATEGORIES).map(Number)
    
    let totalQueued = 0
    const byCat: Record<string, number> = {}
    const errors: string[] = []
    const debug: Record<string, any> = {}

    for (const catId of catIds) {
      const cat = CATEGORIES[catId]
      if (!cat) continue

      console.log(`[discover] Discovering sets for ${cat.name} (cat ${catId})`)

      try {
        // Strategy 1: Use Firecrawl search to find set URLs on Collectr
        const searchQueries = [
          `site:app.getcollectr.com sets category ${catId}`,
          `site:app.getcollectr.com ${cat.name} sets groupId`,
        ]
        
        const seen = new Set<string>()
        const setPattern = /\/sets\/category\/(\d+)\/([a-z0-9][a-z0-9-]*[a-z0-9])(?:\?[^\s"')]*groupId=(\d+))?/g

        for (const query of searchQueries) {
          try {
            const searchRes = await fetch(`${FIRECRAWL_V2}/search`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${firecrawlKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ query, limit: 20 }),
            })
            const searchData = await searchRes.json()
            const results = searchData.data || searchData.results || []
            
            console.log(`[discover] Search "${query}": ${results.length} results`)
            
            for (const result of results) {
              const url = result.url || ''
              const text = `${url} ${result.title || ''} ${result.description || ''}`
              
              let m
              const localPattern = new RegExp(setPattern.source, 'g')
              while ((m = localPattern.exec(text)) !== null) {
                const foundCatId = parseInt(m[1])
                const slug = m[2]
                const groupId = m[3]
                
                if (!CATEGORIES[foundCatId]) continue
                const key = groupId ? groupId : `${foundCatId}-${slug}`
                if (seen.has(key)) continue
                seen.add(key)
                
                const setName = slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                const foundCat = CATEGORIES[foundCatId]
                const setUrl = groupId
                  ? `https://app.getcollectr.com/sets/category/${foundCatId}/${slug}?groupId=${groupId}&cardType=cards`
                  : `https://app.getcollectr.com/sets/category/${foundCatId}/${slug}?cardType=cards`

                const { error } = await db
                  .from('collectr_scrape_queue')
                  .upsert({
                    group_id: groupId || `${foundCatId}-${slug}`,
                    set_name: setName,
                    category_id: foundCatId,
                    category_name: foundCat.name,
                    url: setUrl,
                    status: 'pending',
                  }, { onConflict: 'group_id' })

                if (!error) {
                  totalQueued++
                  byCat[foundCat.name] = (byCat[foundCat.name] || 0) + 1
                }
              }
            }
          } catch (searchErr) {
            console.log(`[discover] Search error: ${searchErr}`)
          }
          
          await new Promise(r => setTimeout(r, 1000))
        }

        // Strategy 2: Firecrawl map on the category page
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
          
          debug[`${cat.name}_map`] = { links_count: mapLinks.length }
          
          for (const rawLink of mapLinks) {
            const linkStr = typeof rawLink === 'string' ? rawLink : rawLink?.url || ''
            const localPattern = new RegExp(setPattern.source, 'g')
            let m
            while ((m = localPattern.exec(linkStr)) !== null) {
              const foundCatId = parseInt(m[1])
              const slug = m[2]
              const groupId = m[3]
              
              if (!CATEGORIES[foundCatId]) continue
              const key = groupId ? groupId : `${foundCatId}-${slug}`
              if (seen.has(key)) continue
              seen.add(key)
              
              const setName = slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
              const foundCat = CATEGORIES[foundCatId]
              const setUrl = groupId
                ? `https://app.getcollectr.com/sets/category/${foundCatId}/${slug}?groupId=${groupId}&cardType=cards`
                : `https://app.getcollectr.com/sets/category/${foundCatId}/${slug}?cardType=cards`

              const { error } = await db
                .from('collectr_scrape_queue')
                .upsert({
                  group_id: groupId || `${foundCatId}-${slug}`,
                  set_name: setName,
                  category_id: foundCatId,
                  category_name: foundCat.name,
                  url: setUrl,
                  status: 'pending',
                }, { onConflict: 'group_id' })

              if (!error) {
                totalQueued++
                byCat[foundCat.name] = (byCat[foundCat.name] || 0) + 1
              }
            }
          }
        } catch (mapErr) {
          console.log(`[discover] Map failed for ${cat.name}`)
        }

        // Strategy 3: Scrape the sets page and extract links from rendered content
        try {
          const scrapeRes = await fetch(`${FIRECRAWL_V2}/scrape`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: `https://app.getcollectr.com/sets?categoryId=${catId}`,
              formats: ['markdown', 'links'],
              onlyMainContent: false,
              waitFor: 8000,
            }),
          })
          const scrapeData = await scrapeRes.json()
          const markdown = scrapeData.data?.markdown || scrapeData.markdown || ''
          const links: string[] = (scrapeData.data?.links || scrapeData.links || []).map(
            (l: any) => typeof l === 'string' ? l : l?.url || ''
          ).filter(Boolean)
          
          debug[cat.name] = {
            links_count: links.length,
            markdown_length: markdown.length,
          }
          
          const allText = markdown + '\n' + links.join('\n')
          const localPattern = new RegExp(setPattern.source, 'g')
          let m
          while ((m = localPattern.exec(allText)) !== null) {
            const foundCatId = parseInt(m[1])
            const slug = m[2]
            const groupId = m[3]
            
            if (!CATEGORIES[foundCatId]) continue
            const key = groupId ? groupId : `${foundCatId}-${slug}`
            if (seen.has(key)) continue
            seen.add(key)
            
            const setName = slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
            const foundCat = CATEGORIES[foundCatId]
            const setUrl = groupId
              ? `https://app.getcollectr.com/sets/category/${foundCatId}/${slug}?groupId=${groupId}&cardType=cards`
              : `https://app.getcollectr.com/sets/category/${foundCatId}/${slug}?cardType=cards`

            const { error } = await db
              .from('collectr_scrape_queue')
              .upsert({
                group_id: groupId || `${foundCatId}-${slug}`,
                set_name: setName,
                category_id: foundCatId,
                category_name: foundCat.name,
                url: setUrl,
                status: 'pending',
              }, { onConflict: 'group_id' })

            if (!error) {
              totalQueued++
              byCat[foundCat.name] = (byCat[foundCat.name] || 0) + 1
            }
          }
        } catch (scrapeErr) {
          console.log(`[discover] Scrape failed for ${cat.name}`)
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
