# PureBite — Android app (iOS-ready)

The native app for [PureBite AI](../../README.md). Point the camera at a food label and get a
0–100 health score, a **BUY / AVOID** verdict, the ingredients to watch out for and healthier
alternatives you can buy nearby. Android ships first; iOS builds from the same code later.

- **Before publishing**, work through [LAUNCH_CHECKLIST.md](../../LAUNCH_CHECKLIST.md).
- Jump to: [Features](#features) · [Run it](#run-it-locally) · [Build a release](#build-a-release) ·
  [Publish to Google Play](#publish-to-google-play) · [Troubleshooting](#troubleshooting)

## Features

**Scan** (home tab)
- Camera-first scanner with a guide frame and step hints: ingredient list → nutrition table →
  front of pack (up to 3 photos).
- On-device barcode detection (EAN/UPC), flashlight, pinch or button zoom, and a "Scan flat
  label" document scanner that auto-crops and straightens.
- Import from the gallery through Android's Photo Picker (no storage permission needed).
- Photos are resized and re-encoded on the phone (location/EXIF data removed) before upload.
- The camera pauses after 90 s of inactivity to save battery.

**Analysis and results**
- Live progress (upload → reading label → checking ingredients → finding alternatives), cancel at
  any time, clear messages for no internet, timeouts and unreadable photos — your
  photos are kept so you can retry without reshooting.
- Animated score ring with band (Excellent / Good / Poor / Bad) and a BUY/AVOID verdict that never
  relies on colour alone.
- Why to buy or avoid, ingredients of concern, nutritional strengths and country-specific
  regulatory notes, with an **English / हिन्दी** switch for India.
- Healthier alternatives with "Buy on Amazon/Flipkart/…" buttons (opens the store app if
  installed), share the result, report a problem, delete.

**Search** — find well-rated food or cosmetics, with trending suggestions, recent searches and
store links for your market.

**History** — every scan is saved on the phone only (up to 500), with Buy/Avoid filters, swipe to
delete and works offline.

**Settings** — app language (system / English / हिन्दी), market (automatic from time zone or
India, US, UK, EU, Australia, UAE), theme (system / light / dark), clear history, privacy policy.

**Quality** — Material 3 design in light and dark, edge-to-edge, TalkBack labels and roles,
large-font support, Hindi typography with Noto Sans Devanagari, haptic feedback.

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Expo SDK 58 · React Native 0.88 (New Architecture, Hermes), React 19 + React Compiler, TypeScript strict |
| Navigation | expo-router (file routes), NativeTabs (native Material bottom navigation) |
| UI | Material 3 design tokens (`src/theme`), react-native-svg icons, Reanimated 4 |
| Camera & images | expo-camera (CameraX + ML Kit barcodes), expo-image-picker (Photo Picker), expo-image-manipulator |
| Data | TanStack Query, zod contract (`src/shared`), expo-sqlite (history) |
| i18n | Typed English/Hindi dictionaries — a missing translation fails the type check |

`android/` and `ios/` are **generated** by `npx expo prebuild` and git-ignored. Never edit them;
change `app.config.ts` or a config plugin in `plugins/` instead.

## Run it locally

### 1. One-time setup (macOS)

| Tool | Install |
|---|---|
| Node.js 22.13+ | already used by the web app |
| pnpm 10 | `brew install pnpm` (the exact version is pinned in `package.json`) |
| JDK 17 | `brew install --cask zulu@17`, then add `export JAVA_HOME=$(/usr/libexec/java_home -v 17)` to `~/.zshrc` |
| Android Studio | installs the Android SDK and emulator; then add to `~/.zshrc`: `export ANDROID_HOME=$HOME/Library/Android/sdk` and `export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools` |
| Emulator | Android Studio → Device Manager → create a Pixel with an Android 15/16 image |
| watchman (optional) | `brew install watchman` — faster reloads |

```bash
cd apps/mobile
pnpm install
```

Dependencies install with a 7-day release-age rule and provenance checks (`pnpm-workspace.yaml`).
Add native packages with `EXPO_OFFLINE=1 npx expo install <package>` so versions match the SDK.

### 2. Start a backend

Easiest — the bundled **mock API** (no Gemini key or quota needed):

```bash
node scripts/mock-api.mjs        # http://127.0.0.1:8787, reachable from the emulator as 10.0.2.2
```

`MOCK_SCENARIO=buy|avoid|unreadable|error|ratelimit|slow node scripts/mock-api.mjs` forces one
response (the default cycles avoid → buy → unreadable).

Or use the real web app: `npm run dev` in the repository root (needs `GEMINI_API_KEY`, see the
[root README](../../README.md)), or your deployed https API.

### 3. Run the app

Start the emulator (or plug in a phone with USB debugging on), then:

```bash
pnpm android                     # builds the debug app, installs it and starts Metro
```

The first build takes a few minutes; after that, code changes reload instantly (press `r` in the
Metro terminal to reload manually). The app calls `http://10.0.2.2:8787` (the mock API) unless you
set another backend:

```bash
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000 pnpm android     # local web app (npm run dev)
EXPO_PUBLIC_API_BASE_URL=https://your-api-host pnpm android    # deployed API
```

**Physical phone over USB:** run `adb reverse tcp:8081 tcp:8081 && adb reverse tcp:8787 tcp:8787`
and use `EXPO_PUBLIC_API_BASE_URL=http://localhost:8787`. Debug builds allow plain http for local
development; release builds never do.

> **Emulator camera:** expo-camera returns a black placeholder photo on emulators by design. Test
> real scanning on a phone, or use "Choose from gallery" on the emulator.

### 4. Checks before every commit

```bash
pnpm typecheck && pnpm test && pnpm lint && npx expo-doctor
```

| Script | What it does |
|---|---|
| `pnpm start` | Metro dev server only (for an already installed debug app) |
| `pnpm android` | build + install + run on Android (`expo run:android`) |
| `pnpm typecheck` | TypeScript, including the en/hi string completeness check |
| `pnpm test` | Jest unit tests (contract, URL allowlist, progress model, history, …) |
| `pnpm lint` | ESLint (`eslint-config-expo`) |

## Project layout

```
app.config.ts            App config: id, permissions, plugins, build-time environment
plugins/                 Config plugins: HTTPS-only network config, release signing (+ tests)
scripts/mock-api.mjs     Local stand-in for the backend
scripts/verify-release.sh  Release gate for built APKs
store/                   Google Play listing text and graphics
src/app/                 Screens: (tabs)/index = Scan, search, history, settings; analyze; result/[id]
src/features/<name>/     Pieces of each screen + that feature's English/Hindi strings
src/components/          Shared design-system components (AppText, Button, Card, ScoreRing, …)
src/lib/                 API client, image pipeline, history database, haptics, links, queries
src/shared/              Framework-free API contract (zod), markets, store-URL allowlist
src/state/               Settings and scan-session providers
src/theme/               Material 3 colours, type scale, spacing, motion
src/security/            Device-attestation hook (Firebase App Check / Play Integrity, later)
```

## Build a release

### 1. Create the upload key (once)

```bash
mkdir -p ~/keys && keytool -genkeypair -v -keystore ~/keys/purebite-upload.jks \
  -alias purebite-upload -keyalg RSA -keysize 4096 -validity 10000
```

Back the `.jks` file and its passwords up in two safe places (for example a password manager and
an encrypted drive). Never commit it. Then add to `~/.gradle/gradle.properties` and run
`chmod 600 ~/.gradle/gradle.properties`:

```properties
PUREBITE_UPLOAD_STORE_FILE=/Users/<you>/keys/purebite-upload.jks
PUREBITE_UPLOAD_STORE_PASSWORD=...
PUREBITE_UPLOAD_KEY_ALIAS=purebite-upload
PUREBITE_UPLOAD_KEY_PASSWORD=...
```

### 2. Set the version

In `app.config.ts`, raise `version` (shown to users, e.g. `1.0.1`) and **always** raise
`android.versionCode` (an integer Google Play requires to increase with every upload). Before the
very first upload, also replace the placeholder application id `com.purebite.app` — it can never
change afterwards.

### 3. Build and verify

Gradle evaluates `app.config.ts` again during the build, so the variables must be **exported**
(or kept in an uncommitted `apps/mobile/.env.production`). A release build without an https
`EXPO_PUBLIC_API_BASE_URL` fails on purpose.

```bash
cd apps/mobile
export EXPO_PUBLIC_API_BASE_URL=https://<your-api-domain>
export PUREBITE_PRIVACY_URL=https://<your-site>/privacy
export PUREBITE_TERMS_URL=https://<your-site>/terms
export PUREBITE_SUPPORT_EMAIL=<support@your-domain>

npx expo prebuild -p android --clean
(cd android && ./gradlew bundleRelease assembleRelease)
scripts/verify-release.sh android/app/build/outputs/apk/release/app-release.apk
```

Outputs:
- `android/app/build/outputs/bundle/release/app-release.aab` — upload this to Google Play.
- `android/app/build/outputs/apk/release/app-release.apk` — install on a phone for a final check:
  `adb install -r android/app/build/outputs/apk/release/app-release.apk`.

`verify-release.sh` fails the build if it finds extra permissions, plain-http networking, a
non-https API URL, a debuggable build, missing 16 KB page alignment or anything that looks like
a leaked secret.

## Publish to Google Play

The policy forms (Data safety, Health apps, target audience, …) are listed with suggested answers
in [LAUNCH_CHECKLIST.md](../../LAUNCH_CHECKLIST.md#3-google-play-console). The release flow:

1. **Create a developer account** at [play.google.com/console](https://play.google.com/console)
   ($25 one-time) and complete identity verification.
2. **Create the app**: *Create app* → name *PureBite*, default language, App, Free, accept the
   declarations.
3. **Set up the store listing** (*Grow → Store presence → Main store listing*): use the text in
   [`store/listing.md`](store/listing.md), the icon `store/icon-512.png`, the feature graphic
   `store/feature-graphic.png`, and 2–8 phone screenshots taken on a real device
   (`adb exec-out screencap -p > shot.png`). Category: Health & Fitness.
4. **Complete App content** (*Policy → App content*): privacy policy, app access, ads, content
   rating, target audience (18+), data safety, health apps declaration.
5. **Internal testing first** (*Test and release → Testing → Internal testing*): create a release,
   upload the `.aab`, and accept **Play App Signing** (Google keeps the app-signing key; you keep
   the upload key). Add your own Google accounts as testers, install from the opt-in link, and
   test a full scan against production.
6. **Closed testing**: if your developer account is a personal one created after 13 Nov 2023,
   Google requires **at least 12 testers opted in for 14 consecutive days** before you can apply
   for production. Promote the internal release to a closed track and invite testers (a Google
   Group is easiest).
7. **Production**: *Production → Create new release*, reuse the tested `.aab`, write release notes,
   pick countries (start with India), and choose a **staged rollout** (for example 10 %). Google
   reviews new apps; this can take several days.
8. **Monitor and expand**: watch *Android vitals* (crashes, ANRs) and reviews, then raise the
   rollout to 100 %.

**Updates**: change the code → raise `version` and `android.versionCode` → build and verify →
upload the new `.aab` to a testing track → promote to production.

> **Alternative — EAS (Expo's cloud build service):** `npx eas-cli@latest build -p android` and
> `npx eas-cli@latest submit -p android` can build and upload without a local Android setup. It
> needs an Expo account and an `eas.json`; this project builds locally by default.

## Maintenance

- **Expo SDK upgrades** (3–4 a year): `npx expo install expo@^<next> --fix`, read the SDK release
  notes, `npx expo prebuild -p android --clean`, build a release and re-test before shipping.
- **Google Play target API**: Play raises the required `targetSdkVersion` every August; a new Expo
  SDK normally covers it (SDK 58 targets API 36).
- **Brand icons**: edit `assets/brand/*.svg` and run `assets/brand/generate-icons.sh`.

## Security model

- The Gemini key and all other secrets stay on the server; nothing in the app is secret (assume
  the APK is decompiled).
- Release builds allow **HTTPS only**; the build fails without an https API URL.
- Permissions: `CAMERA`, `INTERNET`, `ACCESS_NETWORK_STATE` only. Storage, media, microphone,
  location, biometrics, overlay and vibrate permissions are explicitly blocked; backups are off.
- Photos are re-encoded on the device (EXIF/GPS removed), uploaded once and deleted; only a small
  thumbnail is kept in the local history. Leftover temporary images are swept at startup.
- Every server response is validated, length-capped and shown as plain text; store links open
  only for an exact allowlist of https retailer hosts.
- No device or install identifier is sent to the server. Release builds log nothing. R8
  minification is on.

## Troubleshooting

| Problem | Fix |
|---|---|
| Camera photos are black | Expected on emulators; use a real phone or "Choose from gallery". |
| "Release build needs EXPO_PUBLIC_API_BASE_URL…" | Export the variables in the same shell as both `prebuild` and `./gradlew`. |
| `CLEARTEXT communication … not permitted` | A release build is pointing at an http URL; use https. Debug builds allow http. |
| Gradle: unsupported Java version | Use JDK 17 (`export JAVA_HOME=$(/usr/libexec/java_home -v 17)`). |
| Code changes don't show up | Press `r` in Metro; install watchman for faster file watching. |
| `pnpm install` refuses a package as too new | The 7-day release-age rule; wait, or add a temporary `minimumReleaseAgeExclude` entry for an urgent fix. |
| Release crashes but debug works | Usually R8 stripping a reflective class; add a keep rule via `extraProguardRules` in `app.config.ts` and test the release APK. |
