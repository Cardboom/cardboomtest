

# Plan: Switch This Project to Your External Supabase

## The Problem
Lovable Cloud auto-manages `src/integrations/supabase/client.ts` and `.env`, so we can't edit those files directly. However, we **can** work around this.

## The Approach

Create a **new Supabase client file** that points to your external project, and update all 325+ files to import from it instead of the auto-managed one. The auto-generated files will still exist but won't be used by anything.

## Steps

### 1. Create new client file
Create `src/lib/supabase.ts` with your external Supabase credentials:
- URL: `https://dlntgafmjkgtwvflsqsl.supabase.co`
- Anon key: `eyJhbGci...0nM`

### 2. Update all imports (325+ files)
Find-and-replace across the entire `src/` directory:
```
from "@/integrations/supabase/client"  →  from "@/lib/supabase"
```

### 3. Handle types
The auto-generated `types.ts` reflects the Lovable Cloud database schema. Since your external Supabase has the same schema (from the migration SQL), we'll create a minimal re-export or copy the types so TypeScript stays happy.

### 4. Edge Functions
The 103 edge functions in `supabase/functions/` will still deploy to **Lovable Cloud** (that can't be changed). For your external Supabase, you'll need to deploy them via CLI separately:
```bash
supabase link --project-ref dlntgafmjkgtwvflsqsl
supabase functions deploy
```

The frontend will call functions on your external project once we update the client.

## Important Caveats

- **Edge functions called via `supabase.functions.invoke()`** will automatically route to your external project once the client points there — but only if those functions are deployed there via CLI.
- **Lovable Cloud will keep running** in the background but nothing will use it.
- **Any future auto-regeneration** of `client.ts` or `types.ts` won't affect the app since nothing imports from them.
- The `.env` variables like `VITE_SUPABASE_PROJECT_ID` will still point to Lovable Cloud, but we won't reference them in the new client.

## Scope
- 1 new file created
- ~325 files updated (automated find-and-replace)
- Types file created or re-exported

