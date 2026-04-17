

## What I found

I fetched `cardboom.com`, `cardboomtest.lovable.app`, and your repo. Key findings:

1. **Catalog page IS already published correctly.** `cardboom.com/catalog` is serving the new H1 "Trading Card Catalog — Browse Sets & Prices" with the new Union Arena tab. So the catalog SEO/pagination work IS live.
2. **Homepage is NOT showing the new HeroSection.** Live homepage still says *"Grade Your Portfolio. Track Your Portfolio. Trade It."* — that copy lives in `src/components/GlobalTCGStats.tsx` (lines 199–202), and `src/pages/Index.tsx` renders `<GlobalTCGStats />` (line 364), **NOT** `<HeroSection />`. The new H1 you approved (`"Buy, Sell & AI-Grade Collectible Trading Cards"`) was put into `HeroSection.tsx` — a component the homepage never uses. So your "old" homepage is the *current code*, not a cache problem.
3. **Service worker IS still on v3 in production** (`/sw.js` returns `cardboom-v3` on both cardboom.com and cardboomtest.lovable.app, while repo is on v4). This means the latest commits have not been re-published yet — explains why ticker / card area still shows the old "Mox Ruby / Black Lotus" snapshot from the prior bundle.
4. **You confirmed:** keep homepage = **real listings only**, and add **Catalog as a top-level nav item** in the header.

## Plan

### 1. Wire the new SEO H1 into the actual homepage hero
File: `src/components/GlobalTCGStats.tsx` (lines ~193–211)
- Replace the "Grade Your Portfolio. Track Your Portfolio. Trade It." H1 with the SEO-approved version:
  - H1: `Buy, Sell & AI-Grade Collectible Trading Cards`
  - Subtitle line: `Pokémon · Yu-Gi-Oh! · One Piece · MTG · Lorcana · NBA · NFL · Star Wars & More`
  - Keep the existing CTA buttons + news ticker exactly as they are.
- This is the minimum-risk fix because Index.tsx already mounts GlobalTCGStats (no routing changes needed).

### 2. Add Catalog as a top-level nav link
File: `src/components/Header.tsx` (around line 425, next to the `/grading` link)
- Insert a new `<Link to="/catalog">` with the `TrendingUp` icon labelled **Catalog**, placed between the Trading dropdown and the Grading link so it sits as a visible top-level item.
- Leave the existing entry inside the Trading dropdown as-is for redundancy.
- Mobile menu: add the same Catalog entry to the mobile nav section (further down in Header.tsx).

### 3. Confirm homepage data source = real listings only
- `src/pages/Index.tsx` already drives the marketplace grid + ticker from `useMarketItems` + `useListings` (real Supabase data). No data-source change needed — the "Mox Ruby / Black Lotus" strings the user saw are coming from the **stale published bundle**, not the new code. Once steps 1 + 2 ship, the live ticker will reflect real listings.
- I will NOT touch `MarketTicker.tsx` / `LiveMarketPanel.tsx` — they already query `listings` and `market_items` only.

### 4. Bump service worker cache to force a refresh
File: `public/sw.js`
- Bump `CACHE_NAME` from `cardboom-v4` → `cardboom-v5` so any returning visitor's browser drops the old cached homepage HTML/JS the moment they reload after publish.

### 5. After code changes — you must Publish
- These are frontend changes. They will only appear on `cardboom.com` after you click **Publish → Update** in the top-right of the editor. After ~60 sec do a hard refresh (Cmd/Ctrl+Shift+R).

## Files touched

| File | Change |
|---|---|
| `src/components/GlobalTCGStats.tsx` | New SEO H1 + subtitle |
| `src/components/Header.tsx` | Add top-level Catalog nav link (desktop + mobile) |
| `public/sw.js` | Bump cache version to v5 |

## What's intentionally NOT changed
- `HeroSection.tsx` (orphan component — leaving in place; future cleanup item)
- Any data layer / Supabase queries
- Catalog code (already live and correct)

