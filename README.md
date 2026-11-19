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
> before exposing it publicly. Analyze and search try both Gemini models in parallel, which can
> incur charges for both requests.

## Features

**Package scanner** — up to 3 photos (ingredient list, nutrition table, front/barcode) are
scored on a 0–100 scale using a Yuka-inspired 3-pillar structure (nutrition 60 points,
ingredients/additives 30, certified organic 10). The API sums the component scores; it applies
fixed, deduplicated additive deductions (high 10, moderate 5, limited 2) and a 10-point caution
deduction for each identified E102, E110 or E124 colour, up to the 30-point pillar limit. This is
an independent screening rubric, not Yuka's proprietary rating or a medical assessment. The app
derives the verdict from the score: BUY at 65 or above, AVOID below 65. The result shows the
component breakdown, main
reason, flagged ingredients, positive highlights, country-specific regulatory notes and 2–3
better alternatives with store links. On the web, a "Regulatory standards by market" disclosure
compares label observations across India, the United States, the United Kingdom, the European
Union, Australia and the UAE, with links to general official references. These observations are
not a legal compliance assessment.
On the web, an identical compressed photo set in the same market reuses its saved result in that
browser for up to 30 days; only the analysis result and a photo hash are cached, not the photo.

**Product search** — find highly rated food or cosmetics for a query, with links to Amazon,
Flipkart, Blinkit, Nykaa (India) or Amazon, Walmart, Target, Sephora (US).

**Markets** — India, United States, United Kingdom, European Union, Australia and UAE
(inferred from the device time zone; changeable in the mobile app).

**Admin analytics** (web, `/admin`) — aggregate page views per route, day and market. Counts are
page views, not unique people; no individual visitor identifiers or IP addresses are stored.

**Mobile-only** — camera-first scanning with barcode detection, on-device scan history, light
and dark themes, full English/Hindi UI, TalkBack support. See the
[mobile README](apps/mobile/README.md).

## API

All routes are `POST` with JSON bodies. Analyze and search requests are validated with zod, but
the public API has no rate limits; each successful request can incur Gemini API cost, and
parallel model failover can charge for both model attempts.
Admin password attempts are also unlimited, so use a strong, unique password.

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
| `JSONBIN_API_KEY` + `JSONBIN_BIN_ID` | yes, for analytics and `/admin` | Server-only JSONBin credentials for page-view counters and the admin password hash. |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | no | Override the parallel fast-model attempts (`gemini-3.5-flash-lite` and `gemini-3.1-flash-lite`). |

The `/admin` password is verified against a salted scrypt hash in the private JSONBin record; it
is never stored there as readable text. Add an `adminPasswordHash` property to the analytics bin.
The value format is `scrypt$<32 hex salt characters>$<128 hex hash characters>`. Generate one
locally with Node.js (replace the placeholder with your new password):

```bash
node -e "const {randomBytes,scryptSync}=require('node:crypto');const salt=randomBytes(16).toString('hex');const hash=scryptSync(process.argv[1],salt,64).toString('hex');console.log(JSON.stringify({adminPasswordHash:'scrypt$'+salt+'$'+hash},null,2))" "YOUR_NEW_PASSWORD"
```

If the record currently contains a readable password instead of this hash, `/admin` will reject
it and the stats endpoint will remain unavailable until the record is corrected. Treat any
password that was stored or shared in readable form as compromised: choose a new, unique password,
generate its hash locally, and replace `adminPasswordHash` in JSONBin. Preserve the existing
analytics counters, remove any legacy `recentVisitors` entries, and keep the bin private. The
change takes effect without a redeploy.

In the JSONBin record, preserve that hash alongside the analytics fields, for example:

```json
{
  "adminPasswordHash": "scrypt$<32 hex salt characters>$<128 hex hash characters>",
  "totalVisits": 0,
  "countryCounts": {},
  "pageCounts": {},
  "dailyVisits": {}
}
```

Keep the bin private, configure `JSONBIN_API_KEY` and `JSONBIN_BIN_ID` as Netlify server-side
environment variables, and redeploy. Never put the JSONBin master key in browser code or share
the password/hash publicly.

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
