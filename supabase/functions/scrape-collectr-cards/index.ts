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

  // Collectr format per card block:
  // - ![Name](imageUrl)
  // Name
  // Set Name
  // Rarity•CardNumber
  // Variant (Normal / Holofoil / Reverse Holofoil)
  // $Price
  // PriceChange

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect card block start: line starting with "- ![" containing product image
    const imgMatch = line.match(/^-\s*!\[([^\]]*)\]\((https:\/\/public\.getcollectr\.com\/public-assets\/products\/[^)]+)\)/)
    if (!imgMatch) continue

    const imageUrl = imgMatch[2].split('?')[0]
    
    // Look ahead to collect card info
    let name = ''
    let cardNumber = ''
    let rarity = ''
    let variant = 'Normal'
    let price: number | null = null
    let priceChange: number | null = null

    // Scan the next ~15 lines for this card's data
    for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
      const next = lines[j]

      // Stop if we hit next card block
      if (next.match(/^-\s*!\[/)) break

      // Card name: first non-empty text line after image (not a set name, not a price)
      if (!name && !next.startsWith('$') && !next.startsWith('-$') && !next.startsWith('+$') &&
          !next.includes('•') && !next.match(/^\$/) && next.length > 1 && next.length < 60 &&
          !['Normal', 'Holofoil', 'Reverse Holofoil', 'Full Art', 'Alt Art', 'Manga', 'Parallel', 'Special', 'Textured'].includes(next) &&
          !next.match(/^-?\$[\d.]/) && !next.match(/^\(/) && !next.match(/^Login/) && !next.match(/^Sort/) &&
          !next.match(/^Cards Only/) && !next.match(/^Clear/) && !next.match(/^Best Match/)) {
        name = next
        continue
      }

      // Rarity•CardNumber pattern (e.g. "Common•001/088")
      const rarityNumMatch = next.match(/^(.+?)•(.+)$/)
      if (rarityNumMatch) {
        rarity = rarityNumMatch[1].trim()
        cardNumber = rarityNumMatch[2].trim()
        continue
      }

      // Variant
      const knownVariants = ['Normal', 'Holofoil', 'Reverse Holofoil', 'Full Art', 'Alt Art', 'Manga', 'Parallel', 'Special', 'Textured']
      if (knownVariants.includes(next)) {
        variant = next
        continue
      }

      // Price (e.g. "$0.07" or "$12.50")
      const priceMatch = next.match(/^\$([\d,]+\.?\d*)$/)
      if (priceMatch && price === null) {
        price = parseFloat(priceMatch[1].replace(/,/g, ''))
        continue
      }

      // Price change (e.g. "-$0.02(-22.22%)" or "+$0.05(10.00%)")
      const changeMatch = next.match(/^([+-])\$([\d,]+\.?\d*)\(/)
      if (changeMatch) {
        priceChange = parseFloat(changeMatch[2].replace(/,/g, ''))
        if (changeMatch[1] === '-') priceChange = -priceChange
        continue
      }
    }

    // Skip the set name line (second occurrence of name text = usually set name)
    // We already captured the first text as card name

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

    // Use internal Supabase for all tables (queue + catalog)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(supabaseUrl, supabaseKey)

    const body = await req.json().catch(() => ({}))
    const { group_id, limit = 3, category } = body

    const results = {
      sets_processed: 0,
      cards_found: 0,
      cards_staged: 0,
      cards_promoted: 0,
      errors: [] as string[],
      raw_markdown_preview: '' as string,
    }

    // Get sets from queue (internal DB)
    let query = db
      .from('collectr_scrape_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (group_id) {
      query = db
        .from('collectr_scrape_queue')
        .select('*')
        .eq('group_id', group_id)
        .limit(1)
    } else if (category) {
      query = db
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
        console.log(`[scrape-collectr-cards] Scraping: ${set.set_name} (group=${set.group_id})`)

        await db
          .from('collectr_scrape_queue')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', set.id)

        const scraped = await firecrawlScrape(firecrawlKey, set.url)
        const markdown = scraped.data?.markdown || scraped.markdown || ''

        if (results.sets_processed === 0) {
          results.raw_markdown_preview = markdown.slice(0, 2000)
        }

        const cards = parseCardsFromMarkdown(markdown)
        console.log(`[scrape-collectr-cards] Parsed ${cards.length} cards from ${set.set_name}`)

        results.sets_processed++
        results.cards_found += cards.length

        const game = categoryToGame(set.category_name)
        const setSlug = slugify(set.set_name)

        for (const card of cards) {
          try {
            const numPart = card.cardNumber.replace(/\//g, '-').toLowerCase()
            const variantPart = slugify(card.variant || 'normal')
            const canonicalKey = `${game}:${setSlug}:${numPart}:${variantPart}`

            // Write to external catalog_import_staging
            const { error: stageErr } = await db
              .from('catalog_import_staging')
              .upsert({
                source_api: 'collectr',
                source_id: `collectr:${set.group_id}:${numPart}:${variantPart}`,
                game,
                set_code: setSlug,
                set_name: set.set_name,
                card_number: card.cardNumber,
                card_name: card.name,
                variant: card.variant,
                rarity: card.rarity,
                image_url: card.imageUrl,
                canonical_key: canonicalKey,
                raw_data: {
                  price_usd: card.price,
                  price_change: card.priceChange,
                  collectr_group_id: set.group_id,
                  collectr_category: set.category_name,
                },
                status: 'pending',
              }, { onConflict: 'source_api,source_id' })

            if (stageErr) {
              results.errors.push(`Stage ${card.name}: ${stageErr.message}`)
            } else {
              results.cards_staged++
            }

            // Promote to catalog_cards on external
            const { error: promoErr } = await db
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

            if (promoErr) {
              if (promoErr.code !== '23505') {
                results.errors.push(`Promote ${card.name}: ${promoErr.message}`)
              }
            } else {
              results.cards_promoted++
            }

            // Ingest price event if available
            if (card.price !== null && card.price > 0) {
              await db
                .from('price_events')
                .insert({
                  external_canonical_key: canonicalKey,
                  source: 'collectr',
                  price_usd: card.price,
                  condition: card.variant?.toLowerCase() || 'normal',
                })
                .then(() => {})
            }
          } catch (cardErr: unknown) {
            const msg = cardErr instanceof Error ? cardErr.message : String(cardErr)
            results.errors.push(`Card ${card.name}: ${msg}`)
          }
        }

        // Update queue on internal DB
        await db
          .from('collectr_scrape_queue')
          .update({
            status: cards.length > 0 ? 'scraped' : 'error',
            card_count: cards.length,
            last_scraped_at: new Date().toISOString(),
            error_message: cards.length === 0 ? 'No cards parsed from page' : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', set.id)

        await new Promise(r => setTimeout(r, 2000))
      } catch (setErr: unknown) {
        const msg = setErr instanceof Error ? setErr.message : String(setErr)
        results.errors.push(`Set ${set.set_name}: ${msg}`)
        await db
          .from('collectr_scrape_queue')
          .update({ status: 'error', error_message: msg, updated_at: new Date().toISOString() })
          .eq('id', set.id)
      }
    }

    console.log('[scrape-collectr-cards] Results:', JSON.stringify(results))
    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[scrape-collectr-cards] Error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
