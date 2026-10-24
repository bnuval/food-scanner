// Config plugin: HTTPS-only networking for release builds.
//
// - src/main/res/xml/network_security_config.xml  → release: no cleartext traffic at all.
// - src/debug/ and src/debugOptimized/ res/xml/network_security_config.xml → development
//   variants only: cleartext allowed (Metro and scripts/mock-api.mjs over localhost, the
//   emulator's 10.0.2.2, or the dev machine's LAN IP from a physical device).
//
// Set PUREBITE_DEV_CLEARTEXT=1 only to point a *local* release build at the mock API on
// 10.0.2.2. Never set it for store builds.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const DEV_HOSTS = ['localhost', '127.0.0.1', '10.0.2.2'];

function domainConfig(hosts) {
  const domains = hosts.map((h) => `    <domain includeSubdomains="false">${h}</domain>`).join('\n');
  return `  <domain-config cleartextTrafficPermitted="true">\n${domains}\n  </domain-config>\n`;
}

function xml(allowDevCleartext, baseCleartext = false) {
  return (
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<network-security-config>\n' +
    `  <base-config cleartextTrafficPermitted="${baseCleartext}">\n` +
    '    <trust-anchors>\n' +
    '      <certificates src="system" />\n' +
    '    </trust-anchors>\n' +
    '  </base-config>\n' +
    (allowDevCleartext ? domainConfig(DEV_HOSTS) : '') +
    '</network-security-config>\n'
  );
}

function withNetworkSecurityConfig(config) {
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) {
      app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
      // The network security config is authoritative; drop the legacy flag.
      delete app.$['android:usesCleartextTraffic'];
    }
    return cfg;
  });

  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const appDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src');
      const write = (variant, contents) => {
        const dir = path.join(appDir, variant, 'res', 'xml');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'network_security_config.xml'), contents);
      };
      const devCleartextInRelease = process.env.PUREBITE_DEV_CLEARTEXT === '1';
      if (devCleartextInRelease) {
        console.warn('[with-network-security] PUREBITE_DEV_CLEARTEXT=1: release build allows cleartext to local dev hosts. Do not ship this build.');
      }
      write('main', xml(devCleartextInRelease));
      write('debug', xml(false, true));
      write('debugOptimized', xml(false, true));
      return cfg;
    },
  ]);
}

module.exports = withNetworkSecurityConfig;
