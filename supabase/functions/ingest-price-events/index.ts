import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IngestRequest {
  source: 'cardmarket' | 'ebay' | 'pricecharting' | 'manual'
  category?: string
  limit?: number
  marketItemIds?: string[]
}

// Canonical key builders per TCG
function buildCanonicalKey(item: {
  category: string
  set_code?: string
  card_number?: string
  collector_number?: string
  card_code?: string
  variant?: string
  language?: string
}): string | null {
  const cat = item.category?.toLowerCase()
  
  if (cat === 'one-piece' || cat === 'onepiece') {
    // One Piece: onepiece:{card_code} e.g. onepiece:OP01-016
    const code = item.card_code || (item.set_code && item.card_number ? `${item.set_code}-${item.card_number}` : null)
    if (code) return `onepiece:${code.toUpperCase()}`
  }
  
  if (cat === 'mtg' || cat === 'magic') {
    // MTG: mtg:{set_code}:{collector_number}
    const setCode = item.set_code?.toLowerCase()
    const num = item.collector_number || item.card_number
    if (setCode && num) return `mtg:${setCode}:${num}`
  }
  
  if (cat === 'pokemon') {
    // Pokemon: pokemon:{set_code}:{collector_number}:{variant}:{finish}
    const setCode = item.set_code?.toLowerCase()
    const num = item.collector_number || item.card_number
    const variant = item.variant || 'normal'
    if (setCode && num) return `pokemon:${setCode}:${num}:${variant}`
  }
  
  if (cat === 'yugioh') {
    // Yu-Gi-Oh: yugioh:{set_code}:{card_number}
    const setCode = item.set_code?.toUpperCase()
    const num = item.card_number
    if (setCode && num) return `yugioh:${setCode}:${num}`
  }
  
  if (cat === 'lorcana') {
    // Lorcana: lorcana:{set_code}:{collector_number}
    const setCode = item.set_code?.toLowerCase()
    const num = item.collector_number || item.card_number
    if (setCode && num) return `lorcana:${setCode}:${num}`
  }
  
  return null
}

// Match confidence calculator
function calculateMatchConfidence(
  externalName: string,
  internalName: string,
  hasExactCardNumber: boolean
): number {
  if (hasExactCardNumber) return 1.0
  
  const extNorm = externalName.toLowerCase().replace(/[^a-z0-9]/g, '')
  const intNorm = internalName.toLowerCase().replace(/[^a-z0-9]/g, '')
  
  if (extNorm === intNorm) return 0.95
  if (extNorm.includes(intNorm) || intNorm.includes(extNorm)) return 0.90
  
  // Simple similarity check
  const longer = extNorm.length > intNorm.length ? extNorm : intNorm
  const shorter = extNorm.length > intNorm.length ? intNorm : extNorm
  const matchingChars = shorter.split('').filter((c, i) => longer[i] === c).length
  const similarity = matchingChars / longer.length
  
  return Math.round(similarity * 100) / 100
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ebayKey = Deno.env.get('EBAY_RAPIDAPI_KEY')
    const cardmarketKey = Deno.env.get('CARDMARKET_RAPIDAPI_KEY')
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { source, category, limit = 100, marketItemIds }: IngestRequest = await req.json().catch(() => ({}))
    
    console.log(`[ingest-price-events] Starting ingestion - source: ${source}, category: ${category}, limit: ${limit}`)
    
    const results = {
      events_created: 0,
      items_matched: 0,
      queued_for_review: 0,
      errors: [] as string[],
    }

    // Get market items to process
    let query = supabase
      .from('market_items')
      .select('id, name, category, set_code, card_number, collector_number, card_code, variant, language, external_canonical_key')
      .limit(limit)
    
    if (category) {
      query = query.eq('category', category)
    }
    
    if (marketItemIds && marketItemIds.length > 0) {
      query = query.in('id', marketItemIds)
    }
    
    const { data: items, error: fetchError } = await query
    if (fetchError) throw fetchError
    
    console.log(`[ingest-price-events] Processing ${items?.length || 0} items`)
    if (items?.length) {
      console.log(`[ingest-price-events] First item: ${items[0].name} (${items[0].category}), set_code: ${items[0].set_code}, card_number: ${items[0].card_number}`)
    }

    for (const item of items || []) {
      try {
        // Build canonical key
        const canonicalKey = buildCanonicalKey(item)
        console.log(`[ingest-price-events] Item ${item.name} -> canonical key: ${canonicalKey}`)
        
        // Update market_items with canonical key if not set
        if (canonicalKey && !item.external_canonical_key) {
          await supabase
            .from('market_items')
            .update({ 
              external_canonical_key: canonicalKey,
              tcg: item.category?.replace('-', '')
            })
            .eq('id', item.id)
        }

        // Fetch prices based on source
        if (source === 'ebay' && ebayKey) {
          // Build eBay search query
          const searchParts = [item.name]
          if (item.set_code && item.card_number) {
            searchParts.push(`${item.set_code}-${item.card_number}`)
          }
          const searchQuery = searchParts.join(' ')
          
          // Fetch SOLD listings
          const soldUrl = `https://ebay-search-result.p.rapidapi.com/search/${encodeURIComponent(searchQuery)}?page=1&type=sold`
          console.log(`[ingest-price-events] eBay search: ${soldUrl}`)
          
          const soldResponse = await fetch(soldUrl, {
            headers: {
              'X-RapidAPI-Key': ebayKey,
              'X-RapidAPI-Host': 'ebay-search-result.p.rapidapi.com',
            },
          })
          
          console.log(`[ingest-price-events] eBay response status: ${soldResponse.status}`)
          
          if (soldResponse.ok) {
            const soldData = await soldResponse.json()
            console.log(`[ingest-price-events] eBay data: ${JSON.stringify(soldData).slice(0, 500)}`)
            const soldResults = soldData.results || soldData.data || soldData.items || []
            console.log(`[ingest-price-events] Found ${soldResults.length} sold listings`)
            
            // Create price events for each sold item
            for (const listing of soldResults.slice(0, 10)) {
              const price = parseFloat(listing.price || listing.sold_price || listing.soldPrice || '0')
              console.log(`[ingest-price-events] Processing listing: ${listing.title?.slice(0, 50)}, price: ${price}`)
              if (price <= 0) continue
              
              // Check if this is an outlier (lot, bundle, damaged, etc.)
              const title = (listing.title || '').toLowerCase()
              const isOutlier = ['lot', 'bundle', 'proxy', 'custom', 'digital', 'damaged', 'case only', 'empty', 'box only']
                .some(term => title.includes(term))
              
              const eventId = listing.id || listing.itemId || `ebay_${Date.now()}_${Math.random().toString(36).slice(2)}`
              
              const { error: insertError } = await supabase
                .from('price_events')
                .upsert({
                  source: 'ebay',
                  source_event_id: String(eventId),
                  external_url: listing.link || listing.url || listing.itemUrl,
                  raw_json: listing,
                  external_canonical_key: canonicalKey,
                  currency: 'USD',
                  total_price: price,
                  total_usd: price,
                  event_type: 'sale',
                  sold_at: listing.sold_date || listing.soldDate ? new Date(listing.sold_date || listing.soldDate).toISOString() : new Date().toISOString(),
                  matched_market_item_id: item.id,
                  match_confidence: canonicalKey ? 1.0 : 0.85,
                  is_outlier: isOutlier,
                  outlier_reason: isOutlier ? 'Filtered keywords detected in title' : null,
                }, { onConflict: 'source,source_event_id' })
              
              if (insertError) {
                console.log(`[ingest-price-events] Insert error: ${insertError.message}`)
              } else {
                results.events_created++
              }
            }
            results.items_matched++
          } else {
            const errText = await soldResponse.text()
            console.log(`[ingest-price-events] eBay error: ${errText.slice(0, 200)}`)
          }
          
          // Rate limit
          await new Promise(r => setTimeout(r, 250))
        }
        
        if (source === 'cardmarket' && cardmarketKey) {
          const gameMap: Record<string, string> = {
            'pokemon': 'pokemon',
            'lorcana': 'lorcana',
            'mtg': 'magic-the-gathering',
            'yugioh': 'yugioh',
            'one-piece': 'one-piece',
            'onepiece': 'one-piece',
          }
          
          const game = gameMap[item.category] || 'pokemon'
          
          // Search for card on Cardmarket
          const searchUrl = `https://cardmarket-api-tcg.p.rapidapi.com/${game}/cards?search=${encodeURIComponent(item.name)}&page=1`
          console.log(`[ingest-price-events] Cardmarket search: ${searchUrl}`)
          
          const searchResponse = await fetch(searchUrl, {
            headers: {
              'X-RapidAPI-Key': cardmarketKey,
              'X-RapidAPI-Host': 'cardmarket-api-tcg.p.rapidapi.com',
            },
          })
          
          console.log(`[ingest-price-events] Cardmarket response status: ${searchResponse.status}`)
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json()
            console.log(`[ingest-price-events] Cardmarket data keys: ${Object.keys(searchData).join(', ')}`)
            const cards = searchData.data || searchData.cards || searchData.products || []
            console.log(`[ingest-price-events] Found ${cards.length} cards`)
            
            // Find best match
            let bestMatch = null
            let bestConfidence = 0
            
            for (const card of cards.slice(0, 5)) {
              const cardNumber = card.number || card.collector_number
              const hasExactNumber = item.card_number && cardNumber && 
                cardNumber.toString() === item.card_number.toString()
              
              const confidence = calculateMatchConfidence(
                card.name || '',
                item.name,
                hasExactNumber
              )
              
              if (confidence > bestConfidence) {
                bestConfidence = confidence
                bestMatch = card
              }
            }
            
            if (bestMatch && bestConfidence >= 0.90) {
              // Get price from best match
              const price = bestMatch.averageSellPrice || bestMatch.trendPrice || bestMatch.priceEUR || bestMatch.lowestPrice
              
              if (price && price > 0) {
                const eventId = `cm_${bestMatch.id || Date.now()}`
                
                const { error: insertError } = await supabase
                  .from('price_events')
                  .upsert({
                    source: 'cardmarket',
                    source_event_id: eventId,
                    external_url: bestMatch.url || `https://www.cardmarket.com/en/${game}/Cards/${bestMatch.id}`,
                    raw_json: bestMatch,
                    external_canonical_key: canonicalKey,
                    currency: 'EUR',
                    total_price: price,
                    total_eur: price,
                    total_usd: price * 1.08, // Approximate EUR to USD
                    event_type: 'trend',
                    matched_market_item_id: item.id,
                    match_confidence: bestConfidence,
                    is_outlier: false,
                  }, { onConflict: 'source,source_event_id' })
                
                if (!insertError) {
                  results.events_created++
                  
                  // Update market_items with cardmarket reference
                  await supabase
                    .from('market_items')
                    .update({
                      cardmarket_id: String(bestMatch.id),
                      cardmarket_trend: price,
                      match_source: 'cardmarket',
                      match_confidence: bestConfidence,
                    })
                    .eq('id', item.id)
                }
                results.items_matched++
              }
            } else if (bestMatch && bestConfidence >= 0.70) {
              // Queue for manual review
              await supabase.from('match_review_queue').insert({
                source: 'cardmarket',
                source_event_id: `cm_${bestMatch.id}`,
                external_data: {
                  name: bestMatch.name,
                  number: bestMatch.number,
                  set: bestMatch.expansion || bestMatch.set,
                  price: bestMatch.averageSellPrice || bestMatch.trendPrice,
                  image: bestMatch.image,
                },
                proposed_market_item_id: item.id,
                proposed_confidence: bestConfidence,
                reason: `Confidence ${(bestConfidence * 100).toFixed(0)}% - needs manual verification`,
                status: 'pending',
              })
              results.queued_for_review++
            }
          }
          
          // Rate limit
          await new Promise(r => setTimeout(r, 300))
        }
        
      } catch (itemError) {
        const msg = itemError instanceof Error ? itemError.message : 'Unknown error'
        results.errors.push(`${item.id}: ${msg}`)
        console.error(`[ingest-price-events] Error processing ${item.id}:`, itemError)
      }
    }
    
    console.log(`[ingest-price-events] Completed - Events: ${results.events_created}, Matched: ${results.items_matched}, Queued: ${results.queued_for_review}`)
    
    return new Response(JSON.stringify({
      success: true,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[ingest-price-events] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})