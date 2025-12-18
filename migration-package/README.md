# CardBoom Database Migration Package

This package contains everything needed to migrate the CardBoom database to a new external Supabase project.

## Prerequisites

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Have access to the SQL Editor in the new project dashboard
3. Note down your new project credentials:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY` 
   - `SUPABASE_SERVICE_ROLE_KEY`

## Migration Steps

### Step 1: Run Schema Migration
Run these files **in order** in the Supabase SQL Editor:

1. `01_complete_schema.sql` - Creates all ENUMs, tables, indexes, and foreign keys
2. `02_functions_triggers.sql` - Creates all database functions and triggers
3. `03_rls_policies.sql` - Sets up Row Level Security policies
4. `04_storage_buckets.sql` - Creates storage buckets for file uploads
5. `05_auth_triggers.sql` - **IMPORTANT**: Creates auth triggers (must run last)
6. `06_seed_data.sql` - Inserts initial data (achievements, backgrounds, etc.)

### Step 2: Import Data
After schema is set up, import data in this order:

1. **market_items** (35,655 records) - Export in batches of 5,000
2. **price_history** (8,957 records)
3. **achievements** (already seeded)
4. **listings** (80 records)
5. **profiles** (4 records) - Note: users will need to re-register
6. Other tables as needed

### Step 3: Configure Secrets
Add these secrets in the new Supabase project (Settings > Edge Functions > Secrets):

| Secret Name | Description |
|-------------|-------------|
| `EBAY_AUTH_TOKEN` | eBay API authentication token |
| `EBAY_CLIENT_ID` | eBay application client ID |
| `EBAY_CLIENT_SECRET` | eBay application client secret |
| `EBAY_BROWSE_API_KEY` | eBay Browse API key |
| `IYZICO_API_KEY` | Iyzico payment API key |
| `IYZICO_SECRET_KEY` | Iyzico secret key |
| `IYZICO_BASE_URL` | Iyzico API base URL |
| `OPENAI_API_KEY` | OpenAI API key |
| `GELIVER_API_KEY` | Geliver shipping API key |
| `PRICECHARTING_API_KEY` | PriceCharting API key |
| `JUSTTCG_API_KEY` | JustTCG API key |
| `CARDMARKET_RAPIDAPI_KEY` | Cardmarket RapidAPI key |
| `LOVABLE_API_KEY` | Lovable API key (for image generation) |

### Step 4: Deploy Edge Functions
Copy all edge functions from `supabase/functions/` to the new project:

```bash
# Using Supabase CLI
supabase link --project-ref YOUR_NEW_PROJECT_REF
supabase functions deploy
```

### Step 5: Update Lovable Project
Update the `.env` file with new credentials:

```env
VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_new_anon_key
VITE_SUPABASE_PROJECT_ID=YOUR_NEW_PROJECT
```

Update `supabase/config.toml`:
```toml
project_id = "YOUR_NEW_PROJECT"
```

### Step 6: Configure Auth Settings
In the new Supabase dashboard:
1. Go to Authentication > Settings
2. Enable "Auto-confirm email" for easier testing
3. Configure any OAuth providers as needed

## Data Export Queries

### Export market_items (run in current project)
```sql
-- Export first 5000
SELECT * FROM market_items ORDER BY id LIMIT 5000;

-- Export next batch
SELECT * FROM market_items ORDER BY id LIMIT 5000 OFFSET 5000;

-- Continue until all 35,655 records exported
```

### Export price_history
```sql
SELECT * FROM price_history ORDER BY recorded_at;
```

### Export listings
```sql
SELECT * FROM listings;
```

## Important Notes

⚠️ **Auth Users Will NOT Migrate**
- Users will need to re-register on the new system
- Only public profile data can be migrated

⚠️ **Storage Files**
- Files in storage buckets need to be manually migrated
- Or update image URLs to point to the original source

⚠️ **Estimated Timeline**
- Schema setup: 30 minutes
- Data import: 2-4 hours (depending on batch sizes)
- Testing: 2-4 hours
- Total: ~1 day

## Verification Checklist

After migration, verify:
- [ ] All tables created correctly
- [ ] RLS policies working
- [ ] Auth triggers fire on signup
- [ ] Storage buckets accessible
- [ ] Edge functions deployed and working
- [ ] Market items display correctly
- [ ] Price charts working
- [ ] Search functionality working
- [ ] User registration/login working
