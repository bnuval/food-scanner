import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * App configuration (replaces app.json). Native projects are generated from this file by
 * `npx expo prebuild` (Continuous Native Generation) — never edit android/ or ios/ by hand.
 *
 * Build-time environment (none of these are secrets; everything here ships in the app).
 * Release builds read them from the environment of BOTH `expo prebuild` and Gradle (which
 * re-evaluates this file), so `export` them or put them in an uncommitted .env.production:
 *   EXPO_PUBLIC_API_BASE_URL   Backend origin, e.g. https://api.purebite.example (required,
 *                              https, for release builds; defaults to the local mock API).
 *   PUREBITE_PRIVACY_URL       Public privacy-policy URL shown in Settings.
 *   PUREBITE_TERMS_URL         Terms of use URL shown in Settings.
 *   PUREBITE_SUPPORT_EMAIL     Address for "Report a problem with this result".
 *   PUREBITE_DEV_CLEARTEXT=1   Local release testing against the mock API only. Never ship.
 */
const APP_ID = 'com.purebite.app'; // Permanent once published to Google Play — confirm before first upload.
const DEV_API_BASE_URL = 'http://10.0.2.2:8787';

// Gradle evaluates this file with NODE_ENV=production for release variants. Fail the build
// rather than silently shipping the development URL (cleartext, which release blocks anyway).
const isReleaseBuild = process.env.NODE_ENV === 'production';
const devCleartext = process.env.PUREBITE_DEV_CLEARTEXT === '1';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || DEV_API_BASE_URL;
if (isReleaseBuild && !devCleartext && !/^https:\/\/[^\s/]+/.test(API_BASE_URL)) {
  throw new Error(
    'Release build needs EXPO_PUBLIC_API_BASE_URL=https://<api-host> in the environment of both prebuild and Gradle ' +
      '(export it, or use an uncommitted .env.production). Got: ' + (process.env.EXPO_PUBLIC_API_BASE_URL ?? '<unset>'),
  );
}

// Unset values are omitted (Expo serializes null in `extra` as {}).
const optionalEnv = (name: string): string | undefined => process.env[name]?.trim() || undefined;

const CAMERA_USAGE = 'PureBite uses the camera to photograph ingredient lists, nutrition tables and barcodes.';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'PureBite',
  slug: 'purebite',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'purebite',
  userInterfaceStyle: 'automatic',
  platforms: ['android', 'ios'],
  ios: {
    bundleIdentifier: APP_ID,
    supportsTablet: true,
  },
  android: {
    package: APP_ID,
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#0B7A55',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    // Scan history and settings stay on this device; nothing is backed up to the cloud.
    allowBackup: false,
    predictiveBackGestureEnabled: false,
    // Least privilege: CAMERA + INTERNET (+ network state) only. Gallery import uses the
    // system Photo Picker, which needs no media permission; haptics use
    // View.performHapticFeedback, which needs no VIBRATE permission.
    blockedPermissions: [
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.VIBRATE',
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ],
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0B7A55',
        image: './assets/images/splash-icon.png',
        imageWidth: 112,
        dark: { backgroundColor: '#05432E', image: './assets/images/splash-icon.png' },
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: CAMERA_USAGE,
        microphonePermission: false,
        recordAudioAndroid: false,
        barcodeScannerEnabled: true,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'PureBite lets you choose label photos you have already taken.',
        cameraPermission: CAMERA_USAGE,
        microphonePermission: false,
      },
    ],
    [
      'expo-font',
      {
        fonts: [
          './assets/fonts/NotoSansDevanagari_400Regular.ttf',
          './assets/fonts/NotoSansDevanagari_600SemiBold.ttf',
        ],
      },
    ],
    ['expo-localization', { supportedLocales: { android: ['en', 'hi'], ios: ['en', 'hi'] } }],
    'expo-sqlite',
    [
      'expo-build-properties',
      {
        android: {
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          // ML Kit (expo-camera barcode scanning) instantiates its component registrars
          // reflectively; without this R8 strips their constructors and scanning fails
          // in release builds only ("NoSuchMethodException ...Registrar.<init>").
          extraProguardRules: '-keep class * implements com.google.firebase.components.ComponentRegistrar { <init>(); }',
        },
      },
    ],
    './plugins/with-network-security',
    './plugins/with-release-signing',
  ],
  extra: {
    apiBaseUrl: API_BASE_URL,
    privacyPolicyUrl: optionalEnv('PUREBITE_PRIVACY_URL'),
    termsUrl: optionalEnv('PUREBITE_TERMS_URL'),
    supportEmail: optionalEnv('PUREBITE_SUPPORT_EMAIL'),
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
