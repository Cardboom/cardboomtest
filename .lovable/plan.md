

# Connecting Rork to Your CardBoom Backend

## Overview

Since you want to rebuild CardBoom as a native mobile app in Rork, you'll need to connect the Rork app to your existing Lovable Cloud backend. The good news is your backend is fully accessible via standard APIs — Rork just needs to call them.

## What Rork Needs to Connect

Your Rork app will communicate with your existing backend using two things:

1. **Your backend URL**: `https://kgffwhyfgkqeevsuhldt.supabase.co`
2. **Your public API key** (the anon key already in your .env)

These are safe to use in a mobile app — they're public keys, and your security is handled by your backend's Row Level Security policies.

## How to Set Up in Rork

### Step 1: Install the Supabase SDK in Rork
In your Rork project, add the `@supabase/supabase-js` package and initialize it:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kgffwhyfgkqeevsuhldt.supabase.co',
  'YOUR_ANON_KEY'
);
```

### Step 2: Use Your Existing API Endpoints
Your backend already has these edge functions that Rork can call:

| Feature | Endpoint | Purpose |
|---------|----------|---------|
| Market data | `market-api` | Browse cards, search, filters |
| Catalog | `catalog-api` | Card catalog and details |
| Pricing | `fetch-prices` | Real-time price data |
| Auth | Supabase Auth | Login, signup, sessions |
| Messaging | `messaging` | Chat between users |
| Payments | `iyzico-init-3ds` | Payment processing |
| Grading | `grading-submit` | Card grading |
| Shipping | `geliver-shipping` | Shipping labels |
| Card scan | `analyze-card` | AI card recognition |

### Step 3: Authentication
Use Supabase Auth directly from Rork:
```typescript
// Sign up
await supabase.auth.signUp({ email, password });

// Sign in
await supabase.auth.signInWithPassword({ email, password });

// Access protected data (RLS handles security)
const { data } = await supabase.from('listings').select('*');
```

### Step 4: Direct Table Access
Rork can query your tables directly (RLS policies protect the data):
- `market_items` — Card catalog (11,000+ items)
- `listings` — Active marketplace listings
- `profiles` — User profiles
- `wallets` — User balances
- `orders` — Purchase history
- `messages` / `conversations` — Chat
- `notifications` — User notifications

### Step 5: Edge Function Calls
For backend functions:
```typescript
const { data } = await supabase.functions.invoke('market-api', {
  body: { action: 'search', query: 'Charizard' }
});
```

## What You Don't Need to Change

- **No backend changes needed** — Everything stays on Lovable Cloud
- **No API keys to move** — Secrets stay in Lovable Cloud
- **No database migration** — Same database, same data
- **Both apps can run simultaneously** — Web app on Lovable, mobile on Rork

## CORS Consideration

Your edge functions currently have CORS restricted to approved domains. You may need to update the CORS headers in `supabase/functions/_shared/cors.ts` to allow requests from your Rork app's domain or use `*` for mobile apps (since native apps don't send Origin headers, this mainly matters during Rork's web preview).

## Summary

Think of it this way: **Lovable Cloud is your backend, Rork is your new mobile frontend.** You're just building a new UI that talks to the same backend. All your data, users, payments, and logic stay exactly where they are.

To get started in Rork, tell it: "Build a TCG marketplace app that connects to an existing Supabase backend" and provide your backend URL and anon key.

