

# Plan: Scrape Collectr Card Database via Firecrawl

## Context
- Collectr blocks direct HTTP requests (403 via CloudFront) on most pages, but Firecrawl can bypass this using its browser rendering.
- The card data page (`/sets/category/{id}/{set-name}?groupId={id}&cardType=cards`) successfully loaded and shows: card name, set name, card number, rarity, variant (Normal/Reverse Holofoil/Holofoil), price, and price change.
- You already have `FIRECRAWL_API_KEY` configured and 776 catalog cards in the database.

## Approach: Two-Phase Edge Function Pipeline

### Phase 1: Discover all sets (new edge function `scrape-collectr-sets`)
- Use Firecrawl to scrape `https://app.getcollectr.com/sets` and each category page (`/sets/category/3` for Pokemon, etc.)
- Extract all set names and `groupId` values from the page
- Store discovered sets in a new `collectr_sets` table for tracking progress

### Phase 2: Scrape cards per set (new edge function `scrape-collectr-cards`)
- For each discovered set+groupId, use Firecrawl to scrape the card list page with `?cardType=cards`
- Parse the markdown/HTML to extract: card name, set name, card number, rarity, variant, finish, price, price change, image URL
- Upsert into `catalog_import_staging` with `source_api = 'collectr'`
- Then promote to `catalog_cards` using existing canonical key logic

### Database Changes
1. **New table `collectr_scrape_queue`**: tracks sets to scrape with columns: `id`, `category_id`, `category_name` (e.g. "Pokemon"), `set_name`, `group_id`, `url`, `status` (pending/scraped/error), `card_count`, `last_scraped_at`

### New Edge Functions
1. **`scrape-collectr-sets`** — Firecrawl scrapes category pages, discovers sets and groupIds, populates the queue table
2. **`scrape-collectr-cards`** — Takes a `group_id` from the queue, scrapes the card page via Firecrawl, parses card data, writes to `catalog_import_staging`, then promotes to `catalog_cards`

### Data Mapping (Collectr → CardBoom)
| Collectr Field | CardBoom Column |
|---|---|
| Card name (e.g. "Spinarak") | `card_name` / `name` |
| Set name (e.g. "Perfect Order") | `set_name` |
| Number (e.g. "001/088") | `card_number` |
| Rarity (e.g. "Common") | `rarity` |
| Variant (e.g. "Normal", "Reverse Holofoil") | `variant` / `finish` |
| Price (e.g. "$0.07") | stored as price event |
| Price change (e.g. "-$0.02(-22.22%)") | stored as price event delta |
| Image URL | `image_url` |

### Canonical Key Format
`pokemon:english:{set_code}:{card_number}:{variant}` — e.g. `pokemon:english:perfect-order:001:normal`

### Rate Limiting & Safety
- Firecrawl calls will be throttled (1 request per 2 seconds)
- Each function processes one set at a time to avoid timeouts
- Queue-based approach allows resuming if interrupted
- Estimated: ~50-100 Firecrawl credits per set (depends on pagination)

### Scope
- 1 new database table
- 2 new edge functions
- ~500 lines of code total

