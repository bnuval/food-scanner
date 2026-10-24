// Config plugin: sign release builds with the Play upload key instead of the template's
// public debug keystore.
//
// The key never lives in the repo. Put these in ~/.gradle/gradle.properties (chmod 600)
// or pass them as -P flags / ORG_GRADLE_PROJECT_* env vars in CI:
//
//   PUREBITE_UPLOAD_STORE_FILE=/absolute/path/purebite-upload.jks
//   PUREBITE_UPLOAD_STORE_PASSWORD=...
//   PUREBITE_UPLOAD_KEY_ALIAS=purebite-upload
//   PUREBITE_UPLOAD_KEY_PASSWORD=...
//
// Without them, release builds fall back to debug signing (fine for local testing on an
// emulator; Google Play rejects such uploads) and Gradle prints a warning.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// @purebite/release-signing';

const RELEASE_SIGNING_CONFIG = `
        release { ${MARKER}
            if (findProperty('PUREBITE_UPLOAD_STORE_FILE')) {
                storeFile file(findProperty('PUREBITE_UPLOAD_STORE_FILE'))
                storePassword findProperty('PUREBITE_UPLOAD_STORE_PASSWORD')
                keyAlias findProperty('PUREBITE_UPLOAD_KEY_ALIAS')
                keyPassword findProperty('PUREBITE_UPLOAD_KEY_PASSWORD')
            }
        }`;

const RELEASE_SIGNING_SELECTION = `if (findProperty('PUREBITE_UPLOAD_STORE_FILE')) { ${MARKER}
                signingConfig signingConfigs.release
            } else {
                logger.warn('PureBite: PUREBITE_UPLOAD_STORE_FILE not set; release build is signed with the DEBUG key (not uploadable to Google Play).')
                signingConfig signingConfigs.debug
            }`;

function applyReleaseSigning(gradle) {
  if (gradle.includes(MARKER)) return gradle;

  const debugSigning = /(signingConfigs\s*\{\s*debug\s*\{[^}]*\})/m;
  if (!debugSigning.test(gradle)) throw new Error('[with-release-signing] signingConfigs.debug block not found in app/build.gradle');
  let out = gradle.replace(debugSigning, `$1${RELEASE_SIGNING_CONFIG}`);

  const releaseUsesDebug = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/m;
  if (!releaseUsesDebug.test(out)) throw new Error('[with-release-signing] release signingConfig line not found in app/build.gradle');
  out = out.replace(releaseUsesDebug, `$1${RELEASE_SIGNING_SELECTION}`);
  return out;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('[with-release-signing] only Groovy build.gradle is supported');
    }
    cfg.modResults.contents = applyReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};

module.exports.applyReleaseSigning = applyReleaseSigning;
