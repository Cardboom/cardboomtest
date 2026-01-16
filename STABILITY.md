# CardBoom Stability Release

## What Was Fixed

### 1. Unified Pricing Service (`src/services/pricingService.ts`)
- **Single source of truth** for all pricing data
- **Stale-while-revalidate caching** with configurable TTLs (5min fresh, 30min stale)
- **Price validation** - rejects null/NaN/zero/suspicious changes (>90% swing)
- **Fallback logic** - returns last known good value with low confidence on failure
- **Confidence scoring** based on data quality (sales count, recency, source)

### 2. Centralized Error Reporting (`src/services/errorReporter.ts`)
- Captures failed price fetches, image load failures, API timeouts
- In-memory log with export capability
- Real-time subscriber pattern for monitoring

### 3. Card Schema Validation (`src/services/cardSchema.ts`)
- Strict schema with required/optional fields
- Normalization for category, rarity, condition, language
- Validation on ingest with error/warning separation
- `fillUnknownFields()` for backfill jobs

### 4. Image Reliability (`src/components/ui/optimized-image.tsx`)
- Lazy loading with IntersectionObserver
- Skeleton placeholders during load
- Automatic retry on failure (2 attempts)
- Error fallback with manual retry option
- Aspect ratio boxes prevent layout shift

### 5. Debug Mode & Diagnostics (`src/contexts/DebugContext.tsx`, `src/components/admin/DiagnosticsDashboard.tsx`)
- Admin-only debug toggle
- Shows data source, cache status, timestamps, confidence
- Error log viewer with filtering
- Cache statistics display

## How to Debug

### Enable Debug Mode
1. Log in as admin
2. Go to Admin → Diagnostics tab
3. Toggle "Debug Mode" ON
4. Hover over any card/price to see debug overlay

### View Error Log
- Admin → Diagnostics → Error Log section
- Filter by category (pricing/image/api) or severity
- Export to JSON for analysis

### Check Cache Status
- Admin → Diagnostics → Cache Status card
- Shows cached item count, oldest/newest entries
- "Clear Cache" forces fresh fetch

## How to Invalidate Cache

### Programmatic
```typescript
import { pricingService } from '@/services/pricingService';

// Clear specific item
pricingService.invalidateCache('item-id-here');

// Clear all cache
pricingService.invalidateCache();
```

### Via Admin UI
Admin → Diagnostics → "Clear Cache" button

## Common Failure Modes

| Issue | Where to Look | Solution |
|-------|---------------|----------|
| Prices showing $0 | Admin → Diagnostics → Pricing errors | Check external API status, verify market_items data |
| Images not loading | Admin → Diagnostics → Image errors | Check image URLs in database, verify CDN |
| Stale prices | Debug overlay shows "stale" cache | Clear cache or wait for TTL expiry |
| Low confidence prices | Debug overlay shows "low" confidence | Insufficient sales data - shows "last updated" warning |
| API timeouts | Error log → API category | Check edge function logs, network connectivity |

## Architecture

```
┌─────────────────┐
│  UI Components  │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Hooks   │  (useMarketItems, usePriceHistory)
    └────┬────┘
         │
┌────────▼────────┐
│ pricingService  │  ← Single source of truth
│  (cache layer)  │
└────────┬────────┘
         │
    ┌────▼────┐
    │Supabase │  (market_items, price_history)
    └────┬────┘
         │
┌────────▼────────┐
│ Edge Functions  │  (fetch-prices, sync jobs)
└─────────────────┘
```

## Scheduled Refresh Jobs

### Edge Functions
- `daily-price-snapshot` - Captures daily prices for all market items, updates 24h/7d/30d changes
- `portfolio-snapshot` - Records portfolio values for users (enables portfolio graph)
- `refresh-prices` - Updates price changes for items
- `validate-images` - Checks and fixes broken image URLs
- `backfill-attributes` - Fills missing card attributes

### Manual Trigger
```bash
# Daily price snapshot (captures prices and updates change %)
curl -X POST https://kgffwhyfgkqeevsuhldt.supabase.co/functions/v1/daily-price-snapshot \
  -H "Authorization: Bearer ANON_KEY" \
  -d '{"batch_size": 500, "update_historical": true}'

# Portfolio snapshot (records user portfolio values)
curl -X POST https://kgffwhyfgkqeevsuhldt.supabase.co/functions/v1/portfolio-snapshot \
  -H "Authorization: Bearer ANON_KEY" \
  -d '{}'

# Refresh top viewed items
curl -X POST https://kgffwhyfgkqeevsuhldt.supabase.co/functions/v1/refresh-prices \
  -H "Authorization: Bearer ANON_KEY" \
  -d '{"type": "top_viewed", "limit": 100}'

# Refresh portfolio items
curl -X POST https://kgffwhyfgkqeevsuhldt.supabase.co/functions/v1/refresh-prices \
  -d '{"type": "portfolio"}'

# Validate images
curl -X POST https://kgffwhyfgkqeevsuhldt.supabase.co/functions/v1/validate-images

# Backfill attributes
curl -X POST https://kgffwhyfgkqeevsuhldt.supabase.co/functions/v1/backfill-attributes
```

### Cron Schedule (recommended)
To enable automatic refreshes, set up pg_cron:
- **daily-price-snapshot**: `0 */6 * * *` (every 6 hours)
- **portfolio-snapshot**: `0 * * * *` (hourly)
- Top viewed: `*/15 * * * *` (every 15 min)
- Portfolio refresh: `*/30 * * * *` (every 30 min)
- Full catalog: `0 2 * * *` (daily at 2am UTC)
