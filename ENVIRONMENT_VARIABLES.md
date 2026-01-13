# CardBoom Environment Variables

This document lists all environment variables required for production deployment.

## Frontend (Vite)

These are automatically provided by Lovable Cloud:

```env
VITE_SUPABASE_URL=https://kgffwhyfgkqeevsuhldt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=kgffwhyfgkqeevsuhldt
```

## Backend (Edge Functions)

### Authentication & Communication

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Auto-provided |
| `SUPABASE_ANON_KEY` | Supabase anon/public key | Auto-provided |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin) | Auto-provided |

### Email (Resend)

| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | Resend API key | `re_xxxxx` |
| `RESEND_FROM_EMAIL` | Verified sender email | `CardBoom <noreply@cardboom.com>` |
| `RESEND_REPLY_TO` | Reply-to address | `support@cardboom.com` |

### SMS (Twilio)

| Variable | Description | Example |
|----------|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID | `ACxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | `xxxxx` |
| `TWILIO_PHONE_NUMBER` | Twilio sender number | `+1234567890` |

### Payments (Iyzico)

| Variable | Description | Example |
|----------|-------------|---------|
| `IYZICO_API_KEY` | Iyzico API key | `xxxxx` |
| `IYZICO_SECRET_KEY` | Iyzico secret key | `xxxxx` |
| `IYZICO_BASE_URL` | API endpoint | `https://api.iyzipay.com` (prod) |

### AI & Image Recognition

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | `sk-xxxxx` |
| `XIMILAR_API_TOKEN` | Ximilar image recognition | `xxxxx` |

### Price Data APIs

| Variable | Description |
|----------|-------------|
| `PRICECHARTING_API_KEY` | PriceCharting market data |
| `CARDMARKET_RAPIDAPI_KEY` | CardMarket EU prices |
| `EBAY_RAPIDAPI_KEY` | eBay sold listings |
| `JUSTTCG_API_KEY` | JustTCG pricing |

### Shipping & Fulfillment

| Variable | Description |
|----------|-------------|
| `GELIVER_API_KEY` | Geliver shipping API |
| `KINGUIN_API_KEY` | Digital code fulfillment |

---

## Local Development

For local development, create a `.env.local` file:

```env
# These are provided by Lovable Cloud, but for local dev:
VITE_SUPABASE_URL=https://kgffwhyfgkqeevsuhldt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
```

Edge functions use Deno.env.get() and secrets are managed through Lovable Cloud settings.

---

## Production Deployment

1. All secrets are managed via **Lovable Cloud → Settings → Secrets**
2. Edge functions automatically have access to configured secrets
3. Never commit secrets to version control
4. Rotate keys periodically (especially payment and auth keys)

---

## Secret Rotation Checklist

When rotating secrets:

1. [ ] Generate new key in provider dashboard
2. [ ] Update secret in Lovable Cloud settings
3. [ ] Test edge function with new key
4. [ ] Revoke old key in provider dashboard
5. [ ] Document rotation date

Recommended rotation schedule:
- **Critical (payments, auth):** Every 90 days
- **API keys:** Every 180 days
- **Service tokens:** Annually
