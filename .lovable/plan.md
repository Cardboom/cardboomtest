
# CardBoom Mobile App — Complete Feature Specification for Rork

## Backend Connection

```
URL: https://kgffwhyfgkqeevsuhldt.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZmZ3aHlmZ2txZWV2c3VobGR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTQ4MjIsImV4cCI6MjA4MTAzMDgyMn0.JvAxh0kXknKbbGvK56ULG87LoHVqcmIGXDImBxD2MBs
```

Install `@supabase/supabase-js` and initialize:
```typescript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://kgffwhyfgkqeevsuhldt.supabase.co', 'ANON_KEY_ABOVE');
```

---

## 1. Authentication & User Management

### Auth (Supabase Auth — built-in)
- **Email/password sign up & sign in** — `supabase.auth.signUp()`, `supabase.auth.signInWithPassword()`
- **Password reset** — `supabase.auth.resetPasswordForEmail()`
- **Session persistence** — `supabase.auth.onAuthStateChange()`, `supabase.auth.getSession()`
- **Remember me** functionality
- Biometric auth support (Face ID / Fingerprint) for native

### User Profile — Table: `profiles`
- Fields: `username`, `display_name`, `avatar_url`, `bio`, `country`, `phone`, `national_id`, `is_verified_seller`, `is_admin`, `role`, `seller_level`, `custom_name`, `preferred_currency` (USD/TRY), `preferred_language`
- Query: `supabase.from('profiles').select('*').eq('id', userId)`
- Update: `supabase.from('profiles').update({...}).eq('id', userId)`

### Account Settings (`/account-settings`)
- Edit display name, avatar, bio, country, phone
- Currency preference (USD / TRY)
- Language preference (English / Turkish)
- National ID verification (required for KYC/verified seller)
- Notification preferences
- Delete account

### Public Profile (`/u/:username`)
- View any user's public profile, listings, reviews, reputation
- Follow/unfollow users — Table: `user_follows`

---

## 2. Home / Dashboard (`/`)

### Hero Section
- Market mood banner (CardBoom Index — Bullish/Neutral/Bearish)
- Live market ticker (scrolling prices)
- Search bar with autocomplete

### Sections on Home
- **Trending Cards** — from `ai_trending_cards` table
- **Popular Cards** — from `market_items` ordered by volume/views
- **Live Market Table** — real-time prices from `market_items`
- **Recent Sales** — from `orders` where status = completed
- **News/Insights** — from `cached_social_posts` and editorial content
- **TCG Drops Calendar** — from `cached_tcg_drops`
- **Social Proof Popup** — shows recent purchases/grading activity
- **Daily Card Vote** — community voting on trending cards
- **Feature Showcase** — highlights platform features

### Market Summary (cached)
- Table: `cached_market_summary`
- Fields: sentiment, cardboom_index, top_movers, weekly_volume, hot_take, sleeper, community_buzz

---

## 3. Marketplace / Markets (`/markets`)

### Browsing
- Table: `market_items` (11,000+ cards in catalog)
- Fields: `name`, `category`, `current_price`, `change_24h`, `change_7d`, `change_30d`, `liquidity`, `image_url`, `set_name`, `rarity`, `card_code`
- Filters: category (Pokemon, One Piece, Yu-Gi-Oh, Magic, Sports, Figures), rarity, price range, condition, graded/ungraded
- Sort: price, change %, volume, name
- Search: `supabase.from('market_items').select('*').ilike('name', '%query%')`

### Categories
- Pokemon, One Piece, Yu-Gi-Oh, Magic: The Gathering, Sports Cards, Figures/Collectibles

### Catalog Explorer (`/catalog`, `/catalog/:game`, `/catalog/:game/:canonicalKey`)
- Browse the full card database by game
- Each card has a canonical page with price history, listings, and market data
- Table: `catalog_card_map` links catalog entries to market items

### Item Detail (`/item/:id`)
- Full card info from `market_items`
- Price chart (7d/30d/90d/1y) — from `price_history` table
- Active listings for this card — from `listings` where `market_item_id = id`
- Buy orders — from `buy_orders` where `market_item_id = id`
- Price estimates by grade — from `card_price_estimates`
- Community discussions
- "How price is computed" tooltip with source + confidence

---

## 4. Listings & Selling

### Create Listing (`/sell`)
- Upload photos (front/back)
- Select category, card name (autocomplete from market_items)
- Set condition (Mint, Near Mint, Excellent, Good, Poor)
- Set grading info (PSA/BGS/CGC/CBGI grade)
- Set price (USD)
- Language, edition, authenticity notes
- AI Card Scanner: invoke `analyze-card` edge function to auto-detect card
- Table: `listings`

### Listing States
`draft → active → reserved → sold → shipped → completed → disputed → refunded`

### Listing Detail (`/listing/:category/:slug`)
- Photos, description, condition, grade
- Seller info with reputation
- Buy button / Make Offer / Add to Cart
- Watcher count — from `listing_watchers`
- Analytics (views, offers) — from `listing_analytics`
- Discussions thread
- Share button

### Auto-Relist Settings
- Table: `auto_relist_settings`
- Price ladder (automatic price reduction over time)
- Min price floor

### My Storefront (`/my-storefront`, `/store/:slug`)
- Seller's personal store page
- All active listings grouped
- Customizable store slug

---

## 5. Buying & Orders

### Purchase Flow
1. Click "Buy Now" on listing
2. Payment via wallet balance (or card top-up)
3. Escrow holds funds — Table: `escrow_transactions`
4. Seller ships item
5. Buyer confirms receipt
6. Funds released to seller

### Orders (`/orders`)
- Table: `orders`
- Fields: `buyer_id`, `seller_id`, `listing_id`, `amount`, `status`, `tracking_number`, `shipped_at`, `delivered_at`
- Order statuses: `pending → paid → shipped → delivered → completed → disputed → refunded`

### Order Timeline
- Table: `order_status_history` — immutable audit trail

### Buy Orders (`/buy-orders`)
- Table: `buy_orders`
- Place standing orders: "I want this card at max $X"
- Auto-match when a listing meets criteria
- Fields: `buyer_id`, `market_item_id`, `max_price`, `quantity`, `condition`, `grade`

### Auto-Match
- Table: `auto_match_queue`
- System matches buy orders with new listings

---

## 6. Wallet & Payments (`/wallet`)

### Wallet
- Table: `wallets`
- Fields: `user_id`, `balance` (USD), `pending_balance`, `total_earned`, `total_spent`
- View balance, transaction history

### Top-Up Methods

#### Credit Card (Iyzico 3DS)
- Edge function: `iyzico-init-3ds`
- Supports USD and TRY
- Transparent fee: 2.5% (configurable)
- 3DS secure payment flow
- Callback: `iyzico-callback`

#### Wire Transfer (Turkey only, TRY)
- Beneficiary: **BRAINBABY BILISIM ANONIM SIRKETI**
- IBAN: **TR490086401100008249929845**
- User must include username in transfer description
- Table: `wire_transfers`
- Edge function: `verify-wire-transfer`, `process-wire-transfers`

### Gems (Virtual Currency)
- Table: `gem_wallets`
- Earned via achievements, bounties, daily streaks, boom packs
- Used for boom packs, grading credits, etc.
- Context: `GemsContext`

### Withdrawal
- Request withdrawal from wallet balance
- Table: `withdrawal_requests`
- Edge function: `process-mass-payout`
- Min/max limits, KYC required

---

## 7. Portfolio (`/portfolio`)

### Holdings
- Table: `card_instances` (user's inventory)
- Fields: `owner_user_id`, `title`, `category`, `condition`, `grade`, `current_value`, `acquisition_price`, `acquisition_date`, `image_url`, `market_item_id`
- Shows: total value, cost basis, P&L, confidence score

### Portfolio Features
- Value changes over time
- Heat map — `usePortfolioHeat`
- Set completion tracking — `useSetCompletion`
- Holdings breakdown by category
- Price alerts — Table: `price_alerts`, edge function: `check-price-alerts`

### Recently Viewed
- Tracked locally — `useRecentlyViewed`

### Watchlist
- Table: `watchlist_items`
- Shadow wishlist — `useShadowWishlist`

---

## 8. Vault (`/vault`)

### Private Inventory System
- Table: `vault_items`
- Requires AI scan (front/back/video) via `vault_scan_sessions`
- Tiered insurance: $2 (under $99), $4 ($100-999), $10 ($1000+)
- Items can be: "List for Sale" or "Request Grading"
- Statuses: `pending_scan → verified → stored → listed → graded`

---

## 9. Grading (CBGI — CardBoom Grading Index)

### Grading Flow (`/grading`, `/grading/new`)
- Upload front + back images
- AI analyzes card (GPT-4o Vision via `analyze-card`)
- Submit for grading via `grading-submit` edge function

### Service Tiers
**Online AI Grading:**
- Standard: $5 (discounted from $10), 5-min queue
- Priority: $10 (discounted from $20), instant results
- 50% launch discount active until Jan 2027

**Physical CBGI Certification:**
- Standard: $33, 20 business days
- Express: $48, 10 business days
- Priority: $88, 5 business days

### Grading Tables
- `grading_orders` — main orders table
- `grading_credits` — prepaid grading credits
- Edge functions: `grading-submit`, `grading-admin`, `grading-regrade`, `process-pending-grades`, `grade-listing`, `cbgi-grade`

### First Grading Free
- New users get 1 free AI grading (bypasses payment)
- Requires verified phone + National ID

### Grading Results
- CBGI Grade badge appears on card listings
- Grades linked to catalog via `catalog_card_map`

---

## 10. Messaging (`/messages`)

### Real-time Chat
- Table: `conversations`, `messages`
- Edge function: `messaging`
- Features: buyer-seller chat, image sharing, offer negotiation
- Real-time via Supabase Realtime subscriptions

---

## 11. Notifications

### Notification System
- Table: `notifications`
- Types: order updates, price alerts, new messages, offers, grading results, achievements
- Mark as read, delete individual
- Edge function: `send-notification`

### Push Notifications (for native)
- SMS via Twilio: `send-sms` edge function
- Email via Resend: `send-email`, `send-welcome-email`, `send-weekly-digest`

---

## 12. Social & Community

### Circle (Forum) — `/circle`
- Discussion threads — Table: `discussions`, `discussion_replies`
- @mentions, auto-subscriptions
- Thread detail: `/circle/:id`

### Boom Reels — `/reels`
- Short video content (TikTok-style)
- Table: `reels`
- Watch time tracking (ignores looped views)

### Reviews & Reputation
- Table: `reviews` — buyer/seller ratings
- Seller metrics: fulfillment rate, response time, dispute rate
- Table: `seller_metrics`
- Hook: `useSellerMetrics`, `useReputation`

### Follow System
- Table: `user_follows`
- Follow/unfollow users
- Hook: `useFollows`

### Leaderboard (`/leaderboard`)
- Rankings by XP, sales volume, reputation

### Hall of Fame (`/hall-of-fame`)
- Top sellers and collectors

---

## 13. Gamification & Rewards

### XP System
- Hook: `useXP`
- Earn XP from purchases, sales, gradings, daily logins
- Level progression

### Achievements (`/achievements`)
- Table: `achievements`, `user_achievements`
- Categories: trading, collecting, community, grading
- Tiers: bronze, silver, gold, platinum

### Daily Streak
- Hook: `useDailyStreak`
- Consecutive login rewards

### Bounties
- Table: `bounties`, `bounty_progress`
- Daily/weekly challenges for gem rewards
- Types: list items, make purchases, grade cards, engage in community

### CardBoom Pass (`/pass`)
- Season pass with XP boosts and exclusive rewards

### Card Wars (`/card-wars`)
- Competitive card comparison game

### Boom Packs (`/boom-packs`)
- Table: `boom_pack_types`, `boom_packs`, `boom_pack_cards`
- Purchase with gems
- Random card drops with rarity system
- Inventory pool: `boom_pack_inventory_pool`

### Boom Coins (`/coins`)
- Virtual currency for gamification features

---

## 14. Referrals (`/referrals`)

### Referral System
- Table: `referrals`, `referral_rewards`
- Unique referral codes per user
- Earn gems/rewards when referred users: sign up, make first purchase, subscribe
- Edge functions: `process-referral`, `process-referral-reward`
- Creator program with revenue sharing

### Creator Pages (`/@:username`, `/creators`)
- Creator invite system
- Custom creator pages with affiliate links

---

## 15. Subscriptions

### Tiers
- **Lite (Buyer)**: $9.99/mo — enhanced analytics, faster support, alerts, XP boosts, 1 free AI grading/mo
- **Pro**: mid-tier — 2 free AI gradings/mo
- **Enterprise (Verified Seller)**: $30/mo + KYC — trust badge, better placement, advanced store analytics, 3 free AI gradings/mo, lower dispute friction

### Subscription Tables
- `subscriptions`
- Edge function: `process-subscription-renewals`
- Conversion tracking: Google Ads, GA4, Meta, TikTok

---

## 16. Shipping

### Geliver Integration
- Edge function: `geliver-shipping`
- Generate shipping labels
- Track shipments

### Seller Shipping Notifier
- Component: `SellerShippingNotifier`
- Reminds sellers to ship pending orders

---

## 17. Auctions (`/auctions`)

### Auction System
- Table: `auctions`, `auction_bids`, `auction_watchers`
- Create timed auctions
- Bid, auto-bid (max bid), buy now
- Reserve price support
- Fields: `starting_price`, `current_bid`, `bid_increment`, `buy_now_price`, `ends_at`
- Statuses: `active → ended → completed → cancelled`

---

## 18. Cardswap (`/cardswap`)

### Trade System
- Table: `trades`, `trade_items`
- Propose card-for-card swaps
- Trade matching — `useTradeMatching`

---

## 19. Deals (`/deals`)

### Deals & Discounts
- Curated deals page
- Long-tail SEO landing pages: `/deals/:slug`

---

## 20. Admin Panel (`/admin`)

Only for users with `role = 'admin'` in profiles table.

### Admin Features
- User management (search, ban, verify, adjust balances)
- Revenue dashboard (total revenue, CC profit, top-ups) — all in USD
- Listing moderation
- Grading order management
- Grading pricing configuration (stored in `platform_settings`)
- Catalog management (image sync, price sync)
- Wire transfer verification
- Notification broadcaster — Table: `admin_notifications`
- Audit log — Table: `admin_audit_log`
- Alert thresholds — Table: `alert_thresholds`, `alert_history`
- Quick navigation search between admin panels
- AI tools: `ai-ticket-assistant`, `ai-dispute-analyzer`, `ai-listing-check`

---

## 21. Price Engine

### Data Sources (priority order)
1. Verified recent sold comps
2. Aggregated market feeds (PriceCharting, CardMarket, eBay, JustTCG)
3. Internal marketplace executed trades
4. Active listings (weighted low)

### Price Calculation
- Median / trimmed mean (drop bottom 10% + top 10%)
- Outlier detection: ignore prices outside median ± (3 × MAD)
- Min sample size: n≥5 sold comps in 30d before showing "market price"
- Always show: data source, sample size, last update timestamp

### Edge Functions
- `fetch-prices`, `auto-fetch-price`, `sync-popular-prices`
- `catalog-price-snapshot`, `aggregate-daily-prices`
- `sync-justtcg-prices`, `sync-cardmarket-prices`
- `catalog-ingest-pricecharting`, `catalog-ingest-ebay`

### Price History
- Table: `price_history`, `daily_price_snapshots`
- Charts: 7d / 30d / 90d / 1y with volume + sample counts

---

## 22. AI Features

### Card Scanner
- Edge function: `analyze-card`
- Uses GPT-4o Vision + Ximilar TCG Identification
- Extracts: game, language, card name (original + English), set, number, rarity
- High-confidence (>0.75): auto-fill listing
- Low-confidence: manual admin review

### AI Market Insights
- Edge function: `generate-ai-insights`, `ai-market-summary`
- Trend discovery: `discover-trending-cards`

### AI Grading (CBGI)
- Edge function: `cbgi-grade`
- AI-powered card condition assessment

---

## 23. Content & SEO

### Blog/Insights (`/insights`, `/news`)
- Editorial content with SEO optimization
- AI research pages (`/ai/*`) for AEO strategy

### Sitemap (`/sitemap`)
- Edge function: `sitemap`
- Dynamic XML sitemap generation

### SEO Structure
- Canonical URLs: `/cards/:category/:slug`, `/catalog/:game/:canonicalKey`
- Structured data: Product + Offer schema
- Meta tags via `react-helmet-async`

---

## 24. Internationalization

### Languages
- English (default), Turkish
- Context: `LanguageContext`

### Currency
- USD (default), TRY
- Context: `CurrencyContext`
- Live conversion rates

### Turkish Compliance
- KVKK (Turkish GDPR)
- Distance Sales Contract
- User Agreement in Turkish
- Hook: `useTurkeyCompliance`

---

## 25. Key Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles |
| `market_items` | Card catalog (11,000+) |
| `listings` | Active marketplace listings |
| `orders` | Purchase orders |
| `wallets` | User USD balances |
| `gem_wallets` | User gem balances |
| `conversations` / `messages` | Chat |
| `notifications` | User notifications |
| `card_instances` | User card inventory |
| `vault_items` | Vault storage |
| `grading_orders` | Grading submissions |
| `price_history` | Historical prices |
| `watchlist_items` | User watchlists |
| `buy_orders` | Standing buy orders |
| `auctions` / `auction_bids` | Auction system |
| `achievements` / `user_achievements` | Gamification |
| `bounties` / `bounty_progress` | Daily/weekly challenges |
| `boom_packs` / `boom_pack_cards` | Pack opening |
| `referrals` | Referral tracking |
| `subscriptions` | User subscriptions |
| `reviews` | Buyer/seller reviews |
| `discussions` / `discussion_replies` | Forum |
| `wire_transfers` | Wire top-ups |
| `price_alerts` | User price alerts |
| `reels` | Short video content |

---

## 26. Key Edge Functions

| Function | Purpose | Auth Required |
|----------|---------|--------------|
| `analyze-card` | AI card recognition | No |
| `market-api` | Public API with API key | No (API key) |
| `catalog-api` | Card catalog queries | No |
| `fetch-prices` | Price data | No |
| `iyzico-init-3ds` | Credit card payments | No |
| `iyzico-callback` | Payment callback | No |
| `messaging` | Chat operations | Yes |
| `grading-submit` | Submit grading | No |
| `grading-admin` | Admin grading ops | No |
| `geliver-shipping` | Shipping labels | No |
| `send-notification` | Send notifications | No |
| `send-email` | Email via Resend | No |
| `send-sms` | SMS via Twilio | No |
| `process-referral` | Referral processing | No |
| `cbgi-grade` | AI grading | No |
| `health-monitor` | System health | No |

### Calling Edge Functions from Rork
```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { /* payload */ }
});
```

---

## 27. Contexts (Global State)

Implement these as React Native contexts or state management:

| Context | Purpose |
|---------|---------|
| `LanguageContext` | English/Turkish |
| `CurrencyContext` | USD/TRY with live conversion |
| `GemsContext` | Gem balance tracking |
| `PriceContext` | Price display preferences |
| `AchievementContext` | Achievement notifications |

---

## 28. Mobile-Specific Considerations

### Navigation
- Bottom tab bar: Home, Markets, Sell, Portfolio, Profile
- Drawer or stack navigation for deeper pages

### Native Features to Add
- Push notifications (Firebase/APNs)
- Camera for card scanning (replace file upload)
- Biometric auth (Face ID / Fingerprint)
- Share sheet for listings
- Deep linking for `/listing/`, `/catalog/`, `/u/` URLs

### Features to Skip for Mobile
- Admin panel (keep web-only)
- Sitemap / SEO pages
- AI research articles (`/ai/*`)
- Legal pages can be webview links

---

## 29. Getting Started Prompt for Rork

Copy this into Rork to get started:

> Build a TCG card marketplace mobile app called "CardBoom" that connects to an existing Supabase backend. The app should have:
> 
> **Auth:** Email/password signup & login using Supabase Auth
> **Home:** Market mood index, trending cards, live prices, search
> **Markets:** Browse 11,000+ cards across Pokemon, One Piece, Yu-Gi-Oh, Magic, Sports, Figures with filters
> **Listings:** View and create listings with photos, condition, grading
> **Buying:** Purchase via wallet balance, escrow system
> **Wallet:** Balance management, credit card top-up, wire transfer (Turkey)
> **Portfolio:** Track card holdings, value changes, P&L
> **Grading:** AI card grading (CBGI) with photo upload
> **Messages:** Real-time buyer-seller chat
> **Profile:** User profiles, reputation, reviews
> **Gamification:** XP, achievements, daily streaks, bounties, boom packs
> 
> Backend URL: https://kgffwhyfgkqeevsuhldt.supabase.co
> Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZmZ3aHlmZ2txZWV2c3VobGR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTQ4MjIsImV4cCI6MjA4MTAzMDgyMn0.JvAxh0kXknKbbGvK56ULG87LoHVqcmIGXDImBxD2MBs
> 
> Use bottom tab navigation. All data queries go through the Supabase JS SDK. Edge functions are called via supabase.functions.invoke().
