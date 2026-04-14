import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2'

function categoryToGame(categoryName: string): string {
  const n = categoryName.toLowerCase()
  if (n.includes('pokemon')) return 'pokemon'
  if (n.includes('one piece')) return 'onepiece'
  if (n.includes('magic')) return 'mtg'
  if (n.includes('yu-gi-oh') || n.includes('yugioh')) return 'yugioh'
  if (n.includes('lorcana')) return 'lorcana'
  if (n.includes('digimon')) return 'digimon'
  if (n.includes('dragon ball')) return 'dbs'
  return 'other'
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function firecrawlScrape(apiKey: string, url: string): Promise<any> {
  const response = await fetch(`${FIRECRAWL_V2}/scrape`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 5000,
    }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `Firecrawl ${response.status}`)
  return data
}

interface ParsedCard {
  name: string
  cardNumber: string
  rarity: string
  variant: string
  price: number | null
  priceChange: number | null
  imageUrl: string | null
}

function parseCardsFromMarkdown(markdown: string): ParsedCard[] {
  const cards: ParsedCard[] = []
  const lines = markdown.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const imgMatch = line.match(/^-\s*!\[([^\]]*)\]\((https:\/\/public\.getcollectr\.com\/public-assets\/products\/[^)]+)\)/)
    if (!imgMatch) continue

    const imageUrl = imgMatch[2].split('?')[0]
    let name = ''
    let cardNumber = ''
    let rarity = ''
    let variant = 'Normal'
    let price: number | null = null
    let priceChange: number | null = null

    for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
      const next = lines[j]
      if (next.match(/^-\s*!\[/)) break

      if (!name && !next.startsWith('$') && !next.startsWith('-$') && !next.startsWith('+$') &&
          !next.includes('•') && !next.match(/^\$/) && next.length > 1 && next.length < 60 &&
          !['Normal', 'Holofoil', 'Reverse Holofoil', 'Full Art', 'Alt Art', 'Manga', 'Parallel', 'Special', 'Textured'].includes(next) &&
          !next.match(/^-?\$[\d.]/) && !next.match(/^\(/) && !next.match(/^Login/) && !next.match(/^Sort/) &&
          !next.match(/^Cards Only/) && !next.match(/^Clear/) && !next.match(/^Best Match/)) {
        name = next
        continue
      }

      const rarityNumMatch = next.match(/^(.+?)•(.+)$/)
      if (rarityNumMatch) {
        rarity = rarityNumMatch[1].trim()
        cardNumber = rarityNumMatch[2].trim()
        continue
      }

      const knownVariants = ['Normal', 'Holofoil', 'Reverse Holofoil', 'Full Art', 'Alt Art', 'Manga', 'Parallel', 'Special', 'Textured']
      if (knownVariants.includes(next)) {
        variant = next
        continue
      }

      const priceMatch = next.match(/^\$([\d,]+\.?\d*)$/)
      if (priceMatch && price === null) {
        price = parseFloat(priceMatch[1].replace(/,/g, ''))
        continue
      }

      const changeMatch = next.match(/^([+-])\$([\d,]+\.?\d*)\(/)
      if (changeMatch) {
        priceChange = parseFloat(changeMatch[2].replace(/,/g, ''))
        if (changeMatch[1] === '-') priceChange = -priceChange
        continue
      }
    }

    if (name && cardNumber) {
      cards.push({ name, cardNumber, rarity, variant, price, priceChange, imageUrl })
    }
  }

  return cards
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlKey) throw new Error('FIRECRAWL_API_KEY not configured')

    const internalDb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const extUrl = Deno.env.get('EXTERNAL_SUPABASE_URL')
    const extKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY')
    if (!extUrl || !extKey) throw new Error('External Supabase credentials not configured')
    const extDb = createClient(extUrl, extKey)

    const body = await req.json().catch(() => ({}))
    const { group_id, limit = 1, category } = body

    const results = {
      sets_processed: 0,
      cards_found: 0,
      cards_staged: 0,
      cards_promoted: 0,
      pages_scraped: 0,
      errors: [] as string[],
    }

    let query = internalDb
      .from('collectr_scrape_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (group_id) {
      query = internalDb
        .from('collectr_scrape_queue')
        .select('*')
        .eq('group_id', group_id)
        .limit(1)
    } else if (category) {
      query = internalDb
        .from('collectr_scrape_queue')
        .select('*')
        .ilike('category_name', `%${category}%`)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(limit)
    }

    const { data: sets, error: fetchErr } = await query
    if (fetchErr) throw fetchErr
    if (!sets?.length) {
      return new Response(JSON.stringify({ message: 'No pending sets in queue', ...results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    for (const set of sets) {
      try {
        console.log(`[scrape] Scraping: ${set.set_name}`)

        await internalDb
          .from('collectr_scrape_queue')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', set.id)

        let allCards: ParsedCard[] = []
        let page = 1
        const MAX_PAGES = 10 // Safety limit

        // Paginate through all cards in the set
        while (page <= MAX_PAGES) {
          const pageUrl = page === 1 
            ? set.url 
            : `${set.url}${set.url.includes('?') ? '&' : '?'}page=${page}`
          
          console.log(`[scrape] Page ${page}: ${pageUrl}`)
          
          try {
            const scraped = await firecrawlScrape(firecrawlKey, pageUrl)
            const markdown = scraped.data?.markdown || scraped.markdown || ''
            const pageCards = parseCardsFromMarkdown(markdown)
            
            console.log(`[scrape] Page ${page}: ${pageCards.length} cards`)
            results.pages_scraped++
            
            if (pageCards.length === 0) break // No more cards on this page
            
            allCards = allCards.concat(pageCards)
            
            // If we got fewer than ~28 cards, probably the last page
            if (pageCards.length < 25) break
            
            page++
            await new Promise(r => setTimeout(r, 1500)) // Rate limit between pages
          } catch (pageErr: unknown) {
            const msg = pageErr instanceof Error ? pageErr.message : String(pageErr)
            console.log(`[scrape] Page ${page} error: ${msg}`)
            break // Stop paginating on error
          }
        }

        console.log(`[scrape] Total cards for ${set.set_name}: ${allCards.length} across ${page} pages`)

        results.sets_processed++
        results.cards_found += allCards.length

        const game = categoryToGame(set.category_name)
        const setSlug = slugify(set.set_name)

        for (const card of allCards) {
          try {
            const numPart = card.cardNumber.replace(/\//g, '-').toLowerCase()
            const variantPart = slugify(card.variant || 'normal')
            const canonicalKey = `${game}:${setSlug}:${numPart}:${variantPart}`

            const { error: stageErr } = await extDb
              .from('catalog_import_staging')
              .upsert({
                game,
                set_code: setSlug,
                set_name: set.set_name,
                card_number: card.cardNumber,
                name: card.name,
                variant: card.variant,
                rarity: card.rarity,
                image_url: card.imageUrl,
                canonical_key: canonicalKey,
                status: 'pending',
              }, { onConflict: 'canonical_key' })

            if (stageErr) {
              results.errors.push(`Stage ${card.name}: ${stageErr.message}`)
            } else {
              results.cards_staged++
            }

            const { error: promoErr } = await extDb
              .from('catalog_cards')
              .upsert({
                game,
                canonical_key: canonicalKey,
                set_code: setSlug,
                set_name: set.set_name,
                card_number: card.cardNumber,
                name: card.name,
                variant: card.variant,
                rarity: card.rarity,
                image_url: card.imageUrl,
              }, { onConflict: 'canonical_key' })

            if (promoErr && promoErr.code !== '23505') {
              results.errors.push(`Promote ${card.name}: ${promoErr.message}`)
            } else {
              results.cards_promoted++
            }

            if (card.price !== null && card.price > 0) {
              // Save to card_prices (latest price)
              await internalDb
                .from('card_prices')
                .upsert({
                  canonical_card_key: canonicalKey,
                  source: 'collectr',
                  price: card.price,
                  market_price: card.price,
                  condition: card.variant?.toLowerCase() || 'normal',
                }, { onConflict: 'canonical_card_key,source' })
                .then(() => {})

              // Also write a price snapshot for the catalog card (for chart history)
              // Look up the catalog_card_id from external DB
              const { data: catCard } = await extDb
                .from('catalog_cards')
                .select('id')
                .eq('canonical_key', canonicalKey)
                .maybeSingle()

              if (catCard?.id) {
                const today = new Date().toISOString().split('T')[0]
                await internalDb
                  .from('card_price_snapshots')
                  .upsert({
                    catalog_card_id: catCard.id,
                    snapshot_date: today,
                    median_usd: card.price,
                    low_usd: card.price,
                    high_usd: card.price,
                    liquidity_count: 1,
                    confidence: 0.6,
                    sources: { collectr: card.price },
                  }, { onConflict: 'catalog_card_id,snapshot_date' })
                  .then(() => {})
              }
            }
          } catch (cardErr: unknown) {
            const msg = cardErr instanceof Error ? cardErr.message : String(cardErr)
            results.errors.push(`Card ${card.name}: ${msg}`)
          }
        }

        await internalDb
          .from('collectr_scrape_queue')
          .update({
            status: allCards.length > 0 ? 'scraped' : 'error',
            card_count: allCards.length,
            last_scraped_at: new Date().toISOString(),
            error_message: allCards.length === 0 ? 'No cards parsed' : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', set.id)

        await new Promise(r => setTimeout(r, 2000))
      } catch (setErr: unknown) {
        const msg = setErr instanceof Error ? setErr.message : String(setErr)
        results.errors.push(`Set ${set.set_name}: ${msg}`)
        await internalDb
          .from('collectr_scrape_queue')
          .update({ status: 'error', error_message: msg, updated_at: new Date().toISOString() })
          .eq('id', set.id)
      }
    }

    console.log('[scrape] Results:', JSON.stringify(results))
    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[scrape] Error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
