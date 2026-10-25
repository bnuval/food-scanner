# PureBite AI

Photograph a food label and get an instant health score, a **BUY / AVOID** verdict, the
ingredients to worry about and healthier alternatives you can buy locally — plus a search for
clean food and cosmetics. Explanations are in English, and also in Hindi for the India market.

This repository contains two apps that share one backend:

| | Where | Stack |
|---|---|---|
| **Web app + API** | repository root (`src/`) | Next.js 14, React 18, Tailwind, Google Gemini (REST), Upstash Redis |
| **Android app** (iOS later) | [`apps/mobile`](apps/mobile/README.md) | Expo SDK 58, React Native 0.88, TypeScript |

> **Before publishing anything, work through [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).**
> The hardened API refuses analyze/search requests in production until Upstash Redis is
> configured, and several secrets must be set or rotated first.

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

All routes are `POST` with JSON bodies, validated with zod and rate-limited per IP and per app
install (`X-Install-Id`).

| Route | Body | Limits (default) |
|---|---|---|
| `/api/analyze` | `{ imagesBase64: string[1..3] (JPEG data URLs ≤ 1.5 MB), userCountry, userTimezone, barcode? }` | 5/min, 30/day per client; 1000/day overall |
| `/api/search-products` | `{ query (≤ 100 chars), categoryType: "food" \| "cosmetics", userCountry }` | 10/min, 100/day per client; 3000/day overall |
| `/api/track` | `{ path, country }` | 30/min per client |
| `/api/admin/stats` | `{ password }` | 5 failed logins / 15 min per IP |

Errors are generic (`{ code, error }`) and rate-limited responses are `429` with `Retry-After`.

## Run the web app locally

Requirements: Node.js 20+ and npm.

```bash
npm ci
echo "GEMINI_API_KEY=your-gemini-api-key" > .env.local
npm run dev               # http://localhost:3000
```

Outside production, rate limiting is skipped when Upstash is not configured, so the key above
is enough to try scanning and search. `npm run lint` and `npm run build` must pass before you
push.

## Environment variables

Set these in your hosting provider (Vercel → Project → Settings → Environment Variables, or
Netlify → Site configuration → Environment variables). None of them belong in the mobile app.

| Variable | Required in production | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | yes | Google Gemini API key (server-side only) |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | yes | Rate limiting. The Vercel Upstash integration's `KV_REST_API_URL` + `KV_REST_API_TOKEN` also work. Without them analyze/search return errors in production (fail closed). |
| `ADMIN_PASSWORD` | yes, for `/admin` | Admin dashboard password. No default: the dashboard is disabled when unset. |
| `IP_HASH_SECRET` | recommended | Secret for the anonymous daily visitor hash (`openssl rand -hex 32`). Without it every visitor is stored as `anon`. |
| `JSONBIN_API_KEY` + `JSONBIN_BIN_ID` | for analytics | Storage for page-view counters. |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | no | Override the pinned models (`gemini-3.8-flash`, fallback `gemini-3.6-flash`). |
| `GLOBAL_DAILY_ANALYZE_LIMIT`, `GLOBAL_DAILY_SEARCH_LIMIT` | no | Daily request budget across all users (defaults 1000 / 3000) — your Gemini cost ceiling. |

## Deploy the web app

The project deploys as a standard Next.js app on **Vercel** (or **Netlify** with
`@netlify/plugin-nextjs`). Pushing to `main` triggers a production deploy.

1. Set the environment variables above for the **Production** environment and redeploy.
2. Make sure the production domain is publicly reachable: Vercel *Deployment Protection* must not
   cover the production domain, or the mobile app cannot call the API.
3. Prefer a custom domain (for example `https://api.yourdomain.com` or `https://yourdomain.com`):
   it becomes the mobile app's `EXPO_PUBLIC_API_BASE_URL` and should never change once the app
   is published.

## Mobile app

Everything about the Android app — features, running it on an emulator or phone, building, and
publishing to Google Play — is in **[apps/mobile/README.md](apps/mobile/README.md)**.
