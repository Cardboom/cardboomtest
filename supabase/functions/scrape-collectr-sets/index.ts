import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2'

// Known Collectr category IDs
const CATEGORIES: Record<string, { id: string; name: string }> = {
  pokemon:  { id: '3',  name: 'Pokemon' },
  onepiece: { id: '5',  name: 'One Piece' },
  mtg:      { id: '1',  name: 'Magic The Gathering' },
  yugioh:   { id: '2',  name: 'Yu-Gi-Oh' },
  lorcana:  { id: '6',  name: 'Lorcana' },
  digimon:  { id: '7',  name: 'Digimon' },
}

async function firecrawlScrape(apiKey: string, url: string): Promise<any> {
  const response = await fetch(`${FIRECRAWL_V2}/scrape`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'links'],
      onlyMainContent: true,
      waitFor: 3000,
    }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `Firecrawl ${response.status}`)
  return data
}

function parseSetLinks(markdown: string, links: string[], categoryId: string): Array<{
  setName: string; groupId: string; slug: string; url: string
}> {
  const results: Array<{ setName: string; groupId: string; slug: string; url: string }> = []
  const seen = new Set<string>()

  // Parse links that match the pattern /sets/category/{id}/{slug}?groupId={id}
  for (const link of links) {
    const match = link.match(/\/sets\/category\/(\d+)\/([^?]+)\?groupId=(\d+)/)
    if (match && match[1] === categoryId) {
      const slug = match[2]
      const groupId = match[3]
      if (!seen.has(groupId)) {
        seen.add(groupId)
        // Derive set name from slug
        const setName = slug
          .replace(/-/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase())
        results.push({
          setName,
          groupId,
          slug,
          url: `https://app.getcollectr.com/sets/category/${categoryId}/${slug}?groupId=${groupId}&cardType=cards`,
        })
      }
    }
  }

  // Also try markdown patterns: [Set Name](url)
  const mdPattern = /\[([^\]]+)\]\(([^)]*\/sets\/category\/(\d+)\/([^?]+)\?groupId=(\d+)[^)]*)\)/g
  let mdMatch
  while ((mdMatch = mdPattern.exec(markdown)) !== null) {
    if (mdMatch[3] === categoryId && !seen.has(mdMatch[5])) {
      seen.add(mdMatch[5])
      results.push({
        setName: mdMatch[1].trim(),
        groupId: mdMatch[5],
        slug: mdMatch[4],
        url: `https://app.getcollectr.com/sets/category/${categoryId}/${mdMatch[4]}?groupId=${mdMatch[5]}&cardType=cards`,
      })
    }
  }

  return results
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlKey) throw new Error('FIRECRAWL_API_KEY not configured')

    const supabaseUrl = Deno.env.get('EXTERNAL_SUPABASE_URL')!
    const supabaseKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = await req.json().catch(() => ({}))
    const { category } = body // e.g. 'pokemon', 'onepiece', or undefined for all

    const categoriesToScrape = category
      ? { [category]: CATEGORIES[category] }
      : CATEGORIES

    const results = {
      categories_scraped: 0,
      sets_discovered: 0,
      sets_inserted: 0,
      errors: [] as string[],
    }

    for (const [key, cat] of Object.entries(categoriesToScrape)) {
      if (!cat) {
        results.errors.push(`Unknown category: ${key}`)
        continue
      }

      try {
        console.log(`[scrape-collectr-sets] Scraping category: ${cat.name} (id=${cat.id})`)
        const categoryUrl = `https://app.getcollectr.com/sets/category/${cat.id}`
        const scraped = await firecrawlScrape(firecrawlKey, categoryUrl)

        const markdown = scraped.data?.markdown || scraped.markdown || ''
        const links = scraped.data?.links || scraped.links || []

        const sets = parseSetLinks(markdown, links, cat.id)
        console.log(`[scrape-collectr-sets] Found ${sets.length} sets for ${cat.name}`)

        results.categories_scraped++
        results.sets_discovered += sets.length

        for (const set of sets) {
          const { error } = await supabase
            .from('collectr_scrape_queue')
            .upsert({
              category_id: cat.id,
              category_name: cat.name,
              set_name: set.setName,
              group_id: set.groupId,
              slug: set.slug,
              url: set.url,
            }, { onConflict: 'group_id' })

          if (error) {
            results.errors.push(`${set.setName}: ${error.message}`)
          } else {
            results.sets_inserted++
          }
        }

        // Throttle between categories
        await new Promise(r => setTimeout(r, 2000))
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        results.errors.push(`Category ${cat.name}: ${msg}`)
      }
    }

    console.log('[scrape-collectr-sets] Results:', results)
    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[scrape-collectr-sets] Error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
