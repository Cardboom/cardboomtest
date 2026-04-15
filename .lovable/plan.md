

# Auth Integration Setup for External Supabase

## Current State

Your app already has auth code in place (`src/pages/Auth.tsx`) with email/password signup, Google OAuth, phone OTP login, and password reset — all pointing to your external Supabase project (`dlntgafmjkgtwvflsqsl`) via `src/lib/supabase.ts`.

However, **Google OAuth needs to be configured on that external Supabase project's dashboard** — this is not something Lovable Cloud can manage since the auth lives on your own Supabase instance.

## What Needs to Happen

### 1. Configure Google OAuth on Your External Supabase Dashboard
You need to go to your external Supabase project dashboard → Authentication → Providers → Google and:
- Enable Google provider
- Add your **Google Client ID** and **Client Secret** (from Google Cloud Console)
- Set the redirect URL: `https://dlntgafmjkgtwvflsqsl.supabase.co/auth/v1/callback`

### 2. Google Cloud Console Setup
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create OAuth 2.0 credentials (Web Application type)
- Add authorized redirect URI: `https://dlntgafmjkgtwvflsqsl.supabase.co/auth/v1/callback`
- Also add your app origins: `https://cardboomtest.lovable.app` and your production domain

### 3. Auto-Create Profile Trigger
Your `migration-package/05_auth_triggers.sql` has triggers for `handle_new_user()` and `handle_new_user_wallet()` — verify these are deployed on your external DB so profiles are auto-created on signup.

### 4. Code-Side (Minor Fixes)
- **Email confirmation**: Verify your external Supabase has email templates configured (confirm signup, password reset)
- **Missing tables**: Console shows errors for `grading_orders`, `cardboom_news`, `cached_tcg_drops`, `card_reels`, `card_wars`, `cached_social_posts` — these tables need to be created on your external DB or the queries need graceful fallbacks

## What I Can Do in Lovable
- Add error handling / graceful fallbacks for missing tables
- Verify the auth flow code is correct
- Help configure edge function secrets if needed

## What You Must Do Externally
- Configure Google OAuth provider on your external Supabase dashboard
- Create Google Cloud OAuth credentials
- Ensure auth triggers are deployed

Would you like me to proceed with the code-side improvements, or do you need help with the Google Cloud setup steps first?

