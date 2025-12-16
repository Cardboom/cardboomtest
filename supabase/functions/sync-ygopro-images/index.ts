import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const YGOPRO_API = 'https://db.ygoprodeck.com/api/v7'

interface YGOProCard {
  id: number
  name: string
  type: string
  race: string
  card_images: Array<{
    id: number
    image_url: string
    image_url_small: string
    image_url_cropped: string
  }>
  card_sets?: Array<{
    set_name: string
    set_code: string
    set_rarity: string
    set_price: string
  }>
}

interface YGOProResponse {
  data: YGOProCard[]
}

// Normalize card name for better matching
function normalizeCardName(name: string): string {
  return name
    .toLowerCase()
    // Remove grade info
    .replace(/\b(psa|bgs|cgc)\s*\d+(\.\d+)?\b/gi, '')
    // Remove edition info  
    .replace(/\b(1st|first)\s*ed(ition)?\b/gi, '')
    .replace(/\bunlimited\b/gi, '')
    // Remove foil/secret markers
    .replace(/\b(secret|ultra|super|rare|ghost|ultimate|starlight|collector)\s*rare\b/gi, '')
    // Remove language markers
    .replace(/\b(japanese|jp|english|en|korean|kr)\b/gi, '')
    // Clean up
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function searchYGOPro(query: string): Promise<YGOProCard[]> {
  try {
    // YGOPro API uses fuzzy name matching
    const url = `${YGOPRO_API}/cardinfo.php?fname=${encodeURIComponent(query)}`
    
    console.log(`[ygopro] Searching: ${query}`)
    
    const response = await fetch(url)
    
    if (!response.ok) {
      if (response.status === 400) {
        // No results found
        return []
      }
      console.error(`[ygopro] API error: ${response.status}`)
      return []
    }
    
    const data: YGOProResponse = await response.json()
    console.log(`[ygopro] Found ${data.data?.length || 0} results`)
    return data.data || []
  } catch (error) {
    console.error(`[ygopro] Search error: ${error}`)
    return []
  }
}

function getImageUrl(card: YGOProCard): string | null {
  if (card.card_images?.[0]?.image_url) {
    return card.card_images[0].image_url
  }
  return null
}

// Find best match from results
function findBestMatch(cardName: string, results: YGOProCard[]): YGOProCard | null {
  if (results.length === 0) return null
  
  const normalizedSearch = normalizeCardName(cardName)
  
  // Try exact match first
  const exactMatch = results.find(r => 
    r.name.toLowerCase() === normalizedSearch
  )
  if (exactMatch) return exactMatch
  
  // Try contains match
  const containsMatch = results.find(r =>
    r.name.toLowerCase().includes(normalizedSearch) ||
    normalizedSearch.includes(r.name.toLowerCase())
  )
  if (containsMatch) return containsMatch
  
  // Return first result
  return results[0]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { limit = 500, offset = 0 } = await req.json().catch(() => ({}))
    
    console.log(`[ygopro] Starting Yu-Gi-Oh image sync (limit: ${limit}, offset: ${offset})...`)
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Get Yu-Gi-Oh cards missing images
    const { data: yugiohCards, error: fetchError } = await supabase
      .from('market_items')
      .select('id, name, set_name, image_url, external_id')
      .eq('category', 'yugioh')
      .or('image_url.is.null,image_url.eq.,image_url.ilike.%placeholder%')
      .range(offset, offset + limit - 1)
    
    if (fetchError) {
      console.error('[ygopro] Error fetching cards:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch cards' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`[ygopro] Processing ${yugiohCards?.length || 0} Yu-Gi-Oh cards`)
    
    const results = {
      processed: 0,
      updated: 0,
      notFound: [] as string[],
      errors: 0,
    }
    
    for (const card of yugiohCards || []) {
      try {
        results.processed++
        
        // Normalize the card name
        const normalizedName = normalizeCardName(card.name)
        
        // Search YGOPro
        let searchResults = await searchYGOPro(normalizedName)
        
        // If no results, try with shorter name
        if (searchResults.length === 0) {
          const shortName = normalizedName.split(' ').slice(0, 3).join(' ')
          if (shortName !== normalizedName) {
            searchResults = await searchYGOPro(shortName)
          }
        }
        
        if (searchResults.length === 0) {
          results.notFound.push(card.name)
          continue
        }
        
        // Find best match
        const bestMatch = findBestMatch(card.name, searchResults)
        if (!bestMatch) {
          results.notFound.push(card.name)
          continue
        }
        
        const imageUrl = getImageUrl(bestMatch)
        
        if (!imageUrl) {
          results.notFound.push(card.name)
          continue
        }
        
        // Update the card
        const { error: updateError } = await supabase
          .from('market_items')
          .update({
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', card.id)
        
        if (updateError) {
          console.error(`[ygopro] Error updating ${card.name}:`, updateError)
          results.errors++
        } else {
          results.updated++
          if (results.updated % 50 === 0) {
            console.log(`[ygopro] Progress: ${results.updated} updated`)
          }
        }
        
        // Rate limiting - be gentle with free API
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`[ygopro] Error processing ${card.name}:`, error)
        results.errors++
      }
    }
    
    console.log(`[ygopro] Sync complete. Processed: ${results.processed}, Updated: ${results.updated}, Not Found: ${results.notFound.length}`)
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Updated ${results.updated} of ${results.processed} Yu-Gi-Oh card images`,
        hasMore: (yugiohCards?.length || 0) === limit,
        nextOffset: offset + limit,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('[ygopro] Fatal error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
