const { describe, expect, it } = require('@jest/globals');

const { applyReleaseSigning } = require('../with-release-signing');

const TEMPLATE_GRADLE = `
android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}
`;

describe('with-release-signing', () => {
  it('adds a property-driven release signing config and selects it for release only', () => {
    const out = applyReleaseSigning(TEMPLATE_GRADLE);
    expect(out).toContain("storeFile file(findProperty('PUREBITE_UPLOAD_STORE_FILE'))");
    expect(out).toContain('signingConfig signingConfigs.release');
    // Debug build type keeps the debug key.
    expect(out).toMatch(/debug \{\s*signingConfig signingConfigs\.debug\s*\}/);
    // No secrets are written into the Gradle file.
    expect(out).not.toMatch(/storePassword '(?!android')/);
  });

  it('is idempotent across repeated prebuilds', () => {
    const once = applyReleaseSigning(TEMPLATE_GRADLE);
    expect(applyReleaseSigning(once)).toBe(once);
  });

  it('fails loudly when the template changes shape', () => {
    expect(() => applyReleaseSigning('android {}')).toThrow(/signingConfigs.debug/);
  });
});
