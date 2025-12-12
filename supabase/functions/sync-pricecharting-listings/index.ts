import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PRICECHARTING_API_KEY = Deno.env.get('PRICECHARTING_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Product catalog to sync from PriceCharting
const productCatalog = [
  { id: 'tcg-charizard-1st', name: 'Charizard 1st Edition Base Set', category: 'pokemon', search: 'Charizard Base Set 1st Edition Pokemon', image: '/placeholder.svg' },
  { id: 'tcg-pikachu-illustrator', name: 'Pikachu Illustrator', category: 'pokemon', search: 'Pikachu Illustrator Pokemon', image: '/placeholder.svg' },
  { id: 'tcg-mewtwo-rainbow', name: 'Mewtwo GX Rainbow', category: 'pokemon', search: 'Mewtwo GX Rainbow Pokemon', image: '/placeholder.svg' },
  { id: 'tcg-black-lotus', name: 'Black Lotus Alpha', category: 'tcg', search: 'Black Lotus Alpha Magic', image: '/placeholder.svg' },
  { id: 'mtg-mox-sapphire', name: 'Mox Sapphire Alpha', category: 'tcg', search: 'Mox Sapphire Alpha Magic', image: '/placeholder.svg' },
  { id: 'yugioh-blue-eyes', name: 'Blue-Eyes White Dragon LOB', category: 'tcg', search: 'Blue-Eyes White Dragon LOB Yu-Gi-Oh', image: '/placeholder.svg' },
  { id: 'yugioh-dark-magician', name: 'Dark Magician Starter Deck', category: 'tcg', search: 'Dark Magician Starter Deck Yu-Gi-Oh', image: '/placeholder.svg' },
  { id: 'onepiece-luffy-alt', name: 'Monkey D Luffy Alt Art', category: 'tcg', search: 'Monkey D Luffy Alt Art One Piece', image: '/placeholder.svg' },
  { id: 'onepiece-shanks-manga', name: 'Shanks Manga Art', category: 'tcg', search: 'Shanks Manga Art One Piece', image: '/placeholder.svg' },
  { id: 'lorcana-elsa-enchanted', name: 'Elsa Spirit of Winter Enchanted', category: 'tcg', search: 'Elsa Spirit of Winter Enchanted Disney Lorcana', image: '/placeholder.svg' },
  { id: 'lorcana-mickey-enchanted', name: 'Mickey Mouse Enchanted', category: 'tcg', search: 'Mickey Mouse Enchanted Disney Lorcana', image: '/placeholder.svg' },
  { id: 'nba-lebron-2003', name: 'LeBron James 2003 Topps Chrome Rookie', category: 'nba', search: 'LeBron James Topps Chrome Rookie Trading Cards', image: '/placeholder.svg' },
  { id: 'nba-jordan-fleer', name: 'Michael Jordan 1986 Fleer Rookie', category: 'nba', search: 'Michael Jordan Fleer Rookie Trading Cards', image: '/placeholder.svg' },
  { id: 'nba-luka-prizm', name: 'Luka Doncic Prizm Silver', category: 'nba', search: 'Luka Doncic Prizm Silver Trading Cards', image: '/placeholder.svg' },
  { id: 'football-mahomes-prizm', name: 'Patrick Mahomes Prizm Silver', category: 'nfl', search: 'Patrick Mahomes Prizm Silver Trading Cards', image: '/placeholder.svg' },
  { id: 'football-brady-rookie', name: 'Tom Brady 2000 Contenders Auto', category: 'nfl', search: 'Tom Brady Contenders Auto Trading Cards', image: '/placeholder.svg' },
  { id: 'football-chase-auto', name: "Ja'Marr Chase Optic Auto", category: 'nfl', search: "Ja'Marr Chase Optic Auto Trading Cards", image: '/placeholder.svg' },
  { id: 'figure-kaws-companion', name: 'KAWS Companion', category: 'figures', search: 'KAWS Companion Toys', image: '/placeholder.svg' },
  { id: 'figure-bearbrick-1000', name: 'Bearbrick 1000%', category: 'figures', search: 'Bearbrick 1000% Toys', image: '/placeholder.svg' },
]

// Markup percentage (3-4% spread)
const MARKUP_PERCENT = 0.035 // 3.5%

// System seller ID - This will be used for auto-generated listings
// We need to use the service role to bypass RLS
const SYSTEM_SELLER_ID = '00000000-0000-0000-0000-000000000000' // Placeholder, will be replaced with actual system user

async function fetchPriceFromPriceCharting(searchQuery: string): Promise<{ price: number; source: string } | null> {
  if (!PRICECHARTING_API_KEY) {
    console.error('[sync-listings] PRICECHARTING_API_KEY not set')
    return null
  }

  try {
    const encodedQuery = encodeURIComponent(searchQuery)
    const url = `https://www.pricecharting.com/api/products?t=${PRICECHARTING_API_KEY}&q=${encodedQuery}`
    
    console.log(`[sync-listings] Fetching price for: ${searchQuery}`)
    
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`[sync-listings] PriceCharting API error: ${response.status}`)
      return null
    }

    const data = await response.json()
    
    if (data.products && data.products.length > 0) {
      const product = data.products[0]
      // PriceCharting returns prices in cents
      const loosePrice = product['loose-price'] ? product['loose-price'] / 100 : 0
      const cibPrice = product['cib-price'] ? product['cib-price'] / 100 : 0
      const newPrice = product['new-price'] ? product['new-price'] / 100 : 0
      
      // Use the best available price
      const price = loosePrice || cibPrice || newPrice
      
      if (price > 0) {
        console.log(`[sync-listings] Found price: $${price} for ${searchQuery}`)
        return { price, source: 'pricecharting' }
      }
    }
    
    console.log(`[sync-listings] No price found for: ${searchQuery}`)
    return null
  } catch (error) {
    console.error(`[sync-listings] Error fetching price: ${error}`)
    return null
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[sync-listings] Starting sync...')
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // First, ensure we have a system seller account or get a real seller
    // For now, we'll get the first user as the seller (you can create a dedicated system user)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (profileError || !profiles || profiles.length === 0) {
      console.error('[sync-listings] No users found to use as seller')
      return new Response(
        JSON.stringify({ error: 'No seller account available' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const sellerId = profiles[0].id
    console.log(`[sync-listings] Using seller ID: ${sellerId}`)
    
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    }
    
    for (const product of productCatalog) {
      try {
        const priceData = await fetchPriceFromPriceCharting(product.search)
        
        if (!priceData || priceData.price <= 0) {
          console.log(`[sync-listings] Skipping ${product.name} - no valid price`)
          results.skipped++
          continue
        }
        
        // Apply markup (3.5%)
        const listingPrice = Math.round(priceData.price * (1 + MARKUP_PERCENT) * 100) / 100
        
        // Check if listing already exists
        const { data: existingListing, error: checkError } = await supabase
          .from('listings')
          .select('id, price')
          .eq('source', 'pricecharting')
          .eq('external_id', product.id)
          .single()
        
        if (existingListing) {
          // Update existing listing price
          const { error: updateError } = await supabase
            .from('listings')
            .update({
              price: listingPrice,
              external_price: priceData.price,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingListing.id)
          
          if (updateError) {
            console.error(`[sync-listings] Error updating ${product.name}: ${updateError.message}`)
            results.errors++
          } else {
            console.log(`[sync-listings] Updated ${product.name}: $${priceData.price} -> $${listingPrice}`)
            results.updated++
          }
        } else {
          // Create new listing
          const { error: insertError } = await supabase
            .from('listings')
            .insert({
              title: product.name,
              description: `Market price from PriceCharting. Original price: $${priceData.price.toFixed(2)}`,
              category: product.category,
              condition: 'Near Mint',
              price: listingPrice,
              external_price: priceData.price,
              source: 'pricecharting',
              external_id: product.id,
              seller_id: sellerId,
              allows_shipping: true,
              allows_trade: true,
              allows_vault: true,
              status: 'active',
              image_url: product.image,
            })
          
          if (insertError) {
            console.error(`[sync-listings] Error creating ${product.name}: ${insertError.message}`)
            results.errors++
          } else {
            console.log(`[sync-listings] Created ${product.name}: $${listingPrice}`)
            results.created++
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error) {
        console.error(`[sync-listings] Error processing ${product.name}: ${error}`)
        results.errors++
      }
    }
    
    console.log(`[sync-listings] Sync complete. Created: ${results.created}, Updated: ${results.updated}, Skipped: ${results.skipped}, Errors: ${results.errors}`)
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('[sync-listings] Fatal error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
