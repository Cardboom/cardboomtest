import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Pokemon TCG API - free, no key required
const POKEMON_TCG_API = 'https://api.pokemontcg.io/v2'

interface PokemonCard {
  id: string
  name: string
  set: {
    id: string
    name: string
    series: string
  }
  number: string
  rarity?: string
  images: {
    small: string
    large: string
  }
}

interface PokemonSearchResult {
  data: PokemonCard[]
  totalCount: number
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
    // Remove holo/foil markers
    .replace(/\b(holo|holofoil|reverse|shadowless|gold\s*star)\b/gi, '')
    // Remove language markers
    .replace(/\b(japanese|jp|english|en|korean|kr)\b/gi, '')
    // Clean up
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Extract Pokemon name (usually first word or two)
function extractPokemonName(name: string): string {
  const normalized = normalizeCardName(name)
  const words = normalized.split(' ')
  
  // Common Pokemon name patterns
  // "charizard vmax" -> "charizard vmax"
  // "pikachu ex" -> "pikachu ex"
  // Handle multi-word Pokemon like "mr mime"
  const multiWordPokemon = ['mr mime', 'mr. mime', 'mime jr', 'type null', 'tapu koko', 'tapu lele', 'tapu bulu', 'tapu fini']
  
  for (const pokemon of multiWordPokemon) {
    if (normalized.includes(pokemon)) {
      return pokemon.replace('.', '')
    }
  }
  
  // Check for suffix types
  const suffixes = ['vmax', 'vstar', 'v', 'ex', 'gx', 'lv.x', 'lvx', 'prime', 'legend', 'break', 'mega']
  for (const suffix of suffixes) {
    if (words.length >= 2 && words[1] === suffix) {
      return `${words[0]} ${suffix}`
    }
  }
  
  return words[0]
}

async function searchPokemonTCG(query: string): Promise<PokemonCard[]> {
  try {
    const url = `${POKEMON_TCG_API}/cards?q=name:"${encodeURIComponent(query)}"&orderBy=-set.releaseDate&pageSize=10`
    
    console.log(`[pokemon] Searching: ${query}`)
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    })
    
    if (!response.ok) {
      console.error(`[pokemon] API error: ${response.status}`)
      return []
    }
    
    const data: PokemonSearchResult = await response.json()
    console.log(`[pokemon] Found ${data.totalCount} results`)
    return data.data || []
  } catch (error) {
    console.error(`[pokemon] Search error: ${error}`)
    return []
  }
}

function getImageUrl(card: PokemonCard): string | null {
  return card.images?.large || card.images?.small || null
}

// Find best match considering set, number, rarity
function findBestMatch(cardName: string, results: PokemonCard[]): PokemonCard | null {
  if (results.length === 0) return null
  
  const normalized = normalizeCardName(cardName)
  
  // Try to find exact name match
  const exactMatch = results.find(r => 
    r.name.toLowerCase() === normalized
  )
  if (exactMatch) return exactMatch
  
  // Check for specific set hints in name
  const setHints: Record<string, string[]> = {
    'base': ['base1', 'base'],
    'jungle': ['jungle'],
    'fossil': ['fossil'],
    'team rocket': ['teamrocket'],
    'neo': ['neo'],
    'skyridge': ['skyridge'],
    'expedition': ['expedition'],
    'aquapolis': ['aquapolis'],
    'hidden fates': ['hiddenfates', 'sma'],
    'evolving skies': ['evolvingskies', 'swsh7'],
    'brilliant stars': ['brilliantstars', 'swsh9'],
    'crown zenith': ['crownzenith'],
  }
  
  for (const [hint, setCodes] of Object.entries(setHints)) {
    if (normalized.includes(hint)) {
      const setMatch = results.find(r => 
        setCodes.some(code => r.set.id.toLowerCase().includes(code))
      )
      if (setMatch) return setMatch
    }
  }
  
  // Return first result with image
  return results.find(r => r.images?.large || r.images?.small) || results[0]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { limit = 500, offset = 0 } = await req.json().catch(() => ({}))
    
    console.log(`[pokemon] Starting Pokemon image sync (limit: ${limit}, offset: ${offset})...`)
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Get Pokemon cards missing images
    const { data: pokemonCards, error: fetchError } = await supabase
      .from('market_items')
      .select('id, name, set_name, image_url, external_id, rarity')
      .eq('category', 'pokemon')
      .or('image_url.is.null,image_url.eq.,image_url.ilike.%placeholder%')
      .range(offset, offset + limit - 1)
    
    if (fetchError) {
      console.error('[pokemon] Error fetching cards:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch cards' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`[pokemon] Processing ${pokemonCards?.length || 0} Pokemon cards`)
    
    const results = {
      processed: 0,
      updated: 0,
      notFound: [] as string[],
      errors: 0,
    }
    
    for (const card of pokemonCards || []) {
      try {
        results.processed++
        
        // Extract Pokemon name from card name
        const pokemonName = extractPokemonName(card.name)
        
        // Search Pokemon TCG API
        let searchResults = await searchPokemonTCG(pokemonName)
        
        // If no results with full name, try just the base name
        if (searchResults.length === 0) {
          const baseName = pokemonName.split(' ')[0]
          if (baseName !== pokemonName) {
            searchResults = await searchPokemonTCG(baseName)
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
          console.error(`[pokemon] Error updating ${card.name}:`, updateError)
          results.errors++
        } else {
          results.updated++
          if (results.updated % 50 === 0) {
            console.log(`[pokemon] Progress: ${results.updated} updated`)
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`[pokemon] Error processing ${card.name}:`, error)
        results.errors++
      }
    }
    
    console.log(`[pokemon] Sync complete. Processed: ${results.processed}, Updated: ${results.updated}, Not Found: ${results.notFound.length}`)
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Updated ${results.updated} of ${results.processed} Pokemon card images`,
        hasMore: (pokemonCards?.length || 0) === limit,
        nextOffset: offset + limit,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('[pokemon] Fatal error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
