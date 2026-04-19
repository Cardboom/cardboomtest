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
  cardNumber: string
  setCode: string
  rarity: string | null
  imageUrl: string | null
  variant: string | null
}

function buildCanonicalKey(game: string, setCode: string, cardNumber: string, variant?: string | null): string {
  const parts = [game.toLowerCase(), setCode.toLowerCase(), cardNumber.toLowerCase()]
  if (variant) parts.push(variant.toLowerCase().replace(/\s+/g, '-'))
  return parts.join(':')
}

// Parse Collectr set page markdown for individual cards.
// Cards typically appear as: ![Name](image-url) followed by "## Name", "CODE-NUM", "Rarity"
function parseCardsFromMarkdown(markdown: string, fallbackSetCode: string): ParsedCard[] {
  const cards: ParsedCard[] = []
  const seen = new Set<string>()
  const lines = markdown.split('\n')

  // Card-number pattern e.g. OP11-001, EB03-053, ST-21-002, SV01-123, BLC-001
  const codeRe = /\b([A-Z]{1,5}\d{0,3}|ST\d{0,3})[\s-]?(\d{2,4})(?:[\s/]+(\w+))?\b/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    // Look for catalog-card image (NOT group/set images)
    const imgMatch = line.match(/!\[([^\]]*)\]\((https:\/\/(?:public\.getcollectr\.com|[^)]*collectr[^)]*)\/[^)]*?(?:cards?|product|catalog)[^)]*)\)/i)
    if (!imgMatch) continue

    const altText = imgMatch[1]?.trim() || ''
    const imageUrl = imgMatch[2].split('?')[0]

    // Skip group/set hero images
    if (imageUrl.includes('catalog-groups') || imageUrl.includes('group_')) continue

    // Look ahead up to 10 lines for name + card number + rarity
    let cardName = altText
    let cardNumber = ''
    let setCode = fallbackSetCode
    let rarity: string | null = null

    for (let j = i + 1; j < Math.min(i + 12, lines.length); j++) {
      const next = lines[j].trim()
      if (!next) continue

      const heading = next.match(/^#{1,4}\s+(.+)$/)
      if (heading && (!cardName || cardName.length < 3)) {
        cardName = heading[1].trim()
        continue
      }

      const codeMatch = next.match(codeRe)
      if (codeMatch && !cardNumber) {
        setCode = codeMatch[1]
        cardNumber = codeMatch[2]
      }

      // Rarity keywords
      const rarityMatch = next.match(/\b(Common|Uncommon|Rare|Super Rare|Secret Rare|Ultra Rare|Special Rare|Promo|Leader|Mythic|Holo|Reverse Holo|Full Art|Alt Art|Secret|SR|UR|SEC|L|C|UC|R|SP)\b/i)
      if (rarityMatch && !rarity) {
        rarity = rarityMatch[1]
      }

      // Stop if we hit the next image
      if (next.startsWith('![')) break
    }

    if (!cardNumber || !cardName) continue

    const key = `${setCode}-${cardNumber}`
    if (seen.has(key)) continue
    seen.add(key)

    cards.push({
      name: cardName,
      cardNumber,
      setCode,
      rarity,
      imageUrl,
      variant: null,
    })
  }

  return cards
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
    const batchSize: number = Math.min(body.batch_size ?? 5, 25)

    // Pull pending rows
    const { data: queue, error: qErr } = await internal
      .from('collectr_scrape_queue')
      .select('id, group_id, set_name, category_id, category_name, url, attempts')
      .in('status', ['pending', 'failed'])
      .lt('attempts', 3)
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

      // Mark as processing
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
        console.log(`[crawl-cards] ${row.set_name}: markdown ${markdown.length} chars`)

        const catId = String(row.category_id)
        const game = CATEGORY_TO_GAME[catId] || 'other'

        // Try to extract a fallback set code from set name (e.g. "OP-11" -> "OP11")
        const setCodeFromName = (row.set_name.match(/\b([A-Z]{1,4})[-\s]?(\d{1,3})\b/i)?.[0] || '')
          .replace(/[-\s]/g, '')
          .toUpperCase()

        const cards = parseCardsFromMarkdown(markdown, setCodeFromName)
        console.log(`[crawl-cards] ${row.set_name}: parsed ${cards.length} cards`)

        if (cards.length < 5) {
          await internal
            .from('collectr_scrape_queue')
            .update({
              status: 'failed',
              error_message: `parse_low_yield: only ${cards.length} cards found (markdown=${markdown.length} chars)`,
              last_scraped_at: new Date().toISOString(),
            })
            .eq('id', row.id)
          summary.failed++
          summary.details.push({ set: row.set_name, cards: cards.length, status: 'failed', error: 'parse_low_yield' })
          continue
        }

        let inserted = 0
        for (const c of cards) {
          const canonicalKey = buildCanonicalKey(game, c.setCode, c.cardNumber, c.variant)
          const { error: upErr } = await external
            .from('catalog_cards')
            .upsert({
              game,
              canonical_key: canonicalKey,
              set_code: c.setCode,
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

        // Throttle Firecrawl
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
