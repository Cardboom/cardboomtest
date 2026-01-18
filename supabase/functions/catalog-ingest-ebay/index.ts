import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IngestRequest {
  game?: 'pokemon' | 'onepiece' | 'yugioh'
  limit?: number
  type?: 'sold' | 'active'
}

// Parse One Piece card info from eBay title
function parseOnePieceTitle(title: string): { 
  setCode?: string
  cardNumber?: string
  grade?: { company: string; value: number }
  isOutlier: boolean
  outlierReason?: string
} {
  const result: ReturnType<typeof parseOnePieceTitle> = { isOutlier: false }
  
  // Check for outlier keywords
  const outlierKeywords = ['lot', 'bundle', 'proxy', 'custom', 'digital', 'damaged', 'case only', 'empty', 'box only', 'repack', 'mystery', 'random']
  const titleLower = title.toLowerCase()
  for (const keyword of outlierKeywords) {
    if (titleLower.includes(keyword)) {
      result.isOutlier = true
      result.outlierReason = `Contains "${keyword}"`
      return result
    }
  }
  
  // Match set code: OP01, EB02, ST03, PRB, etc.
  const setMatch = title.match(/(OP\d{2}|EB\d{2}|ST\d{2}|PRB)/i)
  if (setMatch) {
    result.setCode = setMatch[1].toUpperCase()
  }
  
  // Match card number after set code
  const fullMatch = title.match(/(OP\d{2}|EB\d{2}|ST\d{2}|PRB)[-\s]?(\d{1,3})/i)
  if (fullMatch) {
    result.cardNumber = `${fullMatch[1].toUpperCase()}-${fullMatch[2].padStart(3, '0')}`
  } else {
    // Try standalone number before rarity markers
    const numMatch = title.match(/\b(\d{1,3})\b(?=\s*(?:Holo|SEC|SR|SP|PSA|BGS|CGC|$))/i)
    if (numMatch && result.setCode) {
      result.cardNumber = `${result.setCode}-${numMatch[1].padStart(3, '0')}`
    }
  }
  
  // Match grade: PSA 10, BGS 9.5, CGC 9
  const gradeMatch = title.match(/(PSA|BGS|CGC)\s*(\d+(?:\.\d)?)/i)
  if (gradeMatch) {
    result.grade = {
      company: gradeMatch[1].toUpperCase(),
      value: parseFloat(gradeMatch[2])
    }
  }
  
  return result
}

// Parse Pokemon card info from eBay title
function parsePokemonTitle(title: string): {
  cardNumber?: string
  setHint?: string
  grade?: { company: string; value: number }
  isOutlier: boolean
  outlierReason?: string
} {
  const result: ReturnType<typeof parsePokemonTitle> = { isOutlier: false }
  
  // Check for outlier keywords
  const outlierKeywords = ['lot', 'bundle', 'proxy', 'custom', 'digital', 'damaged', 'case only', 'empty', 'box only', 'repack', 'mystery', 'random', 'bulk']
  const titleLower = title.toLowerCase()
  for (const keyword of outlierKeywords) {
    if (titleLower.includes(keyword)) {
      result.isOutlier = true
      result.outlierReason = `Contains "${keyword}"`
      return result
    }
  }
  
  // Match card number: #123, #123/456
  const numMatch = title.match(/#(\d+)(?:\/(\d+))?/)
  if (numMatch) {
    result.cardNumber = numMatch[1]
  }
  
  // Match grade
  const gradeMatch = title.match(/(PSA|BGS|CGC)\s*(\d+(?:\.\d)?)/i)
  if (gradeMatch) {
    result.grade = {
      company: gradeMatch[1].toUpperCase(),
      value: parseFloat(gradeMatch[2])
    }
  }
  
  // Extract set hints
  const setPatterns = ['base set', 'jungle', 'fossil', 'team rocket', 'gym', 'neo', 'aquapolis', 'skyridge', 'expedition', 'scarlet', 'violet', '151', 'obsidian', 'paldea', 'prismatic']
  for (const pattern of setPatterns) {
    if (titleLower.includes(pattern)) {
      result.setHint = pattern
      break
    }
  }
  
  return result
}

// Build canonical key
function buildCanonicalKey(game: string, setCode: string, cardNumber: string): string {
  return `${game.toLowerCase()}:en:${setCode.toLowerCase()}:${cardNumber.toLowerCase()}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ebayKey = Deno.env.get('EBAY_RAPIDAPI_KEY')
    
    if (!ebayKey) {
      throw new Error('EBAY_RAPIDAPI_KEY not configured')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { game = 'onepiece', limit = 50, type = 'sold' }: IngestRequest = 
      await req.json().catch(() => ({}))
    
    console.log(`[catalog-ingest-ebay] Starting - game: ${game}, type: ${type}, limit: ${limit}`)
    
    const results = {
      fetched: 0,
      matched: 0,
      unmatched: 0,
      outliers: 0,
      pricesRecorded: 0,
      errors: [] as string[],
    }

    // Get market_items to process
    let query = supabase
      .from('market_items')
      .select('id, name, category, set_code, card_number, set_name')
      .limit(limit)
    
    if (game === 'onepiece') {
      query = query.or('category.eq.onepiece,category.eq.one-piece')
    } else {
      query = query.eq('category', game)
    }
    
    const { data: items, error: fetchError } = await query
    if (fetchError) throw fetchError
    
    console.log(`[catalog-ingest-ebay] Found ${items?.length || 0} items to process`)

    for (const item of items || []) {
      try {
        // Build search query
        const searchParts = [item.name]
        if (item.set_code && item.card_number) {
          searchParts.push(`${item.set_code}-${item.card_number}`)
        }
        const searchQuery = searchParts.join(' ')
        
        // Fetch from eBay
        const ebayUrl = `https://ebay-search-result.p.rapidapi.com/search/${encodeURIComponent(searchQuery)}?page=1&type=${type}`
        
        console.log(`[catalog-ingest-ebay] Searching: ${searchQuery}`)
        
        const response = await fetch(ebayUrl, {
          headers: {
            'X-RapidAPI-Key': ebayKey,
            'X-RapidAPI-Host': 'ebay-search-result.p.rapidapi.com',
          }
        })
        
        if (!response.ok) {
          console.error(`[catalog-ingest-ebay] API error: ${response.status}`)
          results.errors.push(`${item.id}: API error ${response.status}`)
          continue
        }
        
        const data = await response.json()
        const listings = data.results || data.data || data.items || []
        results.fetched += listings.length
        
        console.log(`[catalog-ingest-ebay] Found ${listings.length} listings`)

        for (const listing of listings.slice(0, 20)) {
          const title = listing.title || ''
          const price = parseFloat(listing.price || listing.sold_price || listing.soldPrice || '0')
          
          if (price <= 0) continue
          
          // Parse title based on game
          let parsed: any
          if (game === 'onepiece') {
            parsed = parseOnePieceTitle(title)
          } else if (game === 'pokemon') {
            parsed = parsePokemonTitle(title)
          } else {
            parsed = { isOutlier: false }
          }
          
          // Skip outliers
          if (parsed.isOutlier) {
            results.outliers++
            continue
          }
          
          // Determine canonical key
          let canonicalKey: string | null = null
          let matchConfidence = 0
          
          if (game === 'onepiece' && parsed.setCode && parsed.cardNumber) {
            // Verify match against item
            const expectedCode = item.set_code && item.card_number 
              ? `${item.set_code}-${item.card_number.padStart(3, '0')}`
              : null
            
            if (expectedCode && parsed.cardNumber === expectedCode) {
              canonicalKey = buildCanonicalKey('onepiece', parsed.setCode, parsed.cardNumber)
              matchConfidence = 100
            } else if (parsed.cardNumber) {
              canonicalKey = buildCanonicalKey('onepiece', parsed.setCode, parsed.cardNumber)
              matchConfidence = 75
            }
          } else if (game === 'pokemon' && parsed.cardNumber && item.set_code) {
            if (item.card_number && parsed.cardNumber === item.card_number) {
              canonicalKey = buildCanonicalKey('pokemon', item.set_code, parsed.cardNumber)
              matchConfidence = 95
            }
          }
          
          // Only auto-match if confidence is high enough
          if (canonicalKey && matchConfidence >= 75) {
            const eventId = listing.id || listing.itemId || `ebay_${Date.now()}_${Math.random().toString(36).slice(2)}`
            
            // Record as price event
            const { error: insertError } = await supabase.from('card_prices').upsert({
              canonical_card_key: canonicalKey,
              source: 'ebay',
              currency: 'USD',
              condition: parsed.grade ? 'graded' : 'raw',
              grade_company: parsed.grade?.company || null,
              grade_value: parsed.grade?.value || null,
              price: price,
              last_sale_price: type === 'sold' ? price : null,
              last_sale_at: type === 'sold' ? new Date().toISOString() : null,
              raw_payload: listing,
            }, {
              onConflict: 'canonical_card_key,source,currency,condition,grade_company,grade_value',
            })
            
            if (!insertError) {
              results.pricesRecorded++
            }
            
            results.matched++
          } else {
            // Queue for review
            await supabase.from('pricing_unmatched_items').insert({
              source: 'ebay',
              external_id: listing.id || listing.itemId,
              raw_payload: {
                title,
                price,
                url: listing.link || listing.url,
                parsed,
                market_item_id: item.id,
              },
              reason: canonicalKey 
                ? `Low match confidence: ${matchConfidence}%`
                : 'Could not extract card identity from title',
              suggested_matches: [],
            })
            
            results.unmatched++
          }
        }
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 300))
        
      } catch (itemError) {
        const msg = itemError instanceof Error ? itemError.message : 'Unknown error'
        results.errors.push(`${item.id}: ${msg}`)
        console.error(`[catalog-ingest-ebay] Error:`, itemError)
      }
    }
    
    console.log(`[catalog-ingest-ebay] Completed - Fetched: ${results.fetched}, Matched: ${results.matched}, Unmatched: ${results.unmatched}, Outliers: ${results.outliers}, Prices: ${results.pricesRecorded}`)
    
    return new Response(JSON.stringify({
      success: true,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[catalog-ingest-ebay] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})