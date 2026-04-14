import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2'

const CATEGORIES: Record<string, { id: string; name: string }> = {
  pokemon:  { id: '3',  name: 'Pokemon' },
  onepiece: { id: '68', name: 'One Piece' },
  mtg:      { id: '1',  name: 'Magic The Gathering' },
  yugioh:   { id: '2',  name: 'Yu-Gi-Oh!' },
  lorcana:  { id: '71', name: 'Disney Lorcana' },
  digimon:  { id: '63', name: 'Digimon' },
  dbs:      { id: '80', name: 'Dragon Ball Super' },
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
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
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 5000,
    }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `Firecrawl ${response.status}`)
  return data
}

interface DiscoveredSet {
  setName: string
  groupId: string
  slug: string
  url: string
  cardCount: number
  imageUrl: string | null
}

function parseSetsFromMarkdown(markdown: string, categoryId: string): DiscoveredSet[] {
  const sets: DiscoveredSet[] = []
  const seen = new Set<string>()
  const lines = markdown.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const imgMatch = line.match(/!\[([^\]]*)\]\((https:\/\/public\.getcollectr\.com\/public-assets\/catalog-groups\/group_(\d+)\.[^)]+)\)/)
    if (!imgMatch) continue
    
    const groupId = imgMatch[3]
    const imageUrl = imgMatch[2].split('?')[0]
    if (seen.has(groupId)) continue
    
    let setName = ''
    let cardCount = 0
    
    for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
      const nextLine = lines[j].trim()
      const headingMatch = nextLine.match(/^#{1,3}\s+(.+)$/)
      if (headingMatch && !setName) {
        setName = headingMatch[1].trim()
      }
      const countMatch = nextLine.match(/^(\d+)\s+cards?$/i)
      if (countMatch) {
        cardCount = parseInt(countMatch[1])
        break
      }
    }
    
    if (!setName) setName = imgMatch[1] || `Set ${groupId}`
    seen.add(groupId)
    const slug = slugify(setName)
    
    sets.push({
      setName,
      groupId,
      slug,
      url: `https://app.getcollectr.com/sets/category/${categoryId}/${slug}?groupId=${groupId}&cardType=cards`,
      cardCount,
      imageUrl,
    })
  }
  
  return sets
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlKey) throw new Error('FIRECRAWL_API_KEY not configured')

    // Use INTERNAL Supabase for queue table (created via migration on this project)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = await req.json().catch(() => ({}))
    const { category } = body

    const categoriesToScrape = category
      ? { [category]: CATEGORIES[category] }
      : CATEGORIES

    const results = {
      categories_scraped: 0,
      sets_discovered: 0,
      sets_inserted: 0,
      errors: [] as string[],
      sets: [] as Array<{ name: string; groupId: string; cards: number }>,
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
        const sets = parseSetsFromMarkdown(markdown, cat.id)
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
              card_count: set.cardCount,
            }, { onConflict: 'group_id' })

          if (error) {
            results.errors.push(`${set.setName}: ${error.message}`)
          } else {
            results.sets_inserted++
            results.sets.push({ name: set.setName, groupId: set.groupId, cards: set.cardCount })
          }
        }

        await new Promise(r => setTimeout(r, 2000))
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        results.errors.push(`Category ${cat.name}: ${msg}`)
      }
    }

    console.log('[scrape-collectr-sets] Results:', JSON.stringify(results))
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
