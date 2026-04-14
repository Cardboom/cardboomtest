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
  const lines = markdown.split('\n')

  // Try table format: | col | col | ... |
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line.startsWith('|') || line.includes('---')) continue

    const cells = line.split('|').map(c => c.trim()).filter(Boolean)
    if (cells.length < 3) continue
    if (cells.some(c => c.toLowerCase() === 'name' || c.toLowerCase() === 'card name' || c.toLowerCase() === 'card')) continue

    const card = parseTableRow(cells)
    if (card) cards.push(card)
  }

  // If no table, try block format
  if (cards.length === 0) {
    cards.push(...parseBlockFormat(markdown))
  }

  return cards
}

function parseTableRow(cells: string[]): ParsedCard | null {
  let name = ''
  let cardNumber = ''
  let rarity = ''
  let variant = 'Normal'
  let price: number | null = null
  let priceChange: number | null = null
  let imageUrl: string | null = null

  for (const cell of cells) {
    const imgMatch = cell.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/)
    if (imgMatch) { imageUrl = imgMatch[1]; continue }

    const priceMatch = cell.match(/^\$?([\d,]+\.?\d*)$/)
    if (priceMatch && name) { 
      if (price === null) price = parseFloat(priceMatch[1].replace(/,/g, ''))
      continue
    }

    if (cell.includes('%') && cell.match(/[+-]?\$?[\d.]+/)) {
      const cm = cell.match(/([+-]?\$?[\d,.]+)/)
      if (cm) { priceChange = parseFloat(cm[1].replace(/[$,]/g, '')); continue }
    }

    const numMatch = cell.match(/^(\d{1,4}\/\d{1,4}|\w{2,5}-\d{2,4})$/)
    if (numMatch) { cardNumber = numMatch[1]; continue }

    const rarities = ['common','uncommon','rare','super rare','secret rare','ultra rare','holo rare','double rare','illustration rare','special art rare','art rare','hyper rare','promo','leader','don']
    if (rarities.includes(cell.toLowerCase())) { rarity = cell; continue }

    const variants = ['normal','holofoil','reverse holofoil','full art','alt art','manga','parallel','special','textured']
    if (variants.includes(cell.toLowerCase())) { variant = cell; continue }

    if (!name && cell.length > 1 && !cell.match(/^\d+$/)) {
      name = cell.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim()
    }
  }

  return name ? { name, cardNumber, rarity, variant, price, priceChange, imageUrl } : null
}

function parseBlockFormat(markdown: string): ParsedCard[] {
  const cards: ParsedCard[] = []

  // Look for patterns like card entries in a list/grid
  // Common: "**Card Name** 001/088 Common Normal $0.07"
  // Or structured blocks with image + name + number
  const cardPattern = /(?:^|\n)\s*(?:\*\*|#{1,4}\s*)?([A-Z][a-zA-Zé'.\- ]+?)(?:\*\*)?\s+(\d{1,4}[\/\-]\d{1,4}|\w{2,5}-\d{2,4})\s+(\w[\w ]*?)\s+(?:Normal|Holofoil|Reverse Holofoil|Parallel|Special)?\s*\$?([\d.]+)?/gm
  let match
  while ((match = cardPattern.exec(markdown)) !== null) {
    cards.push({
      name: match[1].trim(),
      cardNumber: match[2],
      rarity: match[3]?.trim() || '',
      variant: 'Normal',
      price: match[4] ? parseFloat(match[4]) : null,
      priceChange: null,
      imageUrl: null,
    })
  }

  // Simpler fallback
  if (cards.length === 0) {
    const simplePattern = /([A-Z][a-zA-Zé'. -]+?)\s+(\d{1,4}\/\d{1,4}|\w{2,5}-\d{2,4})/g
    while ((match = simplePattern.exec(markdown)) !== null) {
      const name = match[1].trim()
      if (name.length > 2 && name.length < 50) {
        cards.push({ name, cardNumber: match[2], rarity: '', variant: 'Normal', price: null, priceChange: null, imageUrl: null })
      }
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

    // Internal Supabase for queue table
    const internalUrl = Deno.env.get('SUPABASE_URL')!
    const internalKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const internalDb = createClient(internalUrl, internalKey)

    // External Supabase for catalog data
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL')!
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY')!
    const externalDb = createClient(externalUrl, externalKey)

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
        console.log(`[scrape-collectr-cards] Scraping: ${set.set_name} (group=${set.group_id})`)

        await internalDb
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
            const { error: stageErr } = await externalDb
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
            const { error: promoErr } = await externalDb
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
              await externalDb
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
        await internalDb
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
        await internalDb
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
