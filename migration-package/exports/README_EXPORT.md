# CardBoom Data Export Guide

## What's Been Exported

### Small Tables (SQL files ready to run):
- `08_achievements_data.sql` - Achievement definitions
- `09_listings_data.sql` - Active listings (sample)

### Large Table (market_items - 35,655 rows):
This table is too large for SQL INSERT statements. You have two options:

## Option A: Fresh Start (Recommended)
Skip importing market_items - your edge functions will re-populate the catalog from PriceCharting/eBay APIs when they run.

## Option B: Manual CSV Export
If you need the exact data:

1. I can generate batched queries you run here in Lovable
2. Copy each batch result
3. Import via your new Supabase Table Editor → Import CSV

---

## Steps to Complete Migration

### 1. Run Schema Files (DONE ✅)
You've already run files 01-05 on your new Supabase.

### 2. Import Data
In your NEW Supabase SQL Editor, run:
- `08_achievements_data.sql`
- `09_listings_data.sql`

### 3. Add Secrets
Go to Settings → Edge Functions → Secrets in your new project:
```
EBAY_AUTH_TOKEN=xxx
EBAY_CLIENT_ID=xxx  
EBAY_CLIENT_SECRET=xxx
PRICECHARTING_API_KEY=xxx
IYZICO_API_KEY=xxx
IYZICO_SECRET_KEY=xxx
OPENAI_API_KEY=xxx
```

### 4. Deploy Edge Functions
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy
```

### 5. Update Lovable Connection
Give me your new:
- Project URL: `https://xxxxx.supabase.co`
- Anon Key: `eyJ...`

And I'll update the connection.

---

## Need market_items data?
Let me know and I'll generate batched export queries you can run.
