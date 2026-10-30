# Launch checklist

Work through this top to bottom before the hardened API goes live and before the Android app is
published. Tick items off in a PR or copy the list into an issue.

## 1. Backend

The public API has no request rate limits, including failed admin login attempts. Each analyze or
search request can incur Gemini API cost. Configure strict Gemini quotas and billing alerts, and
use a strong unique `ADMIN_PASSWORD`, before sharing the production URL.

- [ ] **Set a new `ADMIN_PASSWORD`.** The old fallback password `PureBiteAdmin2026` is visible in
      public git history; treat it as leaked. The admin dashboard stays disabled until this is set.
- [ ] **Rotate the JSONBin master key** (`JSONBIN_API_KEY`) — anyone who used the leaked admin
      password could see the analytics, and the old key protected that data.
- [ ] **Set `IP_HASH_SECRET`** to a random value: `openssl rand -hex 32`.
- [ ] **Gemini key hygiene:**
  - [ ] Use the **paid tier** (no training on user photos; required if you offer the app in the
        EEA, UK or Switzerland).
  - [ ] Restrict the key to the Generative Language API in Google Cloud.
  - [ ] Add a **budget alert** and a per-day quota in Google Cloud.
  - [ ] Confirm the pinned models (`gemini-3.5-flash-lite`, fallback `gemini-3.1-flash-lite`) are enabled
        for your key; otherwise set `GEMINI_MODEL` / `GEMINI_FALLBACK_MODEL`.
- [ ] **Redeploy**, then make sure the production URL is public: Vercel *Deployment Protection*
      must not apply to the production domain (the current `*.vercel.app` deployments ask for a
      Vercel login, which blocks the app). A **custom domain** is strongly recommended because it
      is baked into the app and cannot change after release.
- [ ] **Smoke-test production:**
  ```bash
  API=https://<your-production-domain>
  curl -s -X POST "$API/api/search-products" -H 'Content-Type: application/json' \
       -d '{"query":"peanut butter","categoryType":"food","userCountry":"India"}' | head -c 300
  ```
  Expect JSON with `products`. Then scan a real label on the website.

## 2. Mobile app prerequisites

- [ ] **Final application id.** `com.purebite.app` in `apps/mobile/app.config.ts` is a placeholder
      and can never change after the first Play upload. Use a domain you control, e.g.
      `com.yourcompany.purebite`.
- [ ] **Privacy policy** published at a public https URL (not geo-blocked). It must cover: label
      photos and search queries sent to your server and to Google Gemini for analysis and not
      stored; IP addresses used to derive an anonymous daily analytics hash; scan history kept
      only on the device; no ads, no tracking, no data sale; contact address.
- [ ] **Terms of use** URL (recommended) and a **support email** — the email powers the in-app
      "Report a problem with this result" action, which Google Play expects for AI-generated
      content.
- [ ] **Upload key** created and backed up in two safe places (see the mobile README). Losing it
      means you need Google support to reset it.
- [ ] **JDK 17** installed on the build machine (`brew install --cask zulu@17`).
- [ ] **Release build passes** `scripts/verify-release.sh` with your real `EXPO_PUBLIC_API_BASE_URL`.
- [ ] **Tested on real phones** (emulators return fake black camera photos): at least one
      low-end Android 10–12 device and one recent device; English and Hindi; dark mode; 200 % font
      size; TalkBack; a scan of a real ingredient list end to end against production.

## 3. Google Play Console

- [ ] **Developer account** ($25 one-time) with identity verification completed. Organisation
      accounts need a D-U-N-S number.
- [ ] **Personal accounts created after 13 Nov 2023:** run a **closed test with at least 12
      testers opted in for 14 consecutive days** before you can apply for production. Start this
      early.
- [ ] **Create the app**: name *PureBite*, default language English (India), app, free.
- [ ] **App content** (Policy → App content):
  - [ ] Privacy policy URL.
  - [ ] App access: all functionality available without login.
  - [ ] Ads: no ads.
  - [ ] Content rating questionnaire (IARC).
  - [ ] Target audience: **18 and over** (Gemini API terms do not allow apps aimed at minors —
        get legal advice if you want a younger audience).
  - [ ] **Health apps declaration**: Health & fitness → Nutrition and weight management; the app
        does not provide medical diagnosis or treatment.
  - [ ] **Data safety** (adjust to your final privacy policy):
        Photos — collected, processed ephemerally, required for app functionality, not shared;
        App activity (in-app search) — collected, ephemeral, app functionality;
        encrypted in transit: yes; no data sold; no data used for ads.
  - [ ] Government app / financial features / news app: no.
- [ ] **Store listing** — text drafts and graphics are in `apps/mobile/store/`:
  - [ ] App icon 512×512 (`store/icon-512.png`).
  - [ ] Feature graphic 1024×500 (`store/feature-graphic.png`).
  - [ ] 2–8 phone screenshots from a real device (scan, result, Hindi result, search, history).
  - [ ] Short and full description (`store/listing.md`), category *Health & Fitness*, contact
        email, website.
- [ ] **Countries**: start with India (the app's default market); add others once their store
      links and regulations notes are checked.
- [ ] **Release**: upload the `.aab` to *Internal testing* → *Closed testing* → *Production*
      with a staged rollout (for example 10 % → 50 % → 100 %), watching *Android vitals* for
      crashes and ANRs.

## 4. After launch

- [ ] Every update: bump `version` and `android.versionCode` in `app.config.ts`, rebuild, re-run
      `scripts/verify-release.sh`, upload with the same upload key.
- [ ] Watch Gemini spend and Play Console vitals weekly.
- [ ] Plan device attestation (Firebase App Check / Play Integrity) — the client hook is ready in
      `apps/mobile/src/security/attestation.ts`; the server must verify the token before relying on
      it for access control.
- [ ] Before an iOS release: exclude scan history and thumbnails from iCloud backups, add App
      Store listing details, and repeat sections 2–3 for the App Store.
