# PureBite AI

Photograph a food, cosmetics, or personal-care label and get a health score, a four-tier verdict,
ingredients of concern, and clean-label positives — plus a search for clean food and cosmetics.
Analysis summaries are in English; the mobile interface supports English and Hindi.

This repository contains two apps that share one backend:

| | Where | Stack |
|---|---|---|
| **Web app + API** | repository root (`src/`) | Next.js 14, React 18, Tailwind, Google Gemini with optional OpenAI and Groq fallbacks (REST) |
| **Android app** (iOS later) | [`apps/mobile`](apps/mobile/README.md) | Expo SDK 58, React Native 0.88, TypeScript |

> **Before publishing anything, work through [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).**
> The public API has no request rate limits. Configure Gemini, OpenAI, and Groq quotas and billing
> alerts before exposing it publicly. Analyze races up to three Gemini models and, when
> configured, OpenAI and Groq in parallel; search tries two Gemini models sequentially. Parallel
> requests can incur charges for every provider, including losing attempts.

## Features

**Package scanner** — up to 3 photos (ingredient list, nutrition table, front/barcode) are
assessed on a 0–100 scale. Verdicts are derived from the score: **Must Buy** (85–100),
**Recommended Buy** (75–84), **Okay to Buy** (60–74), and **Avoid Frequent Use** (below 60).
Food assessments consider processing, refined sugars, palm/palmolein and hydrogenated fats,
artificial colours, synthetic preservatives, emulsifiers, sodium, and the overall ingredient and
nutrition profile. Cosmetics and personal-care assessments consider credible ingredient concerns
relevant to those products. The API returns strict JSON with product name, category, score, verdict,
harmful ingredients and their risks, positives, and a short recommendation. This is an independent
AI estimate for general information, not medical advice; only visible label information is assessed.
On the web, a "Regulatory standards by market" disclosure shows general references for India, the
United States, the United Kingdom, the European Union, Australia and the UAE. It is not a legal
compliance assessment.
On the web, an identical compressed photo set in the same market reuses its saved result in that
browser for up to 30 days; only the analysis result and a photo hash are cached, not the photo.

**Product search** — find highly rated food or cosmetics for a query, with links to Amazon,
Flipkart, Blinkit, Nykaa (India) or Amazon, Walmart, Target, Sephora (US).

**Markets** — India, United States, United Kingdom, European Union, Australia and UAE
(inferred from the device time zone; changeable in the mobile app).

**Admin analytics** (web, `/admin`) — page-view totals by route, day and market, plus a recent
table of scan/search outcomes with the searched term or detected product. Counts are visits, not
unique people. Recent actions retain at most 500 entries; IPs are stored only as masked network
prefixes (IPv4 `/24`, IPv6 `/64`), never as full addresses or alongside scan photos. Each action
also records the product category and, on failure, a short failure reason.

**Mobile-only** — camera-first scanning with barcode detection, on-device scan history, light
and dark themes, full English/Hindi UI, TalkBack support. See the
[mobile README](apps/mobile/README.md).

## API

All routes are `POST` with JSON bodies. Analyze and search requests are validated with zod, but
the public API has no rate limits. Analyze runs up to three Gemini requests and, when configured,
one request each to OpenAI and Groq in parallel; losing requests may still incur charges. Search
tries its two Gemini models sequentially and can incur charges for multiple completed attempts.
When `OPENAI_API_KEY` or `GROQ_API_KEY` is configured, label photos are also sent to those
providers for the parallel fallback.
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
# Optional cross-provider analysis fallback:
# OPENAI_API_KEY=your-openai-api-key
# GROQ_API_KEY=your-groq-api-key
npm run dev               # http://localhost:3000
```

The Gemini key is enough to try scanning and search. Add `OPENAI_API_KEY` and/or `GROQ_API_KEY` to
enable independent-provider analysis fallbacks. `npm run lint` and `npm run build` must pass before
you push.

## Environment variables

Set these in your hosting provider (Vercel → Project → Settings → Environment Variables, or
Netlify → Site configuration → Environment variables). None of them belong in the mobile app.

| Variable | Required in production | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | yes | Google Gemini API key (server-side only) |
| `OPENAI_API_KEY` | no (needed for cross-provider analysis fallback) | OpenAI API key (server-side only). When configured, label photos are sent to OpenAI alongside Gemini for analysis. |
| `GROQ_API_KEY` | no (needed for Groq analysis fallback) | Groq API key (server-side only). When configured, label photos are sent to Groq alongside Gemini for analysis. |
| `GROQ_MODEL` | no | Override the Groq vision model (default `qwen/qwen3.8-27b`; verify availability for your Groq account). |
| `JSONBIN_API_KEY` + `JSONBIN_BIN_ID` | yes, for analytics and `/admin` | Server-only JSONBin credentials for page-view counters and the admin password hash. |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GEMINI_LAST_RESORT_MODEL` | no | Override the model pool (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.8-flash`). Analysis races all three; search tries the first two sequentially. |

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

The admin table also reads a `recentActions` array managed by the app. It keeps only the latest
500 scan/search outcomes. The "IP Network" field is a masked network prefix, not a full IP address.
Page-view totals are not unique-user counts; daily visits use UTC dates.

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
