import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const TCGDEX_API_BASE = 'https://api.tcgdex.net/v2/en'

// Mapping of our card names to TCGdex search terms
const cardSearchMap: Record<string, { search: string; setHint?: string }> = {
  'Charizard 1st Edition Holo': { search: 'Charizard', setHint: 'base1' },
  'Charizard 1st Edition': { search: 'Charizard', setHint: 'base1' },
  'Charizard 1st Edition PSA 10': { search: 'Charizard', setHint: 'base1' },
  'Pikachu Illustrator': { search: 'Pikachu', setHint: 'promo' },
  'Mewtwo GX Rainbow': { search: 'Mewtwo GX', setHint: 'sm35' },
  'Mewtwo Rainbow': { search: 'Mewtwo GX', setHint: 'sm35' },
  'Umbreon VMAX Alt Art': { search: 'Umbreon VMAX', setHint: 'swsh7' },
  'Mew VMAX Alt Art': { search: 'Mew VMAX', setHint: 'swsh8' },
  'Lugia V Alt Art': { search: 'Lugia V', setHint: 'swsh12pt5' },
  'Moonbreon Promo': { search: 'Umbreon', setHint: 'swshp' },
}

interface TCGdexCard {
  id: string
  localId: string
  name: string
  image?: string
  set?: {
    id: string
    name: string
  }
  rarity?: string
}

interface TCGdexSearchResult {
  id: string
  localId: string
  name: string
  image?: string
}

async function searchTCGdex(query: string): Promise<TCGdexSearchResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query)
    const url = `${TCGDEX_API_BASE}/cards?name=${encodedQuery}`
    
    console.log(`[tcgdex] Searching for: ${query}`)
    
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`[tcgdex] API error: ${response.status}`)
      return []
    }
    
    const data = await response.json()
    console.log(`[tcgdex] Found ${data.length} results for: ${query}`)
    return data
  } catch (error) {
    console.error(`[tcgdex] Search error: ${error}`)
    return []
  }
}

async function getCardDetails(cardId: string): Promise<TCGdexCard | null> {
  try {
    const url = `${TCGDEX_API_BASE}/cards/${cardId}`
    
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`[tcgdex] Card details error: ${response.status}`)
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error(`[tcgdex] Card details error: ${error}`)
    return null
  }
}

function getImageUrl(card: TCGdexSearchResult | TCGdexCard): string | null {
  if (card.image) {
    // TCGdex returns base URL, append /high.webp for high quality
    return `${card.image}/high.webp`
  }
  return null
}

async function findBestMatch(
  cardName: string,
  results: TCGdexSearchResult[],
  setHint?: string
): Promise<{ card: TCGdexSearchResult; imageUrl: string } | null> {
  if (results.length === 0) return null
  
  // If we have a set hint, try to find a card from that set
  if (setHint) {
    const matchingSet = results.find(r => r.id.toLowerCase().startsWith(setHint.toLowerCase()))
    if (matchingSet) {
      const imageUrl = getImageUrl(matchingSet)
      if (imageUrl) {
        return { card: matchingSet, imageUrl }
      }
    }
  }
  
  // Otherwise, return the first result with an image
  for (const result of results) {
    const imageUrl = getImageUrl(result)
    if (imageUrl) {
      return { card: result, imageUrl }
    }
  }
  
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[tcgdex] Starting image sync...')
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Get all Pokemon cards from market_items
    const { data: pokemonCards, error: fetchError } = await supabase
      .from('market_items')
      .select('id, name, set_name, image_url, external_id')
      .eq('category', 'pokemon')
    
    if (fetchError) {
      console.error('[tcgdex] Error fetching cards:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch cards' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`[tcgdex] Found ${pokemonCards?.length || 0} Pokemon cards to process`)
    
    const results = {
      updated: 0,
      verified: 0,
      notFound: [] as string[],
      errors: 0,
    }
    
    for (const card of pokemonCards || []) {
      try {
        // Check if we have a mapping for this card
        const mapping = cardSearchMap[card.name]
        const searchTerm = mapping?.search || card.name.split(' ')[0] // Use first word as fallback
        const setHint = mapping?.setHint
        
        // Search TCGdex
        const searchResults = await searchTCGdex(searchTerm)
        
        if (searchResults.length === 0) {
          console.log(`[tcgdex] No results for: ${card.name}`)
          results.notFound.push(card.name)
          continue
        }
        
        // Card exists in TCGdex - verified!
        results.verified++
        
        // Find best matching card with image
        const match = await findBestMatch(card.name, searchResults, setHint)
        
        if (match && (!card.image_url || card.image_url.includes('placeholder'))) {
          // Update the card with the image URL
          const { error: updateError } = await supabase
            .from('market_items')
            .update({
              image_url: match.imageUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', card.id)
          
          if (updateError) {
            console.error(`[tcgdex] Error updating ${card.name}:`, updateError)
            results.errors++
          } else {
            console.log(`[tcgdex] Updated image for: ${card.name}`)
            results.updated++
          }
        }
        
        // Small delay to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 300))
        
      } catch (error) {
        console.error(`[tcgdex] Error processing ${card.name}:`, error)
        results.errors++
      }
    }
    
    console.log(`[tcgdex] Sync complete. Verified: ${results.verified}, Updated: ${results.updated}, Not Found: ${results.notFound.length}, Errors: ${results.errors}`)
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Verified ${results.verified} cards, updated ${results.updated} images`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('[tcgdex] Fatal error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
