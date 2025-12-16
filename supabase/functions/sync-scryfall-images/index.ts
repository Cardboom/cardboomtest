import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const SCRYFALL_API = 'https://api.scryfall.com'

interface ScryfallCard {
  id: string
  name: string
  set: string
  set_name: string
  collector_number: string
  image_uris?: {
    small: string
    normal: string
    large: string
    png: string
  }
  card_faces?: Array<{
    image_uris?: {
      small: string
      normal: string
      large: string
      png: string
    }
  }>
}

interface ScryfallSearchResult {
  object: string
  total_cards: number
  has_more: boolean
  data: ScryfallCard[]
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
    // Remove foil/holo markers
    .replace(/\b(foil|holo|reverse|etched|borderless|extended|showcase|alt\s*art)\b/gi, '')
    // Remove language markers
    .replace(/\b(japanese|jp|english|en|korean|kr|german|de|french|fr)\b/gi, '')
    // Clean up
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Extract set code from name if present
function extractSetCode(name: string): string | null {
  // Common MTG set patterns in name
  const setPatterns = [
    /\[([A-Z0-9]{3,5})\]/i,  // [SET]
    /\(([A-Z0-9]{3,5})\)/i,  // (SET)
    /\b([A-Z]{3})\b/,        // THREE LETTER CODE
  ]
  
  for (const pattern of setPatterns) {
    const match = name.match(pattern)
    if (match) return match[1].toLowerCase()
  }
  return null
}

async function searchScryfall(query: string, setCode?: string): Promise<ScryfallCard[]> {
  try {
    let searchQuery = `name:"${query}"`
    if (setCode) {
      searchQuery += ` set:${setCode}`
    }
    
    const url = `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(searchQuery)}&unique=prints&order=released`
    
    console.log(`[scryfall] Searching: ${searchQuery}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CardBoom/1.0',
        'Accept': 'application/json',
      }
    })
    
    if (response.status === 404) {
      // No results found
      return []
    }
    
    if (!response.ok) {
      console.error(`[scryfall] API error: ${response.status}`)
      return []
    }
    
    const data: ScryfallSearchResult = await response.json()
    console.log(`[scryfall] Found ${data.total_cards} results`)
    return data.data || []
  } catch (error) {
    console.error(`[scryfall] Search error: ${error}`)
    return []
  }
}

function getImageUrl(card: ScryfallCard): string | null {
  // Try main image_uris first
  if (card.image_uris?.large) return card.image_uris.large
  if (card.image_uris?.normal) return card.image_uris.normal
  
  // For double-faced cards, use the front face
  if (card.card_faces?.[0]?.image_uris?.large) {
    return card.card_faces[0].image_uris.large
  }
  if (card.card_faces?.[0]?.image_uris?.normal) {
    return card.card_faces[0].image_uris.normal
  }
  
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { limit = 500, offset = 0 } = await req.json().catch(() => ({}))
    
    console.log(`[scryfall] Starting MTG image sync (limit: ${limit}, offset: ${offset})...`)
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Get MTG cards missing images
    const { data: mtgCards, error: fetchError } = await supabase
      .from('market_items')
      .select('id, name, set_name, image_url, external_id')
      .eq('category', 'mtg')
      .or('image_url.is.null,image_url.eq.,image_url.ilike.%placeholder%')
      .range(offset, offset + limit - 1)
    
    if (fetchError) {
      console.error('[scryfall] Error fetching cards:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch cards' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`[scryfall] Processing ${mtgCards?.length || 0} MTG cards`)
    
    const results = {
      processed: 0,
      updated: 0,
      notFound: [] as string[],
      errors: 0,
    }
    
    for (const card of mtgCards || []) {
      try {
        results.processed++
        
        // Normalize the card name
        const normalizedName = normalizeCardName(card.name)
        const setCode = extractSetCode(card.name) || (card.set_name ? card.set_name.substring(0, 3).toLowerCase() : null)
        
        // Search Scryfall
        let searchResults = await searchScryfall(normalizedName, setCode || undefined)
        
        // If no results with set, try without
        if (searchResults.length === 0 && setCode) {
          searchResults = await searchScryfall(normalizedName)
        }
        
        // If still no results, try with just the first few words
        if (searchResults.length === 0) {
          const shortName = normalizedName.split(' ').slice(0, 3).join(' ')
          searchResults = await searchScryfall(shortName)
        }
        
        if (searchResults.length === 0) {
          results.notFound.push(card.name)
          continue
        }
        
        // Get image from first result
        const imageUrl = getImageUrl(searchResults[0])
        
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
          console.error(`[scryfall] Error updating ${card.name}:`, updateError)
          results.errors++
        } else {
          results.updated++
          if (results.updated % 50 === 0) {
            console.log(`[scryfall] Progress: ${results.updated} updated`)
          }
        }
        
        // Scryfall rate limit: 10 requests per second, we'll do 5 to be safe
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error) {
        console.error(`[scryfall] Error processing ${card.name}:`, error)
        results.errors++
      }
    }
    
    console.log(`[scryfall] Sync complete. Processed: ${results.processed}, Updated: ${results.updated}, Not Found: ${results.notFound.length}`)
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Updated ${results.updated} of ${results.processed} MTG card images`,
        hasMore: (mtgCards?.length || 0) === limit,
        nextOffset: offset + limit,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('[scryfall] Fatal error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
