

# SEO Heading Hierarchy & Keyword Optimization Roundup

## Problem
Pages are missing proper H1/H2/H3 hierarchy for target keywords. Several game categories (Star Wars, Bleach/Union Arena, FIFA, WNBA, Gaming/Video Games) have zero SEO vertical config. Headings use generic text instead of keyword-rich, search-targeted copy.

## Plan

### 1. Fix Homepage H1 & Section Headings (HeroSection + Index)
- **H1**: Change from `"Grade Your Portfolio. Track Your Portfolio. Trade It."` to keyword-rich: `"Buy, Sell & AI-Grade Collectible Trading Cards"` with a subtitle span for `"Pokémon, Yu-Gi-Oh!, One Piece, MTG & Sports Cards"`
- **H2 sections** on homepage (currently generic):
  - Listings section: `"Browse Trading Cards for Sale"` (with category in view)
  - GradingCTA: `"AI Card Grading — Get Your Cards Graded in Minutes"`
  - SEOFeaturesSection: `"The #1 Collectible Card Trading Platform"` 
  - FAQSection: Keep `"Everything You Need to Know About CardBoom"`
  - FeatureShowcase: Add an H2 like `"Why Collectors Choose CardBoom"`

### 2. Fix Grading Page Heading Hierarchy
- Already has strong H1 (`"Our Label Means Authentic"`) -- change to `"AI Trading Card Grading & Authentication | CBGI"`
- Ensure H2s follow a keyword strategy:
  - `"AI-Powered Card Grading — How It Works"`
  - `"Supported Card Types for Grading"` (Pokémon, Yu-Gi-Oh!, MTG, etc.)
  - `"Card Grading Pricing & Turnaround Times"`
  - `"CardBoom Card Passport — Digital Certificate"`

### 3. Fix Category Pages (BuyCategoryPage) H1/H2
- H1 is good: `"Buy {Category} Cards Online"` -- keep
- Add H3s under the "About" section for each game with keyword phrases like:
  - `"How to Buy Pokémon Cards on CardBoom"`
  - `"Pokémon Card Price Guide & Market Data"`

### 4. Fix Catalog Explorer Heading
- Change H1 from `"Card Catalog"` to `"Trading Card Catalog — Browse Sets & Prices"`
- Set-level H2: `"{Game} Sets — Complete Card List & Prices"`

### 5. Add Missing Game Verticals to SEO Config
Add to `src/lib/seo/config.ts` VERTICAL_CONFIG:
- `'lol-riftbound'` — LoL Riftbound TCG
- `'unionarena'` / `'bleach'` — Union Arena (Bleach, Jujutsu Kaisen, etc.)
- `'star-wars'` — Star Wars Unlimited
- `'gaming'` — Video Games & Consoles
- `'fifa'` — FIFA Cards
- `'wnba'` — WNBA Cards

Add corresponding URL_TO_DB_CATEGORY mappings.

### 6. Add Missing Category Labels
Update `src/lib/categoryLabels.ts`:
- Add `'unionarena': 'Union Arena'`, `'bleach': 'Bleach TCG'`
- Add to `mainCategories` array

### 7. Markets & Gaming Page Headings
- Markets H1: Change from `"Marketplace"` to `"Trading Card Marketplace — Buy & Sell Cards"`
- Gaming H1: Change from `"Gaming Hub"` to `"Buy & Sell Video Games, Consoles & Game Points"`

### 8. ItemDetail / CardPage H1 Enhancement
- CardPage H1 is good (uses `{cardName}`) -- add an H2 for `"Price History & Market Data for {cardName}"`
- Add H3 for `"Buy {cardName} — Listings from Verified Sellers"`

### 9. Footer Internal Linking with H3 Headers
Add keyword-rich H3 section headers to Footer:
- `"Card Grading Services"` — links to /grading, /ai/*
- `"Trading Card Games"` — links to all category pages
- `"Sports Cards"` — links to NBA, NFL, MLB, FIFA
- `"Tools & Resources"` — links to /catalog, /deals, /pricing

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/HeroSection.tsx` | Rewrite H1 with target keywords |
| `src/pages/Index.tsx` | Add H2 to listings section |
| `src/pages/Grading.tsx` | Rewrite H1 & H2s with grading keywords |
| `src/pages/CatalogExplorer.tsx` | Keyword-rich H1 & H2 |
| `src/pages/Markets.tsx` | Better H1 |
| `src/pages/Gaming.tsx` | Better H1 |
| `src/pages/CardPage.tsx` | Add H2/H3 for price & listings |
| `src/components/GradingCTA.tsx` | Keyword-rich H2 |
| `src/components/SEOFeaturesSection.tsx` | Keyword-rich H2 |
| `src/components/FAQSection.tsx` | Keep current H2 |
| `src/components/Footer.tsx` | Add H3 section headers with game links |
| `src/lib/seo/config.ts` | Add 6+ missing verticals + URL mappings |
| `src/lib/categoryLabels.ts` | Add Union Arena, Bleach, Star Wars labels |

## Technical Notes
- Every page gets exactly 1 H1, with H2s for major sections and H3s for subsections
- All headings target high-volume search queries (e.g. "buy pokemon cards", "ai card grading", "trading card marketplace")
- No backend changes needed -- all frontend heading + config updates

