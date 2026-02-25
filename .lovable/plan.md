
# CardBoom Website Audit - Comprehensive Fix Plan

## Executive Summary
After a thorough audit of the CardBoom codebase, I found **8 critical issues** and **several warnings** that need attention. The main areas requiring fixes are:

1. **Database Query Error** - Edge function referencing wrong column name
2. **Price Estimates Failing** - Console error visible to users
3. **Sitemap Not Deploying** - Edge function not accessible
4. **SEO Canonical Mismatch** - Grading page pointing to wrong domain
5. **Legacy SEO Utility Conflict** - Two different SITE_URL sources
6. **Database Security Warnings** - RLS policies and function settings
7. **Stats Display Stability** - Already fixed in previous session

---

## Critical Issues Found

### Issue 1: Database Column Name Mismatch (BREAKING)
**Location:** `supabase/functions/fetch-price-estimates/index.ts` (lines 303-318)

**Problem:** The code references `psa_10_price` and `psa_9_price` but the actual database columns are `psa10_price` and `psa9_price` (without underscores).

**Evidence from Postgres logs:**
```
error_severity: ERROR
event_message: column market_items.psa_10_price does not exist
```

**Console error visible to user:**
```
Error fetching price estimates: No pricing data available
```

**Fix Required:**
```typescript
// Change from:
.select('current_price, psa_10_price, psa_9_price')
marketItem.psa_9_price
marketItem.psa_10_price

// To:
.select('current_price, psa10_price, psa9_price')
marketItem.psa9_price
marketItem.psa10_price
```

---

### Issue 2: SEO Domain Configuration Conflicts
**Locations:**
- `src/lib/seoUtils.ts` - Hardcoded to `https://cardboom.com`
- `src/lib/seo/config.ts` - Dynamic detection (correct)
- `src/pages/Grading.tsx` - Hardcoded canonical to `https://cardboom.com/grading`

**Problem:** The Grading page uses the legacy `seoUtils.ts` and hardcodes the production domain, while the rest of the site now uses the dynamic `src/lib/seo/config.ts`. This causes Google to see conflicting signals.

**Fix Required:**
1. Update `src/lib/seoUtils.ts` to use dynamic URL detection (matching config.ts)
2. Update `src/pages/Grading.tsx` to use `UniversalSEO` component instead of manual Helmet tags

---

### Issue 3: Sitemap Edge Function Not Accessible
**Evidence:** 
```
curl_edge_functions error: status code 404, body {"code":"NOT_FOUND"}
```

**Problem:** The sitemap edge function exists in code but is returning 404, meaning Google cannot crawl the dynamic sitemaps.

**Fix Required:**
- Verify function deployment
- Check function name matches the path
- Redeploy the sitemap function

---

### Issue 4: Grading Page Not Using Universal SEO
**Location:** `src/pages/Grading.tsx` (lines 305-329)

**Problem:** Still using manual `<Helmet>` with hardcoded URLs instead of the new `UniversalSEO` component.

**Current (problematic):**
```jsx
<Helmet>
  <link rel="canonical" href="https://cardboom.com/grading" />
  <meta property="og:url" content="https://cardboom.com/grading" />
</Helmet>
```

**Fix Required:** Replace with:
```jsx
<UniversalSEO
  data={{
    intent: 'guide',
    entityName: 'AI Card Grading',
    identifier: 'grading',
    keywords: ['card grading', 'AI grading', 'PSA alternative'],
    customMeta: {
      title: seo.title,
      description: seo.description,
    },
    faqs: [...existingFaqs],
  }}
/>
```

---

### Issue 5: One Piece Category URL Inconsistency
**Locations:**
- `src/lib/seo/config.ts` line 26: `slug: 'one-piece'`
- `public/sitemap-static.xml` line 44: `/catalog/onepiece`
- `supabase/functions/sitemap/index.ts` line 13: `slug: 'one-piece'`

**Problem:** Inconsistent URL slugs between `one-piece` and `onepiece` create duplicate content issues.

**Fix Required:** Standardize all One Piece URLs to use `one-piece` slug (with hyphen) for consistency.

---

## Security Warnings (From Linter)

### Warning 1: RLS Policies with "Always True"
**Issue:** Some tables have RLS enabled but use `USING (true)` for UPDATE/DELETE/INSERT which is overly permissive.

### Warning 2: Functions Missing search_path
**Issue:** 8+ database functions don't have `search_path` set, which is a security best practice.

### Warning 3: Security Definer View
**Issue:** There's a view with SECURITY DEFINER that may bypass RLS policies.

### Warning 4: Extensions in Public Schema
**Issue:** Some extensions are installed in the public schema instead of a dedicated schema.

---

## Data Health Check

| Metric | Value | Status |
|--------|-------|--------|
| Active Listings | 80 | OK |
| Market Items with Prices | 21,382 | OK |
| Total Orders | 1 | OK |
| Completed Orders | 1 | OK |
| Total Volume | $1,700.36 | OK |
| Total Users | 20 | OK |

---

## Implementation Plan

### Phase 1: Critical Bug Fixes (Immediate)

1. **Fix fetch-price-estimates edge function**
   - Change `psa_10_price` to `psa10_price`
   - Change `psa_9_price` to `psa9_price`
   - Redeploy function

2. **Deploy sitemap edge function**
   - Verify function exists
   - Force redeploy

### Phase 2: SEO Consistency (High Priority)

3. **Update seoUtils.ts**
   - Add dynamic URL detection matching config.ts
   - Ensure SITE_URL uses current domain

4. **Migrate Grading page to UniversalSEO**
   - Replace manual Helmet with UniversalSEO component
   - Preserve existing structured data

5. **Fix One Piece URL consistency**
   - Update sitemap-static.xml to use `/catalog/one-piece`
   - Ensure all routes use hyphenated version

### Phase 3: Security Improvements (Recommended)

6. **Review RLS policies**
   - Audit tables with `USING (true)` policies
   - Add proper user-based restrictions

7. **Set search_path on functions**
   - Update database functions with explicit search_path

---

## Files to Modify

| File | Change Type | Priority |
|------|-------------|----------|
| `supabase/functions/fetch-price-estimates/index.ts` | Bug fix | Critical |
| `src/lib/seoUtils.ts` | URL fix | High |
| `src/pages/Grading.tsx` | SEO migration | High |
| `public/sitemap-static.xml` | URL consistency | Medium |
| Database migrations | Security | Medium |

---

## Expected Outcomes

After implementing these fixes:
- Price estimates will load correctly on listing pages
- Sitemap will be accessible to Google crawler
- Grading page will be properly indexed with correct canonical
- SEO consistency across all pages
- Improved security posture

---

## Technical Notes

### Current Database Schema for market_items price columns:
```
current_price, base_price, price_24h_ago, price_7d_ago, price_30d_ago,
last_sale_price, current_price_cents, psa10_price, psa9_price, raw_price,
price_status, verified_price, listing_median_price, price_updated_at,
blended_market_price, price_confidence
```

Note: Columns use `psa10_price` format (no underscore before number).
