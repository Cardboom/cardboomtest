

User wants to continue/expand the catalog scraping pipeline to ingest ALL cards from sets via the crawler. Looking at existing functions:

- `discover-collectr-sets` → finds set URLs via Firecrawl map
- `scrape-collectr-sets` → scrapes set list pages, populates `collectr_scrape_queue`
- `sync-catalog-cards` → syncs from `market_items` to external `catalog_cards`

What's missing: a worker that takes pending sets from `collectr_scrape_queue` and actually scrapes EACH set page for individual cards, then writes them to the external `catalog_cards` table. The current sets are capped at ~20-30 cards because nothing is crawling individual set pages to extract every card.

Plan: build a queue-worker edge function + a cron schedule.

## Plan

### 1. New edge function: `crawl-collectr-cards`
Worker that processes the `collectr_scrape_queue`:
- Pulls N pending rows (default 5/run to stay under Firecrawl rate limits + edge timeout)
- For each set URL: Firecrawl `/scrape` with `waitFor: 8000` and `formats: ['markdown', 'html']`
- Parse markdown to extract every card row (image URL, name, card number, rarity, prices)
- Use deterministic `canonical_key` = `{game}:{setCode}:{cardNumber}:{variant}` (matches existing convention from `sync-catalog-cards`)
- Upsert into EXTERNAL `catalog_cards` (uses `EXTERNAL_SUPABASE_URL` / `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY` per `mem://architecture/external-db-for-catalog-data`)
- Update queue row: `status='completed'`, `cards_inserted`, `last_scraped_at`; on failure `status='failed'` + `error_message` + `attempts++`
- Skip rows where `attempts >= 3`

### 2. Queue table additions (migration)
Add columns to `collectr_scrape_queue` if missing:
- `status` (pending/processing/completed/failed)
- `attempts int default 0`
- `cards_inserted int`
- `error_message text`
- `last_scraped_at timestamptz`
- Index on `(status, attempts)` for fast worker pickup

### 3. Cron schedule
Hourly cron via `pg_cron` + `pg_net` calling `crawl-collectr-cards` with `{ batch_size: 10 }`. Continues until queue drained, self-throttling.

### 4. Admin trigger
Add a "Crawl Cards Now" button in existing `MarketItemsManager` admin panel that POSTs to `crawl-collectr-cards` with a larger batch for manual backfill.

### 5. Anti-manipulation / data integrity
- Dedupe by `canonical_key` upsert (no duplicate cards)
- If parser finds <5 cards on a set page → mark `status='failed'` with reason "parse_low_yield" so we can investigate, don't silently mark completed
- Log every Firecrawl response length + parsed count for observability

### 6. Out of scope (next iteration)
- Pagination across multi-page sets (most Collectr set pages are single-page infinite scroll — `waitFor: 8000` handles it; if still capped we add scroll-render in v2)
- Price ingestion (handled separately by existing pricing pipeline)

## Files

| File | Change |
|---|---|
| `supabase/functions/crawl-collectr-cards/index.ts` | NEW worker |
| `supabase/migrations/<ts>_queue_worker_columns.sql` | Add status/attempts/etc columns + index |
| `supabase/migrations/<ts>_crawl_cron.sql` | Hourly cron job |
| `src/components/admin/MarketItemsManager.tsx` | Add "Crawl Cards Now" button |

## Required secrets (already present)
- `FIRECRAWL_API_KEY` ✅
- `EXTERNAL_SUPABASE_URL` / `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY` ✅

## After deploy
- I'll trigger the worker once manually to verify a set jumps from ~20 → full card count (e.g. OP-11 should hit ~120 cards)
- Cron then drains queue overnight

