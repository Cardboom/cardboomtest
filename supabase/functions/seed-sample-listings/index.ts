import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SeedRequest {
  batch_size_per_game?: number;
  include_games?: string[];
}

// Condition distribution weights
const CONDITION_DISTRIBUTION = [
  { condition: 'Near Mint', weight: 50 },
  { condition: 'Lightly Played', weight: 25 },
  { condition: 'Moderately Played', weight: 15 },
  { condition: 'Mint', weight: 10 },
]

// Condition price multipliers
const CONDITION_MULTIPLIERS: Record<string, { min: number; max: number }> = {
  'Mint': { min: 1.10, max: 1.25 },
  'Near Mint': { min: 0.95, max: 1.10 },
  'Lightly Played': { min: 0.80, max: 0.95 },
  'Moderately Played': { min: 0.65, max: 0.80 },
}

// Safe default price ranges per game (in USD)
const GAME_PRICE_DEFAULTS: Record<string, { min: number; max: number }> = {
  onepiece: { min: 3, max: 120 },
  pokemon: { min: 2, max: 250 },
  mtg: { min: 1, max: 500 },
  lorcana: { min: 2, max: 200 },
  riftbound: { min: 2, max: 80 },
  yugioh: { min: 1, max: 150 },
  digimon: { min: 2, max: 100 },
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function selectCondition(): string {
  const total = CONDITION_DISTRIBUTION.reduce((sum, c) => sum + c.weight, 0)
  let random = Math.random() * total
  
  for (const item of CONDITION_DISTRIBUTION) {
    random -= item.weight
    if (random <= 0) return item.condition
  }
  
  return 'Near Mint'
}

function calculatePrice(basePrice: number | null, condition: string, game: string): number {
  const multiplier = CONDITION_MULTIPLIERS[condition] || CONDITION_MULTIPLIERS['Near Mint']
  const noise = 1 + (Math.random() * 0.08 - 0.04) // ±2-4% noise
  
  if (basePrice && basePrice > 0) {
    const factor = randomBetween(multiplier.min, multiplier.max)
    return Math.round(basePrice * factor * noise * 100) / 100
  }
  
  // Use game defaults
  const defaults = GAME_PRICE_DEFAULTS[game.toLowerCase()] || GAME_PRICE_DEFAULTS.pokemon
  return Math.round(randomBetween(defaults.min, defaults.max) * 100) / 100
}

function generateListingTitle(
  cardName: string,
  setName: string | null,
  cardNumber: string | null,
  condition: string,
  variant: string | null
): string {
  const parts = [cardName]
  
  if (setName) parts.push(setName)
  if (cardNumber) parts.push(`#${cardNumber}`)
  parts.push(condition)
  if (variant && variant !== 'base') parts.push(`(${variant})`)
  
  return parts.join(' • ')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { 
      batch_size_per_game = 50, 
      include_games = ['onepiece', 'pokemon', 'mtg', 'lorcana', 'riftbound']
    }: SeedRequest = await req.json().catch(() => ({}))

    console.log(`[seed-sample-listings] Starting seed with batch_size=${batch_size_per_game}, games=${include_games.join(',')}`)

    // Create batch record
    const sample_batch_id = crypto.randomUUID()
    const source_tag = 'seed:v1'
    
    const { error: batchError } = await supabase
      .from('sample_listing_batches')
      .insert({
        id: sample_batch_id,
        games: include_games,
        source_tag,
        listings_count: 0,
        notes: `Auto-seeded ${new Date().toISOString()}`
      })

    if (batchError) {
      console.error('Failed to create batch record:', batchError)
      throw new Error(`Failed to create batch: ${batchError.message}`)
    }

    const results: Record<string, { cards_found: number; listings_created: number }> = {}
    let totalListings = 0

    // Get a system seller account (or create one)
    let sellerId: string
    
    const { data: systemSeller } = await supabase
      .from('profiles')
      .select('id')
      .eq('system_account_role', 'seller')
      .limit(1)
      .maybeSingle()
    
    if (systemSeller) {
      sellerId = systemSeller.id
    } else {
      // Fallback: use any existing profile
      const { data: anyProfile } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .maybeSingle()
      
      if (!anyProfile) {
        throw new Error('No profiles found to use as seller')
      }
      sellerId = anyProfile.id
    }

    console.log(`[seed-sample-listings] Using seller_id: ${sellerId}`)

    for (const game of include_games) {
      console.log(`[seed-sample-listings] Processing game: ${game}`)
      
      // Fetch catalog cards for this game
      const { data: cards, error: cardsError } = await supabase
        .from('catalog_cards')
        .select('id, canonical_key, name, set_name, set_code, card_number, variant, rarity, image_url, game')
        .eq('game', game)
        .not('image_url', 'is', null) // Only cards with images
        .order('created_at', { ascending: false })
        .limit(batch_size_per_game * 2) // Get extra for randomization
      
      if (cardsError) {
        console.error(`Error fetching cards for ${game}:`, cardsError)
        results[game] = { cards_found: 0, listings_created: 0 }
        continue
      }

      if (!cards || cards.length === 0) {
        console.log(`[seed-sample-listings] No cards found for ${game}`)
        results[game] = { cards_found: 0, listings_created: 0 }
        continue
      }

      // Shuffle and select cards
      const shuffled = cards.sort(() => Math.random() - 0.5).slice(0, batch_size_per_game)
      console.log(`[seed-sample-listings] Selected ${shuffled.length} cards for ${game}`)

      const listingsToInsert = []

      for (const card of shuffled) {
        // Create 1-3 listings per card
        const listingCount = Math.floor(Math.random() * 3) + 1
        
        for (let i = 0; i < listingCount; i++) {
          const condition = selectCondition()
          const price = calculatePrice(null, condition, game)
          
          const title = generateListingTitle(
            card.name,
            card.set_name,
            card.card_number,
            condition,
            card.variant
          )

          listingsToInsert.push({
            seller_id: sellerId,
            title,
            price,
            condition,
            category: game,
            status: 'active',
            source: 'sample',
            is_sample: true,
            sample_batch_id,
            source_tag,
            canonical_card_key: card.canonical_key,
            canonical_variant_key: card.variant ? `${card.canonical_key}:v:${card.variant}` : null,
            // DO NOT store image_url - UI resolves from catalog
            image_url: null,
            set_name: card.set_name,
            set_code: card.set_code,
            card_number: card.card_number,
            currency: 'USD',
            allows_shipping: true,
            allows_trade: false,
            allows_vault: true,
          })
        }
      }

      // Insert listings in batches
      if (listingsToInsert.length > 0) {
        const { data: inserted, error: insertError } = await supabase
          .from('listings')
          .insert(listingsToInsert)
          .select('id')

        if (insertError) {
          console.error(`Error inserting listings for ${game}:`, insertError)
          results[game] = { cards_found: cards.length, listings_created: 0 }
        } else {
          const createdCount = inserted?.length || 0
          totalListings += createdCount
          results[game] = { cards_found: shuffled.length, listings_created: createdCount }
          console.log(`[seed-sample-listings] Created ${createdCount} listings for ${game}`)
        }
      } else {
        results[game] = { cards_found: shuffled.length, listings_created: 0 }
      }
    }

    // Update batch with total count
    await supabase
      .from('sample_listing_batches')
      .update({ listings_count: totalListings })
      .eq('id', sample_batch_id)

    console.log(`[seed-sample-listings] Complete. Total: ${totalListings} listings`)

    return new Response(JSON.stringify({
      success: true,
      sample_batch_id,
      source_tag,
      total_listings: totalListings,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[seed-sample-listings] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
