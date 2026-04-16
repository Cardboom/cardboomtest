

## Issue

cardboom.com is a custom domain on this project, but the catalog/SEO/heading changes you've made recently are **frontend changes**. Frontend changes don't go live on `cardboom.com` (or `cardboomtest.lovable.app`) until you click **Publish → Update** in the editor.

What you see right now:
- **Preview** (`id-preview--*.lovable.app`) → always shows latest changes ✅
- **cardboomtest.lovable.app** → shows last-published version ❌ (stale)
- **cardboom.com / www.cardboom.com** → shows last-published version ❌ (stale)

The catalog data IS on the external Supabase project and IS being written correctly — but the frontend code that reads/displays it (the new pagination fix, heading updates, footer SEO, vertical configs) hasn't been published to production yet.

## What you need to do

**Click the Publish button → Update** in the top-right of the Lovable editor. After 30-60 seconds, both `cardboomtest.lovable.app` and `cardboom.com` will reflect:
- All SEO heading changes (H1/H2/H3 keyword rewrites)
- Footer expansion with grading/games/sports sections
- New vertical configs (Star Wars, Union Arena, FIFA, WNBA, Gaming, LoL Riftbound)
- Catalog pagination fix (full sets visible, no 1000-row cap)
- Bulk import admin UI

## After publishing — verify checklist

1. Hard refresh `cardboom.com` (Cmd+Shift+R / Ctrl+Shift+R) to bust browser cache
2. Visit `cardboom.com/catalog` → confirm all sets show with full card counts
3. Open a set page → scroll, confirm 100+ cards load (not capped at ~30)
4. Check homepage H1 reads "Buy, Sell & AI-Grade Collectible Trading Cards"
5. Scroll footer → confirm new "Trading Card Games" / "Sports Cards" / "Card Grading Services" columns

## If after publishing it still looks old

Likely causes (and what I'd do in default mode):
- **Service worker caching** — `public/sw.js` may be serving stale assets. Fix: bump cache version in sw.js
- **CDN cache** — Lovable hosting may cache `index.html` briefly; usually clears within 5 min
- **DNS proxy (Cloudflare)** — if cardboom.com runs through Cloudflare proxy, purge cache there

## No code changes proposed in this plan

This is an action item for you (publish), not a code task. Once you publish and confirm cardboom.com is still showing stale UI after a hard refresh + 5 min wait, send me a follow-up and I'll investigate the service worker / cache layer.

