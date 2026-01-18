import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IngestRequest {
  game?: 'pokemon' | 'onepiece' | 'yugioh'
  limit?: number
  updatePrices?: boolean
}

interface PriceChartingProduct {
  id: string | number
  'product-name': string
  'console-name': string
  'loose-price'?: number
  'graded-price'?: number
  'complete-price'?: number
  'new-price'?: number
  'box-only-price'?: number
  'manual-only-price'?: number
}

// Parse card number from PriceCharting product name
function parseCardNumber(productName: string): string | null {
  // Match patterns like #123/456, #123, [123], etc.
  const patterns = [
    /#(\d+)(?:\/\d+)?/,           // #123 or #123/456
    /\[(\d+)\]/,                   // [123]
    /\s(\d{1,3})$/,                // ends with number
    /\s(\d+\/\d+)/,                // 123/456
  ]
  
  for (const pattern of patterns) {
    const match = productName.match(pattern)
    if (match) return match[1]
  }
  
  return null
}

// Build canonical key for PriceCharting data
function buildPriceChartingCanonicalKey(
  game: string,
  setCode: string,
  cardNumber: string | null,
  language: string = 'EN'
): string | null {
  if (!cardNumber) return null
  
  return [
    game.toLowerCase(),
    language.toLowerCase(),
    setCode.toLowerCase(),
    cardNumber.toLowerCase()
  ].join(':')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const pricechartingKey = Deno.env.get('PRICECHARTING_API_KEY')
    
    if (!pricechartingKey) {
      throw new Error('PRICECHARTING_API_KEY not configured')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { game = 'pokemon', limit = 100, updatePrices = true }: IngestRequest = 
      await req.json().catch(() => ({}))
    
    console.log(`[catalog-ingest-pricecharting] Starting - game: ${game}, limit: ${limit}`)
    
    const results = {
      fetched: 0,
      matched: 0,
      unmatched: 0,
      pricesUpdated: 0,
      errors: [] as string[],
    }

    // Step 1: Get market_items that need PriceCharting price updates
    let query = supabase
      .from('market_items')
      .select('id, name, category, set_code, card_number, set_name, external_id, current_price')
      .limit(limit)
    
    if (game === 'pokemon') {
      query = query.eq('category', 'pokemon')
    } else if (game === 'onepiece') {
      query = query.or('category.eq.onepiece,category.eq.one-piece')
    } else if (game === 'yugioh') {
      query = query.eq('category', 'yugioh')
    }
    
    const { data: items, error: fetchError } = await query
    if (fetchError) throw fetchError
    
    console.log(`[catalog-ingest-pricecharting] Found ${items?.length || 0} items to process`)

    // Step 2: Get set mapping from pricecharting_set_map
    const { data: setMappings } = await supabase
      .from('pricecharting_set_map')
      .select('console_name, set_code, game')
      .eq('game', game)
    
    const setMap = new Map<string, string>()
    for (const mapping of setMappings || []) {
      setMap.set(mapping.console_name.toLowerCase(), mapping.set_code)
    }
    
    console.log(`[catalog-ingest-pricecharting] Loaded ${setMap.size} set mappings`)

    // Step 3: Process each item
    for (const item of items || []) {
      try {
        // Build search query
        const searchQuery = encodeURIComponent(item.name)
        const apiUrl = `https://www.pricecharting.com/api/products?t=${pricechartingKey}&q=${searchQuery}`
        
        console.log(`[catalog-ingest-pricecharting] Searching: ${item.name}`)
        
        const response = await fetch(apiUrl)
        
        if (!response.ok) {
          console.error(`[catalog-ingest-pricecharting] API error: ${response.status}`)
          results.errors.push(`${item.id}: API error ${response.status}`)
          continue
        }
        
        const data = await response.json()
        const products: PriceChartingProduct[] = data.products || data || []
        
        results.fetched += products.length
        
        if (products.length === 0) {
          console.log(`[catalog-ingest-pricecharting] No products found for: ${item.name}`)
          
          // Add to unmatched queue
          await supabase.from('pricing_unmatched_items').insert({
            source: 'pricecharting',
            external_id: null,
            raw_payload: { search_query: item.name, market_item_id: item.id },
            reason: 'No results from PriceCharting search',
            suggested_matches: [],
          })
          
          results.unmatched++
          continue
        }
        
        // Find best match
        let bestMatch: PriceChartingProduct | null = null
        let bestScore = 0
        
        for (const product of products) {
          let score = 0
          const productName = (product['product-name'] || '').toLowerCase()
          const itemName = item.name.toLowerCase()
          
          // Exact name match
          if (productName === itemName) {
            score += 100
          } else if (productName.includes(itemName) || itemName.includes(productName)) {
            score += 50
          }
          
          // Set name match
          const consoleName = product['console-name'] || ''
          if (item.set_name && consoleName.toLowerCase().includes(item.set_name.toLowerCase())) {
            score += 30
          }
          
          // Card number match
          const pcCardNumber = parseCardNumber(product['product-name'] || '')
          if (pcCardNumber && item.card_number && pcCardNumber === item.card_number) {
            score += 40
          }
          
          if (score > bestScore) {
            bestScore = score
            bestMatch = product
          }
        }
        
        if (bestMatch && bestScore >= 50) {
          results.matched++
          
          // Resolve set_code from console-name
          const consoleName = bestMatch['console-name'] || ''
          let resolvedSetCode = item.set_code
          
          if (!resolvedSetCode && consoleName) {
            resolvedSetCode = setMap.get(consoleName.toLowerCase()) || null
            
            // If not mapped, add to unmapped for admin review
            if (!resolvedSetCode) {
              console.log(`[catalog-ingest-pricecharting] Unmapped set: ${consoleName}`)
            }
          }
          
          // Extract card number from product name
          const cardNumber = parseCardNumber(bestMatch['product-name'] || '') || item.card_number
          
          // Build canonical key
          const canonicalKey = resolvedSetCode && cardNumber 
            ? buildPriceChartingCanonicalKey(game, resolvedSetCode, cardNumber)
            : null
          
          // Store external ID mapping
          await supabase.from('external_card_ids').upsert({
            source: 'pricecharting',
            external_id: String(bestMatch.id),
            catalog_card_id: null, // Will be linked later
            canonical_card_key: canonicalKey,
            confidence: Math.min(bestScore, 100),
            match_rule: `score:${bestScore}`,
          }, {
            onConflict: 'source,external_id',
          })
          
          // Update prices if requested
          if (updatePrices) {
            const loosePrice = bestMatch['loose-price'] ? bestMatch['loose-price'] / 100 : null
            const gradedPrice = bestMatch['graded-price'] ? bestMatch['graded-price'] / 100 : null
            
            if (loosePrice && loosePrice > 0) {
              // Insert raw price
              await supabase.from('card_prices').upsert({
                canonical_card_key: canonicalKey || `pc:${bestMatch.id}`,
                source: 'pricecharting',
                currency: 'USD',
                condition: 'raw',
                price: loosePrice,
                raw_payload: bestMatch,
              }, {
                onConflict: 'canonical_card_key,source,currency,condition',
              })
              
              // Update market_item if no current price or PriceCharting is fresher
              if (!item.current_price || item.current_price === 0) {
                await supabase.from('market_items').update({
                  current_price: loosePrice,
                  data_source: 'pricecharting',
                  external_id: `pricecharting_${bestMatch.id}`,
                  set_code: resolvedSetCode || item.set_code,
                  card_number: cardNumber || item.card_number,
                  set_name: consoleName || item.set_name,
                }).eq('id', item.id)
              }
              
              results.pricesUpdated++
            }
            
            if (gradedPrice && gradedPrice > 0) {
              // Insert graded price (PSA 9 estimate from PriceCharting graded price)
              await supabase.from('card_prices').upsert({
                canonical_card_key: canonicalKey || `pc:${bestMatch.id}`,
                source: 'pricecharting',
                currency: 'USD',
                condition: 'graded',
                grade_company: 'PSA',
                grade_value: 9,
                price: gradedPrice,
                raw_payload: bestMatch,
              }, {
                onConflict: 'canonical_card_key,source,currency,condition,grade_company,grade_value',
              })
            }
          }
          
        } else {
          // Low confidence - queue for review
          await supabase.from('pricing_unmatched_items').insert({
            source: 'pricecharting',
            external_id: bestMatch ? String(bestMatch.id) : null,
            raw_payload: { 
              search_query: item.name, 
              market_item_id: item.id,
              candidates: products.slice(0, 5),
            },
            reason: `Low match confidence: ${bestScore}`,
            suggested_matches: products.slice(0, 3).map(p => ({
              id: p.id,
              name: p['product-name'],
              console: p['console-name'],
              price: p['loose-price'] ? p['loose-price'] / 100 : null,
            })),
          })
          
          results.unmatched++
        }
        
        // Rate limiting (PriceCharting allows 1 req/sec on free tier)
        await new Promise(r => setTimeout(r, 1100))
        
      } catch (itemError) {
        const msg = itemError instanceof Error ? itemError.message : 'Unknown error'
        results.errors.push(`${item.id}: ${msg}`)
        console.error(`[catalog-ingest-pricecharting] Error processing ${item.id}:`, itemError)
      }
    }
    
    console.log(`[catalog-ingest-pricecharting] Completed - Fetched: ${results.fetched}, Matched: ${results.matched}, Unmatched: ${results.unmatched}, Prices Updated: ${results.pricesUpdated}`)
    
    return new Response(JSON.stringify({
      success: true,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[catalog-ingest-pricecharting] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})