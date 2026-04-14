import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2'

// Collectr category IDs and their game mappings
const CATEGORIES: Record<number, { name: string; game: string }> = {
  3: { name: 'Pokemon', game: 'pokemon' },
  4: { name: 'One Piece', game: 'onepiece' },
  5: { name: 'Yu-Gi-Oh!', game: 'yugioh' },
  1: { name: 'Magic: The Gathering', game: 'mtg' },
  6: { name: 'Disney Lorcana', game: 'lorcana' },
  7: { name: 'Digimon', game: 'digimon' },
}

async function firecrawlScrape(apiKey: string, url: string, waitMs = 8000): Promise<any> {
  const response = await fetch(`${FIRECRAWL_V2}/scrape`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, formats: ['markdown', 'links'], onlyMainContent: true, waitFor: waitMs }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `Firecrawl ${response.status}`)
  return data
}

function parseSetLinksFromData(data: any, categoryId: number): Array<{ set_name: string; group_id: string; url: string }> {
  const sets: Array<{ set_name: string; group_id: string; url: string }> = []
  const seen = new Set<string>()

  // Check links array first
  const links: string[] = data?.data?.links || data?.links || []
  const markdown: string = data?.data?.markdown || data?.markdown || ''
  
  // Combined source: links + markdown
  const allText = links.join('\n') + '\n' + markdown

  // Match groupId from URLs
  const urlPattern = /https:\/\/app\.getcollectr\.com\/sets\/category\/(\d+)\/([^?\s"&)]+)\?groupId=(\d+)/g
  let match
  while ((match = urlPattern.exec(allText)) !== null) {
    const groupId = match[3]
    if (seen.has(groupId)) continue
    seen.add(groupId)
    
    const slug = match[2]
    const setName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const url = `https://app.getcollectr.com/sets/category/${categoryId}/${slug}?groupId=${groupId}&cardType=cards`
    sets.push({ set_name: setName, group_id: groupId, url })
  }
  
  // Also try without query params - some links might just have the slug
  const simplePattern = /\/sets\/category\/(\d+)\/([a-z0-9-]+)/g
  while ((match = simplePattern.exec(allText)) !== null) {
    // We can't get groupId from these, skip
  }

  // Parse markdown for named links: [Set Name](url?groupId=xxx)
  const mdLinkPattern = /\[([^\]]{2,60})\]\(https:\/\/app\.getcollectr\.com\/sets\/category\/\d+\/([^?)]+)\?groupId=(\d+)[^)]*\)/g
  while ((match = mdLinkPattern.exec(markdown)) !== null) {
    const groupId = match[3]
    if (seen.has(groupId)) continue
    seen.add(groupId)
    
    const setName = match[1].trim()
    const slug = match[2]
    const url = `https://app.getcollectr.com/sets/category/${categoryId}/${slug}?groupId=${groupId}&cardType=cards`
    
    if (!setName.includes('Login') && !setName.includes('Explore') && !setName.includes('Portfolio')) {
      sets.push({ set_name: setName, group_id: groupId, url })
    }
  }
  
  return sets
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlKey) throw new Error('FIRECRAWL_API_KEY not configured')

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const body = await req.json().catch(() => ({}))
    const { category_id } = body // Process one category at a time to avoid timeout

    if (!category_id || !CATEGORIES[category_id]) {
      return new Response(JSON.stringify({ 
        error: 'Provide category_id (1=MTG, 3=Pokemon, 4=One Piece, 5=Yu-Gi-Oh, 6=Lorcana, 7=Digimon)',
        categories: CATEGORIES 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cat = CATEGORIES[category_id]
    console.log(`[discover-sets] Discovering sets for ${cat.name} (category ${category_id})`)
    
    const setsPageUrl = `https://app.getcollectr.com/sets/category/${category_id}`
    const scraped = await firecrawlScrape(firecrawlKey, setsPageUrl, 10000)
    
    const sets = parseSetLinksFromData(scraped, category_id)
    
    const result = {
      category: cat.name,
      game: cat.game,
      sets_found: sets.length,
      sets_queued: 0,
      errors: [] as string[],
      debug_links_count: (scraped?.data?.links || []).length,
      debug_markdown_length: (scraped?.data?.markdown || scraped?.markdown || '').length,
      debug_preview: (scraped?.data?.markdown || scraped?.markdown || '').slice(0, 500),
      sets_list: sets.map(s => s.set_name),
    }

    for (const set of sets) {
      const { error } = await db
        .from('collectr_scrape_queue')
        .upsert({
          group_id: set.group_id,
          set_name: set.set_name,
          category_id: category_id,
          category_name: cat.name,
          url: set.url,
          status: 'pending',
        }, { onConflict: 'group_id' })
      
      if (error) {
        result.errors.push(`${set.set_name}: ${error.message}`)
      } else {
        result.sets_queued++
      }
    }

    return new Response(JSON.stringify(result), {
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
