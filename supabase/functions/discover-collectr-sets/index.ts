import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2'

// Collectr category IDs and their game mappings
const CATEGORIES = [
  { id: 3, name: 'Pokemon', game: 'pokemon' },
  { id: 4, name: 'One Piece', game: 'onepiece' },
  { id: 5, name: 'Yu-Gi-Oh!', game: 'yugioh' },
  { id: 1, name: 'Magic: The Gathering', game: 'mtg' },
  { id: 6, name: 'Disney Lorcana', game: 'lorcana' },
  { id: 7, name: 'Digimon', game: 'digimon' },
]

async function firecrawlScrape(apiKey: string, url: string): Promise<any> {
  const response = await fetch(`${FIRECRAWL_V2}/scrape`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true, waitFor: 5000 }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `Firecrawl ${response.status}`)
  return data
}

function parseSetLinks(markdown: string, categoryId: number): Array<{ set_name: string; group_id: string; url: string }> {
  const sets: Array<{ set_name: string; group_id: string; url: string }> = []
  
  // Collectr sets page has links like:
  // [Set Name](https://app.getcollectr.com/sets/category/3/set-slug?groupId=12345)
  // Or markdown list items with set names and links
  const linkPattern = /\[([^\]]+)\]\((https:\/\/app\.getcollectr\.com\/sets\/category\/\d+\/([^?)]+)\?groupId=(\d+)[^)]*)\)/g
  let match
  while ((match = linkPattern.exec(markdown)) !== null) {
    const setName = match[1].trim()
    const groupId = match[4]
    const url = `https://app.getcollectr.com/sets/category/${categoryId}/${match[3]}?groupId=${groupId}&cardType=cards`
    
    if (setName && groupId && !setName.includes('Login') && !setName.includes('Search')) {
      sets.push({ set_name: setName, group_id: groupId, url })
    }
  }
  
  // Also try plain URL pattern without markdown link syntax
  const urlPattern = /https:\/\/app\.getcollectr\.com\/sets\/category\/(\d+)\/([^?\s"]+)\?groupId=(\d+)/g
  while ((match = urlPattern.exec(markdown)) !== null) {
    const slug = match[2].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const groupId = match[3]
    const catId = parseInt(match[1])
    const url = `https://app.getcollectr.com/sets/category/${catId}/${match[2]}?groupId=${groupId}&cardType=cards`
    
    if (!sets.some(s => s.group_id === groupId)) {
      sets.push({ set_name: slug, group_id: groupId, url })
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
    const { category_ids } = body // e.g. [4, 5, 1, 6] for One Piece, Yu-Gi-Oh, MTG, Lorcana

    const targetCategories = category_ids 
      ? CATEGORIES.filter(c => category_ids.includes(c.id))
      : CATEGORIES

    const results: Record<string, { sets_found: number; sets_queued: number; errors: string[] }> = {}

    for (const cat of targetCategories) {
      results[cat.name] = { sets_found: 0, sets_queued: 0, errors: [] }
      
      try {
        console.log(`[discover-sets] Scraping sets page for ${cat.name} (category ${cat.id})`)
        
        const setsPageUrl = `https://app.getcollectr.com/sets/category/${cat.id}`
        const scraped = await firecrawlScrape(firecrawlKey, setsPageUrl)
        const markdown = scraped.data?.markdown || scraped.markdown || ''
        
        console.log(`[discover-sets] ${cat.name} markdown length: ${markdown.length}`)
        console.log(`[discover-sets] ${cat.name} preview: ${markdown.slice(0, 500)}`)
        
        const sets = parseSetLinks(markdown, cat.id)
        results[cat.name].sets_found = sets.length
        
        if (sets.length === 0) {
          // Store raw markdown for debugging
          results[cat.name].errors.push(`No sets parsed. Markdown preview: ${markdown.slice(0, 300)}`)
          continue
        }
        
        // Queue each set
        for (const set of sets) {
          const { error } = await db
            .from('collectr_scrape_queue')
            .upsert({
              group_id: set.group_id,
              set_name: set.set_name,
              category_id: cat.id,
              category_name: cat.name,
              url: set.url,
              status: 'pending',
            }, { onConflict: 'group_id' })
          
          if (error) {
            results[cat.name].errors.push(`Queue ${set.set_name}: ${error.message}`)
          } else {
            results[cat.name].sets_queued++
          }
        }

        // Rate limit between categories
        await new Promise(r => setTimeout(r, 2000))
      } catch (catErr: unknown) {
        const msg = catErr instanceof Error ? catErr.message : String(catErr)
        results[cat.name].errors.push(msg)
      }
    }

    return new Response(JSON.stringify(results), {
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
