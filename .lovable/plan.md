

# Plan: Fix Invalid API Key + Hardcode External Credentials in Edge Functions

## The Problem

There are TWO issues right now:

1. **Wrong anon key in `src/lib/supabase.ts`** — The file has the OLD anon key (`iat:1744379043`) but your new external project uses a different one (`iat:1766043024`). This is why every API call returns "Invalid API key" 401 errors.

2. **Edge functions still use Lovable Cloud's internal env vars** — They read `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` which point to the Lovable Cloud database, not your external one.

## Steps

### 1. Fix the anon key in `src/lib/supabase.ts`
Update to the correct new anon key you provided:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbnRnYWZtamtndHd2ZmxzcXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDMwMjQsImV4cCI6MjA4MTYxOTAyNH0.0ZWquhQe_pPvRL8aMzRvxI1y38Be4q1N2Fmvj9AW0nM
```

This single change will fix all the 401 errors on the frontend.

### 2. Edge functions — need your Service Role Key
To make edge functions write to your external database, I need your **Service Role Key** (found in Supabase Dashboard → Settings → API → `service_role` key). 

Once you provide it, I will update all 103 edge functions to use the external project URL and service role key instead of the internal env vars.

**Important**: The service role key is a secret with full database access. I will store it securely using the secrets management tool, not hardcode it in source code.

## What this fixes
- All 401 "Invalid API key" errors on every page load
- Frontend reads/writes go to your external database
- After step 2: edge functions (scraping, notifications, etc.) also write to your external database

