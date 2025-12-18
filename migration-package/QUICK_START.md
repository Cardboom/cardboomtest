# CardBoom Migration - Quick Start Guide

## ⚡ Fast Track (30 min setup + data import)

### Step 1: Create New Supabase Project (2 min)
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Save these credentials:
   - Project URL: `https://XXXXX.supabase.co`
   - Anon Key: `eyJ...`
   - Service Role Key: `eyJ...`

### Step 2: Run Schema (10 min)
In Supabase SQL Editor, run these files IN ORDER:
1. `01_complete_schema.sql` - Tables & ENUMs
2. `02_functions_triggers.sql` - Functions
3. `03_rls_policies.sql` - Security policies
4. `04_storage_buckets.sql` - File storage
5. `05_auth_triggers.sql` - Auth hooks ⚠️ Run LAST
6. `06_seed_data.sql` - Initial data

### Step 3: Export Data from Current Project (15 min)
Use `07_data_export_queries.sql` to export:
- ✅ market_items (8 batches of 5000)
- ✅ price_history
- ✅ listings
- ✅ achievements (or use seed data)

### Step 4: Import Data to New Project
1. In new project's Table Editor
2. Click table → Import → CSV
3. Upload exported data

### Step 5: Add Secrets (5 min)
Go to Settings → Edge Functions → Secrets:
```
EBAY_AUTH_TOKEN=xxx
EBAY_CLIENT_ID=xxx
EBAY_CLIENT_SECRET=xxx
EBAY_BROWSE_API_KEY=xxx
IYZICO_API_KEY=xxx
IYZICO_SECRET_KEY=xxx
IYZICO_BASE_URL=xxx
OPENAI_API_KEY=xxx
GELIVER_API_KEY=xxx
PRICECHARTING_API_KEY=xxx
JUSTTCG_API_KEY=xxx
CARDMARKET_RAPIDAPI_KEY=xxx
LOVABLE_API_KEY=xxx
```

### Step 6: Deploy Edge Functions (5 min)
```bash
cd your-project
supabase link --project-ref YOUR_NEW_PROJECT_REF
supabase functions deploy
```

### Step 7: Update Lovable Project
Update `.env`:
```env
VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_new_anon_key
VITE_SUPABASE_PROJECT_ID=YOUR_NEW_PROJECT
```

Update `supabase/config.toml`:
```toml
project_id = "YOUR_NEW_PROJECT"
```

---

## 🔧 Troubleshooting

### "relation does not exist"
→ Run SQL files in order (01 before 02, etc.)

### "permission denied"
→ Make sure RLS policies are created (file 03)

### "function does not exist"
→ Run 02_functions_triggers.sql before 05_auth_triggers.sql

### Data import fails
→ Check column types match, try smaller batches

---

## ✅ Verification Checklist

After migration, test:
- [ ] User signup creates profile + wallet
- [ ] Market items display on homepage
- [ ] Price charts load
- [ ] Search works
- [ ] Edge functions respond (check logs)
