import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PRICECHARTING_API_KEY = Deno.env.get('PRICECHARTING_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Expanded product catalog to sync from PriceCharting
const productCatalog = [
  // Pokemon TCG
  { id: 'tcg-charizard-1st', name: 'Charizard 1st Edition Base Set', category: 'pokemon', search: 'Charizard Base Set 1st Edition Pokemon' },
  { id: 'tcg-pikachu-illustrator', name: 'Pikachu Illustrator', category: 'pokemon', search: 'Pikachu Illustrator Pokemon' },
  { id: 'tcg-psa10-mewtwo', name: 'Mewtwo GX Rainbow', category: 'pokemon', search: 'Mewtwo GX Rainbow Pokemon' },
  { id: 'tcg-blastoise-1st', name: 'Blastoise 1st Edition Base Set', category: 'pokemon', search: 'Blastoise Base Set 1st Edition Pokemon' },
  { id: 'tcg-venusaur-1st', name: 'Venusaur 1st Edition Base Set', category: 'pokemon', search: 'Venusaur Base Set 1st Edition Pokemon' },
  { id: 'tcg-lugia-neo', name: 'Lugia Neo Genesis 1st Edition', category: 'pokemon', search: 'Lugia Neo Genesis 1st Edition Pokemon' },
  { id: 'tcg-umbreon-vmax', name: 'Umbreon VMAX Alt Art', category: 'pokemon', search: 'Umbreon VMAX Alternate Art Pokemon' },
  { id: 'tcg-rayquaza-gold', name: 'Rayquaza VMAX Alt Art', category: 'pokemon', search: 'Rayquaza VMAX Alternate Art Pokemon' },
  { id: 'tcg-mew-celebration', name: 'Mew Celebrations 25th', category: 'pokemon', search: 'Mew Celebrations 25th Anniversary Pokemon' },
  { id: 'tcg-gengar-vmax', name: 'Gengar VMAX Alt Art', category: 'pokemon', search: 'Gengar VMAX Alternate Art Pokemon' },
  
  // Magic: The Gathering - Power Nine
  { id: 'tcg-black-lotus', name: 'Black Lotus Alpha', category: 'mtg', search: 'Black Lotus Alpha Magic' },
  { id: 'mtg-mox-sapphire', name: 'Mox Sapphire Alpha', category: 'mtg', search: 'Mox Sapphire Alpha Magic' },
  { id: 'mtg-mox-ruby', name: 'Mox Ruby Alpha', category: 'mtg', search: 'Mox Ruby Alpha Magic' },
  { id: 'mtg-mox-pearl', name: 'Mox Pearl Alpha', category: 'mtg', search: 'Mox Pearl Alpha Magic' },
  { id: 'mtg-mox-jet', name: 'Mox Jet Alpha', category: 'mtg', search: 'Mox Jet Alpha Magic' },
  { id: 'mtg-mox-emerald', name: 'Mox Emerald Alpha', category: 'mtg', search: 'Mox Emerald Alpha Magic' },
  { id: 'mtg-timetwister', name: 'Timetwister Alpha', category: 'mtg', search: 'Timetwister Alpha Magic' },
  { id: 'mtg-ancestral-recall', name: 'Ancestral Recall Alpha', category: 'mtg', search: 'Ancestral Recall Alpha Magic' },
  { id: 'mtg-time-walk', name: 'Time Walk Alpha', category: 'mtg', search: 'Time Walk Alpha Magic' },
  { id: 'mtg-underground-sea', name: 'Underground Sea Revised', category: 'mtg', search: 'Underground Sea Revised Magic' },
  
  // Yu-Gi-Oh!
  { id: 'yugioh-blue-eyes', name: 'Blue-Eyes White Dragon LOB', category: 'yugioh', search: 'Blue-Eyes White Dragon LOB Yu-Gi-Oh' },
  { id: 'yugioh-dark-magician', name: 'Dark Magician Starter Deck', category: 'yugioh', search: 'Dark Magician Starter Deck Yu-Gi-Oh' },
  { id: 'yugioh-exodia-head', name: 'Exodia the Forbidden One LOB', category: 'yugioh', search: 'Exodia the Forbidden One LOB Yu-Gi-Oh' },
  { id: 'yugioh-red-eyes', name: 'Red-Eyes Black Dragon LOB', category: 'yugioh', search: 'Red-Eyes Black Dragon LOB Yu-Gi-Oh' },
  { id: 'yugioh-dark-magician-girl', name: 'Dark Magician Girl MFC', category: 'yugioh', search: 'Dark Magician Girl MFC Yu-Gi-Oh' },
  { id: 'yugioh-stardust-dragon', name: 'Stardust Dragon Ghost Rare', category: 'yugioh', search: 'Stardust Dragon Ghost Rare Yu-Gi-Oh' },
  
  // NBA Basketball Cards
  { id: 'nba-lebron-2003', name: 'LeBron James 2003 Topps Chrome Rookie', category: 'nba', search: 'LeBron James Topps Chrome Rookie' },
  { id: 'nba-jordan-fleer', name: 'Michael Jordan 1986 Fleer Rookie', category: 'nba', search: 'Michael Jordan Fleer Rookie' },
  { id: 'nba-luka-prizm', name: 'Luka Doncic Prizm Silver', category: 'nba', search: 'Luka Doncic Prizm Silver' },
  { id: 'nba-kobe-topps', name: 'Kobe Bryant Topps Chrome Rookie', category: 'nba', search: 'Kobe Bryant Topps Chrome Rookie' },
  { id: 'nba-giannis-prizm', name: 'Giannis Antetokounmpo Prizm Silver', category: 'nba', search: 'Giannis Antetokounmpo Prizm Silver Rookie' },
  { id: 'nba-zion-prizm', name: 'Zion Williamson Prizm Silver', category: 'nba', search: 'Zion Williamson Prizm Silver Rookie' },
  { id: 'nba-ja-morant-prizm', name: 'Ja Morant Prizm Silver', category: 'nba', search: 'Ja Morant Prizm Silver Rookie' },
  { id: 'nba-wemby-prizm', name: 'Victor Wembanyama Prizm Rookie', category: 'nba', search: 'Victor Wembanyama Prizm Rookie' },
  { id: 'nba-curry-topps', name: 'Stephen Curry Topps Chrome Rookie', category: 'nba', search: 'Stephen Curry Topps Chrome Rookie' },
  
  // NFL Football Cards
  { id: 'football-mahomes-prizm', name: 'Patrick Mahomes Prizm Silver', category: 'nfl', search: 'Patrick Mahomes Prizm Silver' },
  { id: 'football-brady-rookie', name: 'Tom Brady 2000 Contenders Auto', category: 'nfl', search: 'Tom Brady Contenders Auto' },
  { id: 'football-chase-auto', name: "Ja'Marr Chase Optic Auto", category: 'nfl', search: "Ja'Marr Chase Optic Auto" },
  { id: 'football-burrow-prizm', name: 'Joe Burrow Prizm Silver Rookie', category: 'nfl', search: 'Joe Burrow Prizm Silver Rookie' },
  { id: 'football-herbert-prizm', name: 'Justin Herbert Prizm Silver Rookie', category: 'nfl', search: 'Justin Herbert Prizm Silver Rookie' },
  { id: 'football-allen-prizm', name: 'Josh Allen Prizm Silver Rookie', category: 'nfl', search: 'Josh Allen Prizm Silver Rookie' },
  { id: 'football-lamar-prizm', name: 'Lamar Jackson Prizm Silver Rookie', category: 'nfl', search: 'Lamar Jackson Prizm Silver Rookie' },
  
  // MLB Baseball Cards
  { id: 'mlb-trout-bowman', name: 'Mike Trout Bowman Chrome Rookie', category: 'mlb', search: 'Mike Trout Bowman Chrome Rookie' },
  { id: 'mlb-ohtani-bowman', name: 'Shohei Ohtani Bowman Chrome Rookie', category: 'mlb', search: 'Shohei Ohtani Bowman Chrome Rookie' },
  { id: 'mlb-jeter-sp', name: 'Derek Jeter SP Foil Rookie', category: 'mlb', search: 'Derek Jeter SP Foil Rookie' },
  { id: 'mlb-griffey-upper', name: 'Ken Griffey Jr Upper Deck Rookie', category: 'mlb', search: 'Ken Griffey Jr Upper Deck Rookie' },
  
  // One Piece TCG
  { id: 'onepiece-luffy-alt', name: 'Monkey D Luffy Alt Art', category: 'onepiece', search: 'Monkey D Luffy Alt Art One Piece' },
  { id: 'onepiece-shanks-manga', name: 'Shanks Manga Art', category: 'onepiece', search: 'Shanks Manga Art One Piece' },
  { id: 'onepiece-nami-alt', name: 'Nami Alternate Art', category: 'onepiece', search: 'Nami Alternate Art One Piece' },
  { id: 'onepiece-zoro-manga', name: 'Roronoa Zoro Manga Art', category: 'onepiece', search: 'Roronoa Zoro Manga Art One Piece' },
  { id: 'onepiece-ace-alt', name: 'Portgas D Ace Alt Art', category: 'onepiece', search: 'Portgas D Ace Alternate Art One Piece' },
  
  // Disney Lorcana
  { id: 'lorcana-elsa-enchanted', name: 'Elsa Spirit of Winter Enchanted', category: 'lorcana', search: 'Elsa Spirit of Winter Enchanted Disney Lorcana' },
  { id: 'lorcana-mickey-enchanted', name: 'Mickey Mouse Enchanted', category: 'lorcana', search: 'Mickey Mouse Enchanted Disney Lorcana' },
  { id: 'lorcana-stitch-enchanted', name: 'Stitch Enchanted', category: 'lorcana', search: 'Stitch Enchanted Disney Lorcana' },
  { id: 'lorcana-belle-enchanted', name: 'Belle Enchanted', category: 'lorcana', search: 'Belle Enchanted Disney Lorcana' },
  { id: 'lorcana-maleficent-enchanted', name: 'Maleficent Enchanted', category: 'lorcana', search: 'Maleficent Enchanted Disney Lorcana' },
  
  // Figures
  { id: 'figure-kaws-companion', name: 'KAWS Companion', category: 'figures', search: 'KAWS Companion' },
  { id: 'figure-bearbrick-1000', name: 'Bearbrick 1000%', category: 'figures', search: 'Bearbrick 1000%' },
  
  // Video Games (Graded/Sealed)
  { id: 'vg-pokemon-red-sealed', name: 'Pokemon Red Sealed', category: 'videogames', search: 'Pokemon Red Sealed GameBoy' },
  { id: 'vg-pokemon-blue-sealed', name: 'Pokemon Blue Sealed', category: 'videogames', search: 'Pokemon Blue Sealed GameBoy' },
  { id: 'vg-zelda-nes-sealed', name: 'Legend of Zelda NES Sealed', category: 'videogames', search: 'Legend of Zelda Sealed NES' },
  { id: 'vg-mario-64-sealed', name: 'Super Mario 64 Sealed', category: 'videogames', search: 'Super Mario 64 Sealed N64' },
  
  // League of Legends Riftbound TCG - Origins Booster Set (12 Champions)
  { id: 'riftbound-ahri', name: 'Ahri Nine-Tailed Fox', category: 'lol-riftbound', search: 'Ahri Nine-Tailed Fox Riftbound Origins' },
  { id: 'riftbound-darius', name: 'Darius Hand of Noxus', category: 'lol-riftbound', search: 'Darius Hand of Noxus Riftbound Origins' },
  { id: 'riftbound-jinx', name: 'Jinx Loose Cannon', category: 'lol-riftbound', search: 'Jinx Loose Cannon Riftbound Origins' },
  { id: 'riftbound-kaisa', name: "Kai'Sa Daughter of the Void", category: 'lol-riftbound', search: "Kai'Sa Daughter Void Riftbound Origins" },
  { id: 'riftbound-leesin', name: 'Lee Sin Blind Monk', category: 'lol-riftbound', search: 'Lee Sin Blind Monk Riftbound Origins' },
  { id: 'riftbound-leona', name: 'Leona Radiant Dawn', category: 'lol-riftbound', search: 'Leona Radiant Dawn Riftbound Origins' },
  { id: 'riftbound-missfortune', name: 'Miss Fortune Bounty Hunter', category: 'lol-riftbound', search: 'Miss Fortune Bounty Hunter Riftbound Origins' },
  { id: 'riftbound-sett', name: 'Sett Boss', category: 'lol-riftbound', search: 'Sett Boss Riftbound Origins' },
  { id: 'riftbound-teemo', name: 'Teemo Swift Scout', category: 'lol-riftbound', search: 'Teemo Swift Scout Riftbound Origins' },
  { id: 'riftbound-viktor', name: 'Viktor Machine Herald', category: 'lol-riftbound', search: 'Viktor Machine Herald Riftbound Origins' },
  { id: 'riftbound-volibear', name: 'Volibear Relentless Storm', category: 'lol-riftbound', search: 'Volibear Relentless Storm Riftbound Origins' },
  { id: 'riftbound-yasuo', name: 'Yasuo Unforgiven', category: 'lol-riftbound', search: 'Yasuo Unforgiven Riftbound Origins' },
  
  // League of Legends Riftbound TCG - Proving Grounds Box Set (4 Champions)
  { id: 'riftbound-annie', name: 'Annie Dark Child', category: 'lol-riftbound', search: 'Annie Dark Child Riftbound Proving Grounds' },
  { id: 'riftbound-garen', name: 'Garen Might of Demacia', category: 'lol-riftbound', search: 'Garen Might of Demacia Riftbound Proving Grounds' },
  { id: 'riftbound-lux', name: 'Lux Lady of Luminosity', category: 'lol-riftbound', search: 'Lux Lady of Luminosity Riftbound Proving Grounds' },
  { id: 'riftbound-masteryi', name: 'Master Yi Wuju Bladesman', category: 'lol-riftbound', search: 'Master Yi Wuju Bladesman Riftbound Proving Grounds' },
  
  // League of Legends Riftbound TCG - Sealed Products
  { id: 'riftbound-booster-box', name: 'Riftbound Origins Booster Box', category: 'lol-riftbound', search: 'Riftbound Origins Booster Box' },
  { id: 'riftbound-proving-grounds', name: 'Riftbound Proving Grounds Box', category: 'lol-riftbound', search: 'Riftbound Proving Grounds Box Set' },
  { id: 'riftbound-jinx-deck', name: 'Jinx Champion Deck', category: 'lol-riftbound', search: 'Riftbound Jinx Champion Deck' },
  { id: 'riftbound-leesin-deck', name: 'Lee Sin Champion Deck', category: 'lol-riftbound', search: 'Riftbound Lee Sin Champion Deck' },
  { id: 'riftbound-viktor-deck', name: 'Viktor Champion Deck', category: 'lol-riftbound', search: 'Riftbound Viktor Champion Deck' },
];

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
              image_url: null, // Images fetched separately
            })
          
          if (insertError) {
            console.error(`[sync-listings] Error creating ${product.name}: ${insertError.message}`)
            results.errors++
          } else {
            console.log(`[sync-listings] Created ${product.name}: $${listingPrice}`)
            results.created++
          }
        }
        
        // Also update market_items table if this is a riftbound product
        if (product.category === 'lol-riftbound') {
          const { error: marketUpdateError } = await supabase
            .from('market_items')
            .update({
              current_price: Math.round(priceData.price * 100) / 100,
              base_price: Math.round(priceData.price * 100) / 100,
              updated_at: new Date().toISOString(),
              data_source: 'pricecharting',
            })
            .eq('external_id', product.id)
          
          if (marketUpdateError) {
            console.log(`[sync-listings] Could not update market_item ${product.id}: ${marketUpdateError.message}`)
          } else {
            console.log(`[sync-listings] Updated market_item ${product.id}: $${priceData.price}`)
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
