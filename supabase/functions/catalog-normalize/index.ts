import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NormalizeRequest {
  game?: string
  limit?: number
  dryRun?: boolean
  forceRecompute?: boolean
}

// One Piece card number normalization
function normalizeOnePieceCardNumber(setCode: string | null, cardNumber: string | null): string | null {
  if (!cardNumber) return null
  
  // Check if already contains set code (e.g., OP07-051, EB02-061)
  const fullCodeMatch = cardNumber.match(/^(OP\d{2}|EB\d{2}|ST\d{2}|PRB)-?(\d+)$/i)
  if (fullCodeMatch) {
    const extractedSet = fullCodeMatch[1].toUpperCase()
    const num = fullCodeMatch[2].padStart(3, '0')
    return `${extractedSet}-${num}`
  }
  
  // Numeric only - combine with set_code
  if (/^\d+$/.test(cardNumber) && setCode) {
    return `${setCode.toUpperCase()}-${cardNumber.padStart(3, '0')}`
  }
  
  return cardNumber
}

// Build canonical card key
function buildCanonicalCardKey(
  game: string | null,
  language: string | null,
  setCode: string | null,
  normalizedCardNumber: string | null
): string | null {
  if (!game || !setCode || !normalizedCardNumber) return null
  
  return [
    game.toLowerCase(),
    (language || 'en').toLowerCase(),
    setCode.toLowerCase(),
    normalizedCardNumber.toLowerCase()
  ].join(':')
}

// Parse eBay title for One Piece card info
function parseOnePieceFromTitle(title: string): { setCode?: string; cardNumber?: string } {
  const result: { setCode?: string; cardNumber?: string } = {}
  
  // Match set code: OP01, EB02, ST03, PRB, etc.
  const setMatch = title.match(/(OP\d{2}|EB\d{2}|ST\d{2}|PRB)/i)
  if (setMatch) {
    result.setCode = setMatch[1].toUpperCase()
  }
  
  // Match card number after set code
  const fullMatch = title.match(/(OP\d{2}|EB\d{2}|ST\d{2}|PRB)[-\s]?(\d{1,3})/i)
  if (fullMatch) {
    result.cardNumber = `${fullMatch[1].toUpperCase()}-${fullMatch[2].padStart(3, '0')}`
  }
  
  return result
}

// Parse Pokemon card info from name/title
function parsePokemonFromTitle(title: string): { cardNumber?: string } {
  const result: { cardNumber?: string } = {}
  
  // Match #XXX or #XX/YYY format
  const numMatch = title.match(/#(\d+)(?:\/\d+)?/)
  if (numMatch) {
    result.cardNumber = numMatch[1]
  }
  
  return result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { game, limit = 500, dryRun = false, forceRecompute = false }: NormalizeRequest = 
      await req.json().catch(() => ({}))
    
    console.log(`[catalog-normalize] Starting - game: ${game || 'all'}, limit: ${limit}, dryRun: ${dryRun}`)
    
    const results = {
      processed: 0,
      normalized: 0,
      skipped: 0,
      errors: [] as string[],
      samples: [] as any[],
    }

    // Step 1: Normalize market_items
    let marketQuery = supabase
      .from('market_items')
      .select('id, name, category, set_code, card_number, set_name, external_id, variant, language')
      .limit(limit)
    
    if (game) {
      if (game === 'onepiece') {
        marketQuery = marketQuery.or('category.ilike.one-piece%,category.ilike.onepiece%')
      } else {
        marketQuery = marketQuery.ilike('category', `%${game}%`)
      }
    }
    
    // Only process items without canonical key unless force recompute
    if (!forceRecompute) {
      marketQuery = marketQuery.is('normalized_key', null)
    }
    
    const { data: marketItems, error: fetchError } = await marketQuery
    if (fetchError) throw fetchError
    
    console.log(`[catalog-normalize] Found ${marketItems?.length || 0} market_items to process`)

    for (const item of marketItems || []) {
      results.processed++
      
      try {
        const gameType = item.category?.toLowerCase()?.replace('-', '') || 'unknown'
        let normalizedCardNumber = item.card_number
        let setCode = item.set_code
        let language = item.language || 'EN'
        
        // Game-specific normalization
        if (gameType === 'onepiece' || gameType === 'one-piece') {
          // Try to extract from name if missing
          if (!setCode || !normalizedCardNumber) {
            const parsed = parseOnePieceFromTitle(item.name)
            if (parsed.setCode && !setCode) setCode = parsed.setCode
            if (parsed.cardNumber) normalizedCardNumber = parsed.cardNumber
          }
          
          // Normalize the card number
          if (normalizedCardNumber || setCode) {
            normalizedCardNumber = normalizeOnePieceCardNumber(setCode, normalizedCardNumber || item.card_number)
            
            // Extract set code from normalized number if needed
            if (!setCode && normalizedCardNumber) {
              const match = normalizedCardNumber.match(/^([A-Z]{2}\d{2})-/)
              if (match) setCode = match[1]
            }
          }
        } else if (gameType === 'pokemon') {
          // Try to extract card number from name
          if (!normalizedCardNumber) {
            const parsed = parsePokemonFromTitle(item.name)
            if (parsed.cardNumber) normalizedCardNumber = parsed.cardNumber
          }
        }
        
        // Build canonical key
        const canonicalKey = buildCanonicalCardKey(
          gameType === 'one-piece' ? 'onepiece' : gameType,
          language,
          setCode,
          normalizedCardNumber
        )
        
        if (canonicalKey) {
          if (!dryRun) {
            const { error: updateError } = await supabase
              .from('market_items')
              .update({
                set_code: setCode,
                card_number: normalizedCardNumber,
                normalized_key: canonicalKey,
                language: language,
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.id)
            
            if (updateError) {
              results.errors.push(`${item.id}: ${updateError.message}`)
            } else {
              results.normalized++
            }
          } else {
            results.normalized++
          }
          
          // Store sample for preview
          if (results.samples.length < 10) {
            results.samples.push({
              id: item.id,
              name: item.name,
              original: { set_code: item.set_code, card_number: item.card_number },
              normalized: { set_code: setCode, card_number: normalizedCardNumber, canonical_key: canonicalKey },
            })
          }
        } else {
          results.skipped++
        }
        
      } catch (itemError) {
        const msg = itemError instanceof Error ? itemError.message : 'Unknown error'
        results.errors.push(`${item.id}: ${msg}`)
      }
    }

    // Step 2: Sync to catalog_cards if not dry run
    if (!dryRun && results.normalized > 0) {
      console.log(`[catalog-normalize] Syncing normalized items to catalog_cards...`)
      
      // Get all normalized market_items
      const { data: normalizedItems, error: fetchNormalizedError } = await supabase
        .from('market_items')
        .select('id, name, category, set_code, card_number, set_name, variant, rarity, image_url, language, normalized_key')
        .not('normalized_key', 'is', null)
        .limit(limit)
      
      if (!fetchNormalizedError && normalizedItems) {
        for (const item of normalizedItems) {
          const gameType = item.category?.toLowerCase()?.replace('-', '') || 'unknown'
          
          // Upsert to catalog_cards
          const { error: upsertError } = await supabase
            .from('catalog_cards')
            .upsert({
              game: gameType === 'one-piece' ? 'onepiece' : gameType,
              name: item.name,
              set_code: item.set_code,
              set_name: item.set_name,
              card_number: item.card_number,
              variant: item.variant,
              rarity: item.rarity,
              image_url: item.image_url,
              language: item.language || 'EN',
              normalized_key: item.normalized_key,
            }, {
              onConflict: 'normalized_key',
            })
          
          if (upsertError) {
            console.error(`[catalog-normalize] Upsert error for ${item.id}:`, upsertError.message)
          }
        }
      }
    }
    
    console.log(`[catalog-normalize] Completed - Processed: ${results.processed}, Normalized: ${results.normalized}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`)
    
    return new Response(JSON.stringify({
      success: true,
      dryRun,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[catalog-normalize] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})