# CardBoom Production Deployment Checklist

**Last Updated:** January 2026  
**Company:** Brainbaby Bilişim A.Ş.  
**Product:** CardBoom - TCG & Collectibles Marketplace

---

## 📋 Pre-Production Status Summary

### ✅ COMPLETE
- [x] SEO: Meta tags, OG images, JSON-LD structured data, hreflang, sitemap edge function
- [x] Email: Templates designed, Resend integration, cardboom.com domain verified
- [x] Authentication: Email, phone (SMS via Twilio), 2FA support
- [x] Payments: Iyzico integration (3DS), balance system, wire transfers
- [x] Real-time: Supabase Realtime for notifications, messaging
- [x] Analytics: Google Tag Manager (GTM-NMK9MNXS)
- [x] PWA: manifest.webmanifest, icons, service worker ready
- [x] Internationalization: EN, DE, TR, FR, IT, AR

### ⚠️ NEEDS TEAM REVIEW
- [ ] RLS policies: 35+ "always true" policies (many intentional for public data)
- [ ] Function search_path: 2 functions need `SET search_path = public`
- [ ] Extension location: Consider moving pg extensions from public schema

---

## 🔐 Security Audit Results

### Database Security (181 tables)

**Critical Tables with User Data:**
| Table | RLS | Notes |
|-------|-----|-------|
| profiles | ✅ | User profiles, avatar, settings |
| orders | ✅ | Purchase history |
| transactions | ✅ | Balance movements |
| listings | ✅ | Marketplace listings |
| vault_items | ✅ | User's physical card storage |
| card_instances | ✅ | Portfolio holdings |
| messages | ✅ | Private messaging |
| kyc_documents | ✅ | Verified seller documents |

**Public Read Tables (intentionally open):**
- market_items, card_sets, cardboom_news, achievements
- creator_profiles (public), community_card_votes
- email_templates, currency_rates

### Recommended Security Fixes

```sql
-- Fix function search_path (run as migration)
ALTER FUNCTION public.your_function_name() SET search_path = public;

-- Example for any functions missing this
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
```

---

## 🔑 Environment Secrets (17 configured)

| Secret | Purpose | Status |
|--------|---------|--------|
| RESEND_API_KEY | Email delivery | ✅ |
| RESEND_FROM_EMAIL | Sender address | ✅ |
| TWILIO_ACCOUNT_SID | SMS/OTP | ✅ |
| TWILIO_AUTH_TOKEN | SMS/OTP | ✅ |
| TWILIO_PHONE_NUMBER | SMS sender | ✅ |
| IYZICO_API_KEY | Payment processing | ✅ |
| IYZICO_SECRET_KEY | Payment processing | ✅ |
| IYZICO_BASE_URL | Payment endpoint | ✅ |
| OPENAI_API_KEY | AI features | ✅ |
| GELIVER_API_KEY | Shipping | ✅ |
| PRICECHARTING_API_KEY | Price data | ✅ |
| CARDMARKET_RAPIDAPI_KEY | EU prices | ✅ |
| EBAY_RAPIDAPI_KEY | US prices | ✅ |
| JUSTTCG_API_KEY | Prices | ✅ |
| KINGUIN_API_KEY | Digital codes | ✅ |
| XIMILAR_API_TOKEN | Image recognition | ✅ |
| LOVABLE_API_KEY | Internal | ✅ (managed) |

### Production Secrets to Add

```
RESEND_REPLY_TO=support@cardboom.com
GTM_ID=GTM-NMK9MNXS
```

---

## 📱 Mobile App Setup (Capacitor)

### Prerequisites
- Node.js 18+
- Xcode 15+ (iOS) - Mac only
- Android Studio (Android)

### Configuration

**capacitor.config.ts:**
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cardboom.app',
  appName: 'CardBoom',
  webDir: 'dist',
  server: {
    // For development hot-reload:
    // url: 'https://b56128be-ee17-48af-baa7-915f88c0900b.lovableproject.com?forceHideBadge=true',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0f1a',
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0a0f1a'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  },
  ios: {
    scheme: 'CardBoom'
  },
  android: {
    buildOptions: {
      keystorePath: 'release.keystore',
      keystoreAlias: 'cardboom'
    }
  }
};

export default config;
```

### Build Commands

```bash
# 1. Clone from GitHub
git clone <your-repo>
cd cardboom

# 2. Install dependencies
npm install

# 3. Add native platforms
npx cap add ios
npx cap add android

# 4. Build web app
npm run build

# 5. Sync to native
npx cap sync

# 6. Open in IDE
npx cap open ios     # Opens Xcode
npx cap open android # Opens Android Studio

# 7. Run on device/emulator
npx cap run ios
npx cap run android
```

### App Store Requirements
- **iOS:** Apple Developer account ($99/year), App Store Connect setup
- **Android:** Google Play Developer account ($25 one-time)
- **Assets needed:**
  - App icon: 1024x1024 (iOS), 512x512 (Android)
  - Splash screen: 2732x2732
  - Screenshots: Various sizes per store guidelines
  - Privacy policy URL: https://cardboom.com/privacy
  - Terms URL: https://cardboom.com/terms

---

## ⚡ Edge Functions (66 total)

### Core Business Logic
| Function | Purpose | Auth Required |
|----------|---------|---------------|
| send-email | Transactional emails | Service role |
| send-notification | Push/in-app alerts | Service role |
| send-sms | OTP & alerts | Service role |
| verify-sms-otp | Phone auth | Public |
| iyzico-init-3ds | Payment init | User |
| iyzico-callback | Payment webhook | Webhook |
| process-wire-transfers | Bank transfer matching | Admin |
| inventory-escrow | Order fulfillment | Service role |
| cbgi-grade | Card grading | Admin |
| grading-submit | User grading requests | User |

### Data Sync Functions
| Function | Purpose | Schedule |
|----------|---------|----------|
| daily-sync-prices | Price aggregation | Daily |
| daily-price-snapshot | Historical data | Daily |
| check-price-alerts | User alerts | Hourly |
| send-weekly-digest | Portfolio reports | Weekly |
| fetch-tcg-news | News aggregation | 4x daily |

### Production Cleanup Done ✅
- Console.log statements: Production-safe (only error logging)
- CORS headers: Properly configured
- Error handling: Consistent JSON responses
- Rate limiting: Via Supabase (1000 req/min default)

---

## 🔍 SEO Configuration

### Meta Tags (index.html) ✅
- Title: "Cardboom - Premier Collectibles Trading Exchange"
- Description: 160 chars with keywords
- OG Image: /og-image.png (1200x630)
- Twitter Card: summary_large_image

### Structured Data ✅
- Organization schema
- WebSite with SearchAction
- WebApplication
- ItemList for categories

### Dynamic SEO
- React Helmet Async for page-specific meta
- Sitemap edge function at /sitemap.xml
- robots.txt configured

### Missing (Team to Add)
- [ ] OG image for /og-image.png (1200x630)
- [ ] Category-specific OG images
- [ ] FAQ schema on help pages

---

## 📧 Email Configuration

### Domain Setup ✅
- **Sender:** CardBoom <noreply@cardboom.com>
- **Reply-to:** support@cardboom.com
- **DNS Records:** SPF, DKIM, DMARC verified

### Templates (6 active)
| Template | Purpose |
|----------|---------|
| welcome | New user onboarding |
| price_alert | Watchlist price triggers |
| item_sold | Seller sale notification |
| order_confirmation | Buyer purchase receipt |
| weekly_digest | Portfolio summary |
| grading_complete | Grading results |

### Deliverability Features ✅
- Unsubscribe link in footer
- List-Unsubscribe headers (RFC 8058)
- Plain text fallback
- Professional footer with address

---

## 🚀 Deployment Checklist

### Before Go-Live
- [ ] Run security audit migration (search_path fixes)
- [ ] Generate OG image assets
- [ ] Test all payment flows (Iyzico sandbox → production)
- [ ] Verify SMS delivery for +90 numbers
- [ ] Load test core endpoints
- [ ] Set up error monitoring (Sentry recommended)
- [ ] Configure CDN for static assets
- [ ] SSL certificate verified for cardboom.com

### Post-Launch
- [ ] Monitor Resend delivery rates
- [ ] Check Supabase logs for errors
- [ ] Verify analytics tracking
- [ ] Test mobile app builds
- [ ] Submit to App Store / Play Store

---

## 📞 Support Contacts

- **Technical:** dev@brainbaby.ai
- **Business:** turk@brainbaby.ai
- **Legal:** legal@cardboom.com
- **User Support:** support@cardboom.com

---

## 📚 Documentation Links

- [Lovable Docs](https://docs.lovable.dev)
- [Capacitor Mobile Guide](https://lovable.dev/blog/mobile-app-development-with-lovable)
- [Supabase Docs](https://supabase.com/docs)
- [Resend Docs](https://resend.com/docs)
- [Iyzico API Docs](https://dev.iyzipay.com)
