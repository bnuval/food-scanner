# PureBite AI

Photograph a food label and get an instant health score, a **BUY / AVOID** verdict, the
ingredients to worry about and healthier alternatives you can buy locally — plus a search for
clean food and cosmetics. Explanations are in English, and also in Hindi for the India market.

This repository contains two apps that share one backend:

| | Where | Stack |
|---|---|---|
| **Web app + API** | repository root (`src/`) | Next.js 14, React 18, Tailwind, Google Gemini (REST) |
| **Android app** (iOS later) | [`apps/mobile`](apps/mobile/README.md) | Expo SDK 58, React Native 0.88, TypeScript |

> **Before publishing anything, work through [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).**
> The public API has no request rate limits. Configure Gemini API quotas and billing alerts
> before exposing it publicly; analyze and search requests can incur API costs.

## Features

**Package scanner** — up to 3 photos (ingredient list, nutrition table, front/barcode) are
scored by Gemini on a 0–100 scale modelled on the Yuka 3-pillar method (nutrition 60 %,
additives 30 %, organic/natural 10 %). The result shows the verdict (BUY at 65+), the main
reason, flagged ingredients, positive highlights, country-specific regulatory notes and 2–3
better alternatives with store links.

**Product search** — find highly rated food or cosmetics for a query, with links to Amazon,
Flipkart, Blinkit, Nykaa (India) or Amazon, Walmart, Target, Sephora (US).

**Markets** — India, United States, United Kingdom, European Union, Australia and UAE
(inferred from the device time zone; changeable in the mobile app).

**Admin analytics** (web, `/admin`) — page views per day and market; visitors are stored only as
an anonymous daily hash, never as IP addresses.

**Mobile-only** — camera-first scanning with barcode detection, on-device scan history, light
and dark themes, full English/Hindi UI, TalkBack support. See the
[mobile README](apps/mobile/README.md).

## API

All routes are `POST` with JSON bodies. Analyze and search requests are validated with zod, but
the public API has no rate limits; each successful request can incur Gemini API cost.
Admin password attempts are also unlimited, so use a strong, unique `ADMIN_PASSWORD`.

| Route | Body |
|---|---|
| `/api/analyze` | `{ imagesBase64: string[1..3] (JPEG data URLs ≤ 1.5 MB), userCountry, userTimezone, barcode? }` |
| `/api/search-products` | `{ query (≤ 100 chars), categoryType: "food" \| "cosmetics", userCountry }` |
| `/api/track` | `{ path, country }` |
| `/api/admin/stats` | `{ password }` |

Errors are generic (`{ code, error }`).

## Run the web app locally

Requirements: Node.js 20+ and npm.

```bash
npm ci
echo "GEMINI_API_KEY=your-gemini-api-key" > .env.local
npm run dev               # http://localhost:3000
```

The key above is enough to try scanning and search. `npm run lint` and `npm run build` must pass
before you push.

## Environment variables

Set these in your hosting provider (Vercel → Project → Settings → Environment Variables, or
Netlify → Site configuration → Environment variables). None of them belong in the mobile app.

| Variable | Required in production | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | yes | Google Gemini API key (server-side only) |
| `ADMIN_PASSWORD` | yes, for `/admin` | Admin dashboard password. No default: the dashboard is disabled when unset. |
| `IP_HASH_SECRET` | recommended | Secret for the anonymous daily visitor hash (`openssl rand -hex 32`). Without it every visitor is stored as `anon`. |
| `JSONBIN_API_KEY` + `JSONBIN_BIN_ID` | for analytics | Storage for page-view counters. |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | no | Override the pinned fast models (`gemini-3.5-flash-lite`, fallback `gemini-3.1-flash-lite`). |

## Deploy the web app

The project deploys as a standard Next.js app on **Vercel** (or **Netlify** with
`@netlify/plugin-nextjs`). Pushing to `main` triggers a production deploy.

1. Set the required environment variables above for the **Production** environment and redeploy.
   Configure Gemini API quotas and billing alerts; the app itself does not limit request volume.
2. Make sure the production domain is publicly reachable: Vercel *Deployment Protection* must not
   cover the production domain, or the mobile app cannot call the API.
3. Prefer a custom domain (for example `https://api.yourdomain.com` or `https://yourdomain.com`):
   it becomes the mobile app's `EXPO_PUBLIC_API_BASE_URL` and should never change once the app
   is published.

## Mobile app

Everything about the Android app — features, running it on an emulator or phone, building, and
publishing to Google Play — is in **[apps/mobile/README.md](apps/mobile/README.md)**.
