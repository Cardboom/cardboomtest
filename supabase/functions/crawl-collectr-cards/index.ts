import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2'

const CATEGORY_TO_GAME: Record<string, string> = {
  '1': 'mtg',
  '2': 'yugioh',
  '3': 'pokemon',
  '63': 'digimon',
  '68': 'onepiece',
  '71': 'lorcana',
  '80': 'dbs',
}

interface ParsedCard {
  name: string
  cardNumber: string  // e.g. "001"
  cardNumberFull: string  // e.g. "001/159"
  rarity: string | null
  imageUrl: string | null
  variant: string | null  // Normal, Reverse Holofoil, Holofoil, etc.
  productId: string | null
}

function buildCanonicalKey(game: string, setCode: string, cardNumber: string, variant?: string | null): string {
  const parts = [game.toLowerCase(), setCode.toLowerCase(), cardNumber.toLowerCase()]
  if (variant && variant.toLowerCase() !== 'normal') {
    parts.push(variant.toLowerCase().replace(/\s+/g, '-'))
  }
  return parts.join(':')
}

// Derive set code from set name when not present in card data.
// e.g. "OP-11" -> "OP11", "Crown Zenith" -> "CROWNZENITH" (slug fallback)
function deriveSetCode(setName: string, fallback?: string): string {
  if (fallback) return fallback.toUpperCase()
  const codeMatch = setName.match(/\b([A-Z]{1,5})[-\s]?(\d{1,3})\b/)
  if (codeMatch) return (codeMatch[1] + codeMatch[2]).toUpperCase()
  return setName.replace(/[^A-Za-z0-9]+/g, '').toUpperCase().slice(0, 16)
}

/**
 * Parse Collectr set page markdown. Card entries look like:
 *
 *   - ![Name ](.../products/product_NNNNN.jpg...)
 *
 *     Name
 *
 *     Set Name
 *
 *     Rarity•XXX/YYY
 *
 *     Variant
 *
 *     $price
 */
function parseCardsFromMarkdown(markdown: string): ParsedCard[] {
  const cards: ParsedCard[] = []
  const lines = markdown.split('\n').map(l => l.trim())

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Match product image
    const imgMatch = line.match(/!\[([^\]]*)\]\((https:\/\/[^)]*\/products\/product_(\d+)\.[^)]+)\)/)
    if (!imgMatch) continue

    const altName = imgMatch[1]?.trim() || ''
    const imageUrl = imgMatch[2].split('?')[0]
    const productId = imgMatch[3]

    // Look ahead up to ~25 lines for: name, set, rarity•number, variant
    let name = altName
    let cardNumber = ''
    let cardNumberFull = ''
    let rarity: string | null = null
    let variant: string | null = null

    let captured = 0
    for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
      const next = lines[j]
      if (!next) continue

      // Stop at next product image
      if (next.match(/!\[[^\]]*\]\([^)]*\/products\/product_/)) break

      // Rarity•cardnumber pattern: "Common•001/159" or "Super Rare•OP11-001"
      const rarityNumMatch = next.match(/^([A-Za-z][A-Za-z\s]+?)\s*[•·]\s*([A-Z0-9-]+\/\d+|\w+-\d+|\d+\/\d+|\d{2,4})\s*$/)
      if (rarityNumMatch && !cardNumber) {
        rarity = rarityNumMatch[1].trim()
        cardNumberFull = rarityNumMatch[2].trim()
        // Extract just the card number portion: "001/159" -> "001", "OP11-001" -> "001"
        const numOnly = cardNumberFull.match(/(\d+)\/\d+/) || cardNumberFull.match(/-(\d+)$/) || cardNumberFull.match(/^(\d+)$/)
        cardNumber = numOnly ? numOnly[1] : cardNumberFull
        captured++
        continue
      }

      // Variant detection (after we have rarity)
      if (rarity && !variant) {
        const v = next.match(/^(Normal|Reverse Holofoil|Holofoil|Foil|Reverse Foil|Holo|Reverse Holo|Promo|Parallel|1st Edition|Unlimited|Alt Art|Full Art|Showcase|Etched|Borderless)$/i)
        if (v) {
          variant = v[1]
          captured++
          continue
        }
      }

      // Name fallback: first plain text line after image, before rarity
      if (!cardNumber && !name && next.length > 0 && next.length < 100 && !next.startsWith('$') && !next.startsWith('![') && !next.startsWith('-') && !next.startsWith('#')) {
        name = next
      }
    }

    if (!cardNumber) continue
    cards.push({
      name: name || `Card ${productId}`,
      cardNumber,
      cardNumberFull,
      rarity,
      imageUrl,
      variant,
      productId,
    })
  }

  // Dedupe by productId+variant
  const seen = new Set<string>()
  return cards.filter(c => {
    const k = `${c.productId}:${c.variant || 'normal'}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlKey) throw new Error('FIRECRAWL_API_KEY not configured')

    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL')
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY')
    if (!externalUrl || !externalKey) throw new Error('EXTERNAL_SUPABASE_* not configured')

    const internal = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const external = createClient(externalUrl, externalKey)

    const body = await req.json().catch(() => ({}))
    const batchSize: number = Math.min(body.batch_size ?? 3, 10)

    // Only crawl rows that have a real groupId in the URL — others are useless
    const { data: queue, error: qErr } = await internal
      .from('collectr_scrape_queue')
      .select('id, group_id, set_name, category_id, category_name, url, attempts')
      .in('status', ['pending', 'failed', 'error', 'scraped', 'processing'])
      .lt('attempts', 3)
      .like('url', '%groupId=%')
      .order('last_scraped_at', { ascending: true, nullsFirst: true })
      .limit(batchSize)

    if (qErr) throw qErr

    const summary = {
      processed: 0,
      completed: 0,
      failed: 0,
      total_cards_inserted: 0,
      details: [] as Array<{ set: string; cards: number; status: string; error?: string }>,
    }

    for (const row of queue || []) {
      summary.processed++

      await internal
        .from('collectr_scrape_queue')
        .update({ status: 'processing', attempts: (row.attempts || 0) + 1 })
        .eq('id', row.id)

      try {
        const fcRes = await fetch(`${FIRECRAWL_V2}/scrape`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: row.url,
            formats: ['markdown'],
            onlyMainContent: true,
            waitFor: 8000,
          }),
        })
        const fcData = await fcRes.json()
        if (!fcRes.ok) throw new Error(fcData.error || `Firecrawl ${fcRes.status}`)

        const markdown: string = fcData.data?.markdown || fcData.markdown || ''
        const game = CATEGORY_TO_GAME[String(row.category_id)] || 'other'
        const cards = parseCardsFromMarkdown(markdown)

        console.log(`[crawl-cards] ${row.set_name} (group=${row.group_id}): md=${markdown.length}b, parsed=${cards.length}`)

        if (cards.length < 5) {
          await internal
            .from('collectr_scrape_queue')
            .update({
              status: 'failed',
              error_message: `parse_low_yield: ${cards.length} cards (md=${markdown.length}b)`,
              last_scraped_at: new Date().toISOString(),
            })
            .eq('id', row.id)
          summary.failed++
          summary.details.push({ set: row.set_name, cards: cards.length, status: 'failed', error: 'parse_low_yield' })
          continue
        }

        // Derive set code: prefer card-number prefix (e.g. OP11-001 -> OP11), otherwise from set name
        const codeFromCard = cards.find(c => c.cardNumberFull.match(/^[A-Z]+\d*-\d+/))?.cardNumberFull.match(/^([A-Z]+\d*)-/)?.[1]
        const setCode = deriveSetCode(row.set_name, codeFromCard)

        let inserted = 0
        for (const c of cards) {
          const canonicalKey = buildCanonicalKey(game, setCode, c.cardNumber, c.variant)
          const { error: upErr } = await external
            .from('catalog_cards')
            .upsert({
              game,
              canonical_key: canonicalKey,
              set_code: setCode,
              set_name: row.set_name,
              card_number: c.cardNumber,
              variant: c.variant,
              rarity: c.rarity,
              image_url: c.imageUrl,
              name: c.name,
            }, { onConflict: 'canonical_key', ignoreDuplicates: false })

          if (!upErr) inserted++
          else console.log(`[crawl-cards] upsert err ${canonicalKey}: ${upErr.message}`)
        }

        await internal
          .from('collectr_scrape_queue')
          .update({
            status: 'completed',
            cards_inserted: inserted,
            error_message: null,
            last_scraped_at: new Date().toISOString(),
          })
          .eq('id', row.id)

        summary.completed++
        summary.total_cards_inserted += inserted
        summary.details.push({ set: row.set_name, cards: inserted, status: 'completed' })

        await new Promise(r => setTimeout(r, 1500))
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[crawl-cards] ${row.set_name} failed: ${msg}`)
        await internal
          .from('collectr_scrape_queue')
          .update({
            status: 'failed',
            error_message: msg.slice(0, 500),
            last_scraped_at: new Date().toISOString(),
          })
          .eq('id', row.id)
        summary.failed++
        summary.details.push({ set: row.set_name, cards: 0, status: 'failed', error: msg })
      }
    }

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[crawl-collectr-cards] error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
