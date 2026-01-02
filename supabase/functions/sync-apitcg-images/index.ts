import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const APITCG_BASE = 'https://apitcg.com/api'
const DDRAGON_VERSION = '14.24.1' // League of Legends Data Dragon version
const DDRAGON_BASE = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}`

// Map our database categories to API TCG slugs
const categoryToApiSlug: Record<string, string> = {
  'lol-riftbound': 'riftbound',
  'one-piece': 'one-piece',
  'mtg': 'magic',
  'lorcana': 'lorcana',
  'digimon': 'digimon',
  'dragon-ball': 'dragon-ball-fusion',
  'star-wars': 'star-wars-unlimited',
}

// Riftbound champion name to Data Dragon champion key mapping for fallback images
const riftboundToDDragon: Record<string, string> = {
  'Ahri': 'Ahri',
  'Jinx': 'Jinx',
  'Yasuo': 'Yasuo',
  'Teemo': 'Teemo',
  'Lux': 'Lux',
  'Viktor': 'Viktor',
  'Lee Sin': 'LeeSin',
  'Volibear': 'Volibear',
  "Kai'Sa": 'Kaisa',
  'Darius': 'Darius',
  'Sett': 'Sett',
  'Miss Fortune': 'MissFortune',
  'Leona': 'Leona',
  'Annie': 'Annie',
  'Garen': 'Garen',
  'Master Yi': 'MasterYi',
  'Thresh': 'Thresh',
  'Zed': 'Zed',
}

// Card name mapping to search terms
const cardSearchMap: Record<string, string> = {
  // Riftbound - expanded mappings
  'Ahri - Nine-Tailed Fox': 'Ahri',
  'Ahri Nine-Tailed Fox': 'Ahri',
  'Jinx - Loose Cannon': 'Jinx',
  'Jinx Loose Cannon': 'Jinx',
  'Jinx - Powder': 'Jinx',
  'Yasuo - Unforgiven': 'Yasuo',
  'Yasuo Unforgiven': 'Yasuo',
  'Teemo - Swift Scout': 'Teemo',
  'Teemo Swift Scout': 'Teemo',
  'Lux - Lady of Luminosity': 'Lux',
  'Lux Lady of Luminosity': 'Lux',
  'Viktor - Machine Herald': 'Viktor',
  'Viktor Machine Herald': 'Viktor',
  'Lee Sin - Blind Monk': 'Lee Sin',
  'Lee Sin Blind Monk': 'Lee Sin',
  'Volibear - Relentless Storm': 'Volibear',
  'Volibear Relentless Storm': 'Volibear',
  "Kai'Sa - Daughter of the Void": "Kai'Sa",
  "Kai'Sa Daughter of the Void": "Kai'Sa",
  'Darius - Hand of Noxus': 'Darius',
  'Darius Hand of Noxus': 'Darius',
  'Sett - Boss': 'Sett',
  'Sett Boss': 'Sett',
  'Miss Fortune - Bounty Hunter': 'Miss Fortune',
  'Miss Fortune Bounty Hunter': 'Miss Fortune',
  'Leona - Radiant Dawn': 'Leona',
  'Leona Radiant Dawn': 'Leona',
  'Annie - Dark Child': 'Annie',
  'Annie Dark Child': 'Annie',
  'Garen - Might of Demacia': 'Garen',
  'Garen Might of Demacia': 'Garen',
  'Master Yi - Wuju Bladesman': 'Master Yi',
  'Master Yi Wuju Bladesman': 'Master Yi',
  'Thresh - Chain Warden': 'Thresh',
  'Thresh Chain Warden': 'Thresh',
  'Zed - Master of Shadows': 'Zed',
  'Zed Master of Shadows': 'Zed',
  // One Piece
  'Monkey D. Luffy': 'Luffy',
  'Monkey D. Luffy Leader': 'Luffy',
  'Roronoa Zoro - Three Sword': 'Zoro',
  'Roronoa Zoro Alt Art': 'Zoro',
  'Shanks': 'Shanks',
  'Shanks Leader': 'Shanks',
  'Nami - Navigator': 'Nami',
  'Trafalgar Law - Surgeon': 'Law',
  'Kaido - Dragon Form': 'Kaido',
}

// Get Data Dragon splash art URL for a champion
function getDDragonImage(championKey: string): string {
  return `${DDRAGON_BASE}/img/champion/splash/${championKey}_0.jpg`
}

interface ApiTcgCard {
  id: string
  name: string
  images?: {
    small?: string
    large?: string
  }
  set?: {
    id: string
    name: string
  }
}

interface ApiTcgResponse {
  page: number
  total: number
  totalPages: number
  data: ApiTcgCard[]
}

async function searchApiTcg(tcgSlug: string, searchTerm: string): Promise<ApiTcgCard[]> {
  try {
    const encodedSearch = encodeURIComponent(searchTerm)
    const url = `${APITCG_BASE}/${tcgSlug}/cards?name=${encodedSearch}`
    
    console.log(`[apitcg] Searching ${tcgSlug} for: ${searchTerm}`)
    
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`[apitcg] API error: ${response.status}`)
      return []
    }
    
    const data: ApiTcgResponse = await response.json()
    console.log(`[apitcg] Found ${data.data?.length || 0} results for: ${searchTerm}`)
    return data.data || []
  } catch (error) {
    console.error(`[apitcg] Search error: ${error}`)
    return []
  }
}

function getBestImage(card: ApiTcgCard): string | null {
  if (card.images?.large) return card.images.large
  if (card.images?.small) return card.images.small
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[apitcg] Starting multi-TCG image sync...')
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const results = {
      verified: 0,
      updated: 0,
      notFound: [] as string[],
      errors: 0,
      byCategory: {} as Record<string, { verified: number; updated: number }>
    }
    
    // Process each category
    for (const [dbCategory, apiSlug] of Object.entries(categoryToApiSlug)) {
      console.log(`[apitcg] Processing category: ${dbCategory} -> ${apiSlug}`)
      
      results.byCategory[dbCategory] = { verified: 0, updated: 0 }
      
      // Get cards from this category
      const { data: cards, error: fetchError } = await supabase
        .from('market_items')
        .select('id, name, set_name, image_url, external_id')
        .eq('category', dbCategory)
      
      if (fetchError) {
        console.error(`[apitcg] Error fetching ${dbCategory} cards:`, fetchError)
        results.errors++
        continue
      }
      
      console.log(`[apitcg] Found ${cards?.length || 0} cards in ${dbCategory}`)
      
      for (const card of cards || []) {
        try {
          // Skip if already has a valid image
          if (card.image_url && !card.image_url.includes('placeholder')) {
            results.verified++
            results.byCategory[dbCategory].verified++
            continue
          }
          
          // Get search term from mapping or use first word of name
          const searchTerm = cardSearchMap[card.name] || card.name.split(' ')[0]
          
          let imageUrl: string | null = null
          
          // Try API TCG first
          const searchResults = await searchApiTcg(apiSlug, searchTerm)
          
          if (searchResults.length > 0) {
            results.verified++
            results.byCategory[dbCategory].verified++
            const matchWithImage = searchResults.find(r => getBestImage(r))
            if (matchWithImage) {
              imageUrl = getBestImage(matchWithImage)
            }
          }
          
          // Fallback to Data Dragon for Riftbound cards
          if (!imageUrl && dbCategory === 'lol-riftbound') {
            const ddragonKey = riftboundToDDragon[searchTerm]
            if (ddragonKey) {
              imageUrl = getDDragonImage(ddragonKey)
              console.log(`[apitcg] Using DDragon fallback for ${card.name}: ${imageUrl}`)
              results.verified++
              results.byCategory[dbCategory].verified++
            }
          }
          
          if (!imageUrl) {
            console.log(`[apitcg] No image found for: ${card.name}`)
            results.notFound.push(`${dbCategory}:${card.name}`)
            continue
          }
          
          // Update the card with the image
          const { error: updateError } = await supabase
            .from('market_items')
            .update({
              image_url: imageUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', card.id)
          
          if (updateError) {
            console.error(`[apitcg] Error updating ${card.name}:`, updateError)
            results.errors++
          } else {
            console.log(`[apitcg] Updated image for: ${card.name}`)
            results.updated++
            results.byCategory[dbCategory].updated++
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 250))
          
        } catch (error) {
          console.error(`[apitcg] Error processing ${card.name}:`, error)
          results.errors++
        }
      }
    }
    
    console.log(`[apitcg] Sync complete. Verified: ${results.verified}, Updated: ${results.updated}, Not Found: ${results.notFound.length}, Errors: ${results.errors}`)
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Verified ${results.verified} cards, updated ${results.updated} images`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('[apitcg] Fatal error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
