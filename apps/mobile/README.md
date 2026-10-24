# PureBite — Android & iOS app

Native client for the PureBite AI web app (`../../`). Photograph a food label → get a 0–100
health score, a BUY/AVOID verdict, flagged ingredients and healthier local alternatives;
search for clean food and cosmetics. Android ships first; iOS builds from the same code.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | **Expo SDK 58 · React Native 0.88** (New Architecture, Hermes V1), TypeScript strict | Same language/skills as the Next.js app, one codebase for Android + iOS, predictable SDK upgrades via Continuous Native Generation |
| Navigation | expo-router (typed file routes), **NativeTabs** (real Material bottom navigation), native stack | Native feel, deep-link ready |
| UI | Hand-rolled Material 3 components on typed design tokens (`src/theme`), react-native-svg icons, Reanimated 4 motion | No UI-kit lock-in, small APK, light/dark, colour-blind-safe verdicts |
| Camera | expo-camera (CameraX + on-device ML Kit barcode), expo-image-picker (system Photo Picker), expo-image-manipulator | No media permissions; EXIF/GPS stripped by re-encoding |
| Data | TanStack Query, zod contract (`src/shared`), expo-sqlite history, expo-secure-store install id | Untrusted AI output is validated and capped before rendering |
| i18n | Typed English/Hindi dictionaries (`defineStrings`), Noto Sans Devanagari embedded | Compile-time check that every string is translated |

`android/` and `ios/` are **generated** (`npx expo prebuild`) and git-ignored. Never edit them;
change `app.config.ts` or a config plugin in `plugins/` instead.

## Project layout

```
app.config.ts            App config (permissions, plugins, build-time env)
plugins/                 Local config plugins (network security, release signing) + tests
scripts/mock-api.mjs     Local stand-in for the backend (no Gemini quota needed)
src/app/                 Routes: (tabs)/index (Scan), search, history, settings; analyze; result/[id]
src/features/<name>/     Screen parts + that feature's en/hi strings
src/components/          Design-system components (AppText, Button, Card, ScoreRing, …)
src/lib/                 API client, image pipeline, history DB, haptics, links, query client
src/shared/              Framework-free contract (zod schemas, market, URL allowlist) + tests
src/state/               Settings and scan-session providers
src/theme/               Material 3 colour roles, type scale, spacing, motion tokens
src/security/            Attestation seam (Firebase App Check / Play Integrity)
```

## Prerequisites (macOS)

- Node 22.13+ (26.x works) and **pnpm 10** (`packageManager` is pinned).
- **JDK 17** (what React Native/Expo document and test):
  `brew install --cask zulu@17` then `export JAVA_HOME=$(/usr/libexec/java_home -v 17)`.
- Android SDK (platform 36/37, build-tools, NDK 27.1) — Android Studio or `sdkmanager`.
  `export ANDROID_HOME=$HOME/Library/Android/sdk` and add `platform-tools`/`emulator` to `PATH`.

Dependencies install with a **7-day release-age rule** and trust checks (`pnpm-workspace.yaml`).
Add native packages with `EXPO_OFFLINE=1 npx expo install <pkg>` so versions match the SDK.

## Develop

```bash
pnpm install
node scripts/mock-api.mjs                 # terminal 1: fake backend on :8787
pnpm android                              # terminal 2: prebuild + build + run on emulator/device
```

The default API base URL is `http://10.0.2.2:8787` (the host machine as seen from the Android
emulator). Point at a real backend with `EXPO_PUBLIC_API_BASE_URL=https://… pnpm android`.
On a physical phone over USB, run `adb reverse tcp:8081 tcp:8081 && adb reverse tcp:8787 tcp:8787`
and use `EXPO_PUBLIC_API_BASE_URL=http://localhost:8787` (debug builds allow cleartext; release
builds never do).
To smoke-test an R8 release build against the mock API, build with `PUREBITE_DEV_CLEARTEXT=1`
(never ship such a build — the release check rejects it).
Mock scenarios: `MOCK_SCENARIO=buy|avoid|unreadable|error|ratelimit|slow node scripts/mock-api.mjs`
(default cycles avoid → buy → unreadable).

Checks before every PR:

```bash
pnpm typecheck && pnpm test && npx expo lint && npx expo-doctor
```

## Release (Google Play)

1. Create the upload key once (keep it out of the repo, back it up):
   `keytool -genkeypair -v -keystore ~/keys/purebite-upload.jks -alias purebite-upload -keyalg RSA -keysize 4096 -validity 10000`
2. Put `PUREBITE_UPLOAD_STORE_FILE`, `PUREBITE_UPLOAD_STORE_PASSWORD`, `PUREBITE_UPLOAD_KEY_ALIAS`,
   `PUREBITE_UPLOAD_KEY_PASSWORD` in `~/.gradle/gradle.properties` (chmod 600).
3. Build. Gradle re-evaluates `app.config.ts`, so the variables must be visible to both commands
   (`export` them, or keep them in an uncommitted `.env.production`). A release build without an
   https `EXPO_PUBLIC_API_BASE_URL` fails on purpose.

   ```bash
   export EXPO_PUBLIC_API_BASE_URL=https://<your-api-host>
   export PUREBITE_PRIVACY_URL=https://<privacy-policy> PUREBITE_TERMS_URL=https://<terms>
   export PUREBITE_SUPPORT_EMAIL=<support address>
   npx expo prebuild -p android --clean
   (cd android && ./gradlew bundleRelease assembleRelease)
   scripts/verify-release.sh android/app/build/outputs/apk/release/app-release.apk
   ```

   Upload `android/app/build/outputs/bundle/release/app-release.aab`; enrol in Play App Signing.
   The verify script checks permissions, HTTPS-only networking, the embedded API URL, 16 KB page
   alignment, debuggability and leaked secrets.
4. Bump `version` / `android.versionCode` in `app.config.ts` for every upload.

Before the first upload: confirm the permanent application id (`com.purebite.app` in
`app.config.ts`), publish a privacy policy, complete the Data safety and Health apps forms,
and finish the backend hardening below.

## Security model

- The Gemini key and all other secrets stay on the server. Nothing in this app is secret; assume
  the APK is decompiled.
- Release builds allow **HTTPS only** (network security config); debug builds allow cleartext only
  to `localhost`/`10.0.2.2` for Metro and the mock API.
- Permissions: `CAMERA`, `INTERNET`, `ACCESS_NETWORK_STATE`. Storage, media, audio, location,
  overlay and vibrate permissions are explicitly blocked. `allowBackup` is off.
- Photos are resized and re-encoded on device (drops EXIF/GPS), uploaded once, then deleted;
  only a 320 px thumbnail is kept with the local history.
- Every backend response is validated with zod, length-capped and rendered as plain text; store
  links open only if they are `https` on an exact host allowlist.
- Release logs are silent (`src/lib/log.ts`). R8 minification and resource shrinking are on.

**Before the iOS release:** exclude `Documents/SQLite` and `Documents/thumbs` from iCloud/device
backups (the Settings copy promises history is never backed up), and run the same release checks
on the IPA.

**Backend work still required before a public release** (the app is ready for it): rate limits
per IP / install id, request-size and input validation on `/api/analyze` and
`/api/search-products`, verifying Firebase App Check tokens (`src/security/attestation.ts`
documents the client side), removing the hard-coded admin password fallback, and pinning the
Gemini model list instead of probing every request.
