import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PRICECHARTING_API_KEY = Deno.env.get('PRICECHARTING_API_KEY')

interface PriceResult {
  price: number
  source: string
  productName?: string
  externalId?: string
}

// Build PriceCharting query - clean and targeted
function buildPriceChartingQuery(name: string, category: string, targetGrade?: string): string {
  // Clean up the name - remove brackets, special chars
  let cleanName = name
    .replace(/\[.*?\]/g, '') // Remove [Rainbow Foil], [Sparkle], etc.
    .replace(/#\d+/g, '')    // Remove #144, #51, etc.
    .replace(/\s+/g, ' ')    // Normalize spaces
    .trim()
  
  const gameKeywords: Record<string, string> = {
    'pokemon': 'Pokemon',
    'onepiece': 'One Piece',
    'one-piece': 'One Piece',
  }
  
  const parts = [cleanName]
  
  // Add game context
  if (gameKeywords[category]) {
    parts.push(gameKeywords[category])
  }
  
  // Add grade for graded card searches
  if (targetGrade) {
    parts.push(targetGrade)
  }
  
  return parts.join(' ')
}

// Fetch from PriceCharting - most reliable for TCG
async function fetchPriceCharting(query: string): Promise<PriceResult | null> {
  if (!PRICECHARTING_API_KEY) {
    console.log('[sync-popular] PriceCharting API key not configured')
    return null
  }
  
  try {
    const url = `https://www.pricecharting.com/api/products?t=${PRICECHARTING_API_KEY}&q=${encodeURIComponent(query)}`
    
    console.log(`[sync-popular] PriceCharting query: ${query}`)
    
    const response = await fetch(url)
    
    if (!response.ok) {
      console.log(`[sync-popular] PriceCharting API error: ${response.status}`)
      return null
    }
    
    const data = await response.json()
    const products = data.products || []
    
    console.log(`[sync-popular] PriceCharting returned ${products.length} products`)
    
    if (products.length > 0) {
      // Find best match - prefer graded prices if available
      const product = products[0]
      
      // PriceCharting returns prices in cents - try different price fields
      // For PSA 10: look for 'graded' or 'complete' price
      // For raw: use 'loose-price'
      let priceInCents = product['loose-price']
      let priceType = 'raw'
      
      // Check for graded price
      if (product['graded-price'] && product['graded-price'] > 0) {
        priceInCents = product['graded-price']
        priceType = 'graded'
      } else if (product['complete-price'] && product['complete-price'] > 0) {
        priceInCents = product['complete-price']
        priceType = 'complete'
      }
      
      if (priceInCents && priceInCents > 0) {
        const price = priceInCents / 100 // Convert cents to dollars
        
        console.log(`[sync-popular] ✅ Found: ${product['product-name']} = $${price} (${priceType})`)
        
        return {
          price,
          source: 'pricecharting',
          productName: product['product-name'],
          externalId: `pricecharting_${product.id}`,
        }
      }
    }
    
    console.log(`[sync-popular] No valid price found in results`)
    return null
  } catch (error) {
    console.error('[sync-popular] PriceCharting fetch error:', error)
    return null
  }
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
      categories = ['pokemon', 'onepiece', 'one-piece'],
      limit = 20,
      targetGrade,
      skipDuplicates = true,
    } = await req.json().catch(() => ({}))
    
    console.log(`[sync-popular] Starting sync - categories: ${categories.join(',')}, limit: ${limit}, grade: ${targetGrade || 'raw'}`)
    
    // Get popular cards (exclude duplicates, boosters, etc.)
    let query = supabase
      .from('market_items')
      .select('id, name, category, set_name, set_code, card_number, verified_price, psa10_price, psa9_price')
      .in('category', categories)
      .not('name', 'ilike', '%Booster%')
      .not('name', 'ilike', '%Sealed%')
      .not('name', 'ilike', '%Checklist%')
      .not('name', 'ilike', '%Box%')
      .not('name', 'ilike', '%Pack%')
      .order('views_24h', { ascending: false, nullsFirst: false })
      .limit(limit)
    
    const { data: items, error: fetchError } = await query
    
    if (fetchError) throw fetchError
    
    console.log(`[sync-popular] Found ${items?.length || 0} items to sync`)
    
    const results = {
      synced: 0,
      failed: 0,
      skipped: 0,
      prices: [] as { name: string; price: number; source: string; grade?: string }[],
    }
    
    // Track names to skip duplicates
    const processedNames = new Set<string>()
    
    for (const item of items || []) {
      // Skip duplicates by name
      if (skipDuplicates && processedNames.has(item.name)) {
        results.skipped++
        continue
      }
      processedNames.add(item.name)
      
      console.log(`[sync-popular] Processing: ${item.name}`)
      
      // Build query and fetch from PriceCharting
      const pcQuery = buildPriceChartingQuery(item.name, item.category, targetGrade)
      const priceResult = await fetchPriceCharting(pcQuery)
      
      if (priceResult && priceResult.price > 0) {
        // Determine which field to update based on grade
        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
          data_source: priceResult.source,
        }
        
        if (targetGrade?.toLowerCase().includes('psa 10') || targetGrade?.toLowerCase().includes('psa10')) {
          updateData.psa10_price = priceResult.price
        } else if (targetGrade?.toLowerCase().includes('psa 9') || targetGrade?.toLowerCase().includes('psa9')) {
          updateData.psa9_price = priceResult.price
        } else {
          // Raw/ungraded price
          updateData.verified_price = priceResult.price
          updateData.verified_source = priceResult.source
          updateData.verified_at = new Date().toISOString()
        }
        
        if (priceResult.externalId) {
          updateData.external_id = priceResult.externalId
        }
        
        const { error: updateError } = await supabase
          .from('market_items')
          .update(updateData)
          .eq('id', item.id)
        
        if (updateError) {
          console.error(`[sync-popular] Update error for ${item.name}:`, updateError)
          results.failed++
        } else {
          results.synced++
          results.prices.push({
            name: item.name,
            price: priceResult.price,
            source: priceResult.source,
            grade: targetGrade,
          })
          console.log(`[sync-popular] ✅ Updated ${item.name}: $${priceResult.price}`)
        }
      } else {
        results.failed++
        console.log(`[sync-popular] ❌ No price found for ${item.name}`)
      }
      
      // Rate limit: 500ms between requests (PriceCharting is rate-limited)
      await new Promise(r => setTimeout(r, 500))
    }
    
    console.log(`[sync-popular] Completed - Synced: ${results.synced}, Failed: ${results.failed}, Skipped: ${results.skipped}`)
    
    return new Response(JSON.stringify({
      success: true,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('[sync-popular] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
