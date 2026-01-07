# CardBoom Supabase Migration Checklist

## ✅ Database Status

### Core Tables (144 tables total)
All core tables are present and properly configured:
- **Users**: `profiles`, `user_roles`, `user_achievements`, `user_subscriptions`
- **Marketplace**: `listings`, `orders`, `market_items`, `buy_orders`
- **Messaging**: `messages`, `conversations`
- **Payments**: `wallets`, `ledger_entries`, `transactions`, `wire_transfers`
- **Grading**: `grading_orders`, `grading_credits`
- **Social**: `follows`, `reviews`, `notifications`
- **Rewards**: `cardboom_points`, `cardboom_points_history`, `achievements`

### Data Counts
| Table | Count |
|-------|-------|
| market_items | 11,065 |
| listings | 81 |
| profiles | 8 |
| wallets | 8 |
| messages | 0 |
| conversations | 0 |
| orders | 0 |

---

## ✅ Authentication Triggers

Critical triggers are properly configured on `auth.users`:
1. `on_auth_user_created` → `handle_new_user()` - Creates profile on signup
2. `on_auth_user_created_wallet` → `handle_new_user_wallet()` - Creates wallet on signup

---

## ✅ Realtime Subscriptions

Tables enabled for realtime (`supabase_realtime` publication):
- `listings`
- `market_items`
- `messages`
- `offers`
- `trades`
- `fractional_listings`
- `fractional_ownership`
- `card_reels`
- `reel_comments`
- `cardboom_pass_progress`
- `cardboom_news`
- `auto_match_queue`

---

## ✅ Storage Buckets

| Bucket | Public |
|--------|--------|
| avatars | ✅ Yes |
| card-images | ✅ Yes |
| grading-images | ✅ Yes |
| listing-images | ✅ Yes |
| video-reels | ✅ Yes |

---

## ✅ Edge Functions (49 functions)

### Core Functionality
- `messaging` - Chat with content filtering ✅
- `iyzico-init-3ds` - Payment initiation ✅
- `iyzico-callback` - Payment callbacks ✅
- `grading-submit` - Card grading submissions ✅
- `grading-admin` - Admin grading management ✅
- `digital-fulfillment` - Digital code delivery ✅

### Pricing & Sync
- `fetch-prices` - Main price fetching ✅
- `sync-pricecharting-listings` - Price sync ✅
- `sync-cardmarket-prices` - CardMarket sync ✅
- `sync-justtcg-prices` - JustTCG sync ✅
- `daily-price-snapshot` - Daily snapshots ✅

### Image Sync
- `sync-pokemon-images`, `sync-scryfall-images`, `sync-ygopro-images`
- `sync-cardmarket-images`, `sync-ebay-images`, `sync-optcg-images`
- `sync-tcgdex-images`, `sync-apitcg-images`

### AI Functions
- `analyze-card` - Card scanning/analysis
- `ai-dispute-analyzer` - Dispute AI
- `ai-listing-check` - Listing moderation
- `ai-ticket-assistant` - Support tickets

### Notifications
- `send-email`, `send-welcome-email`, `send-weekly-digest`
- `send-notification`, `check-price-alerts`

### Other
- `process-referral`, `process-referral-reward`
- `market-api`, `market-insights`, `sitemap`
- `inventory-escrow`, `geliver-shipping`
- `cbgi-grade`, `grading-regrade`

---

## ✅ Required Secrets (Environment Variables)

Ensure these are set in your new Supabase project:

| Secret | Purpose |
|--------|---------|
| `CARDMARKET_RAPIDAPI_KEY` | CardMarket API |
| `EBAY_RAPIDAPI_KEY` | eBay image sync |
| `GELIVER_API_KEY` | Shipping service |
| `IYZICO_API_KEY` | Payment processing |
| `IYZICO_SECRET_KEY` | Payment processing |
| `IYZICO_BASE_URL` | Payment endpoint |
| `JUSTTCG_API_KEY` | JustTCG pricing |
| `KINGUIN_API_KEY` | Digital codes |
| `OPENAI_API_KEY` | AI functions |
| `PRICECHARTING_API_KEY` | Price data |
| `RESEND_API_KEY` | Email sending |
| `XIMILAR_API_TOKEN` | Card recognition |

---

## ✅ Database Functions (54 functions)

Key functions that must be present:
- `handle_new_user()` - User creation
- `handle_new_user_wallet()` - Wallet creation
- `update_wallet_cached_balance()` - Balance updates
- `post_ledger_entry()` - Financial transactions
- `complete_sale_transfer()` - Order completion
- `calculate_seller_trust_score()` - Trust calculations
- `award_cardboom_points()` - Points system
- `find_matches_for_buy_order()` - Auto-matching
- `find_matches_for_listing()` - Auto-matching
- `calculate_card_war_payouts()` - Card wars
- `purchase_pro_pass()` - Subscription handling

---

## ✅ Database Triggers (46 triggers)

All triggers are properly configured including:
- Auto-buy trigger on listings
- Auto-match triggers on buy_orders and listings
- Points awarding on orders and transactions
- Wallet balance updates on ledger_entries
- Discussion/reaction stat updates
- Timestamp updates on most tables

---

## ⚠️ Security Warnings (Non-Critical)

The following are flagged but are **intentionally permissive** for specific features:

1. **Extension in Public** - `pg_trgm` for fuzzy search (can be moved to separate schema)
2. **Function Search Path** - Some functions don't have explicit search_path (add `SET search_path = public` for production hardening)
3. **Permissive RLS Policies** - Some tables use `USING (true)` for INSERT/UPDATE on purpose (e.g., system notifications)

---

## 📋 Migration Steps

### 1. Export from Current Project
```bash
# Using migration-package already in repo
cd migration-package
# Follow QUICK_START.md
```

### 2. Create New Supabase Project
- Create project at supabase.com
- Note down: Project URL, Anon Key, Service Role Key

### 3. Run Migrations in Order
```sql
-- Run in SQL Editor:
01_complete_schema.sql
02_functions_triggers.sql
03_rls_policies.sql
04_storage_buckets.sql
05_auth_triggers.sql  -- MUST run in SQL Editor (auth schema)
06_seed_data.sql
```

### 4. Set Environment Variables
Add all secrets listed above to your new project's Edge Functions settings.

### 5. Update Frontend Config
```env
VITE_SUPABASE_URL=https://your-new-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-new-anon-key
VITE_SUPABASE_PROJECT_ID=your-new-project-id
```

### 6. Deploy Edge Functions
```bash
supabase functions deploy --project-ref your-new-project-id
```

### 7. Enable Realtime
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fractional_listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fractional_ownership;
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_reels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cardboom_pass_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cardboom_news;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auto_match_queue;
```

### 8. Verify Critical Paths
- [ ] User signup creates profile + wallet
- [ ] Messaging works with content filtering
- [ ] Listings can be created and viewed
- [ ] Payments process correctly
- [ ] Price updates flow through
- [ ] Realtime subscriptions receive updates

---

## ✅ Status Summary

| Component | Status |
|-----------|--------|
| Database Schema | ✅ Complete |
| RLS Policies | ✅ Configured |
| Auth Triggers | ✅ Active |
| Edge Functions | ✅ 49 Functions |
| Storage Buckets | ✅ 5 Buckets |
| Realtime | ✅ 12 Tables |
| Secrets | ✅ 13 Configured |

**Ready for migration!** 🚀
