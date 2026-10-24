#!/usr/bin/env bash
# Release gate for a built APK: permissions allowlist, HTTPS-only network config,
# 16 KB page alignment (Google Play requirement) and a scan for leaked secrets.
#
#   scripts/verify-release.sh android/app/build/outputs/apk/release/app-release.apk
#
# For an .aab, check a universal APK built from it:
#   bundletool build-apks --bundle=app-release.aab --output=app.apks --mode=universal
#   unzip -p app.apks universal.apk > universal.apk && scripts/verify-release.sh universal.apk
set -euo pipefail

APK="${1:?usage: verify-release.sh <path/to/app-release.apk>}"
SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
BT="$(ls -d "$SDK"/build-tools/* | sort -V | tail -1)"
FAIL=0
fail() { echo "FAIL: $*"; FAIL=1; }
pass() { echo "ok:   $*"; }

# 1. Permissions: exactly the allowlist (plus the app-private receiver permission).
ALLOWED='android.permission.CAMERA|android.permission.INTERNET|android.permission.ACCESS_NETWORK_STATE|com.purebite.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION'
PERMS="$("$BT/aapt2" dump permissions "$APK" | sed -n "s/^uses-permission: name='\([^']*\)'.*/\1/p" | sort -u)"
UNEXPECTED="$(echo "$PERMS" | grep -Ev "^($ALLOWED)$" || true)"
if [ -n "$UNEXPECTED" ]; then fail "unexpected permissions:"; echo "$UNEXPECTED" | sed 's/^/        /'; else pass "permissions: $(echo "$PERMS" | tr '\n' ' ')"; fi

# 2. Manifest flags.
MANIFEST="$("$BT/aapt2" dump xmltree --file AndroidManifest.xml "$APK")"
echo "$MANIFEST" | grep -q 'allowBackup.*=false' && pass "allowBackup=false" || fail "allowBackup is not false"
echo "$MANIFEST" | grep -q 'debuggable.*=true' && fail "APK is debuggable" || pass "not debuggable"
echo "$MANIFEST" | grep -q 'usesCleartextTraffic.*=true' && fail "usesCleartextTraffic=true" || pass "no usesCleartextTraffic"

# 3. Network security config: no cleartext anywhere. Resource shrinking renames the file
#    (e.g. res/8G.xml), so resolve its path through the resource table.
NSC_PATH="$("$BT/aapt2" dump resources "$APK" | grep -A1 'xml/network_security_config' | sed -n 's/.*(file) \([^ ]*\) type=XML.*/\1/p' | head -1)"
if [ -z "$NSC_PATH" ]; then fail "network_security_config not found in resources"
else
  NSC="$("$BT/aapt2" dump xmltree --file "$NSC_PATH" "$APK")"
  if echo "$NSC" | grep -q 'cleartextTrafficPermitted.*=true'; then fail "cleartext permitted in $NSC_PATH (built with PUREBITE_DEV_CLEARTEXT=1?)"
  else pass "network security config ($NSC_PATH) is HTTPS-only"; fi
fi

# 3b. Embedded app config: the API origin must be https (never the dev mock default).
API_URL="$(unzip -p "$APK" assets/app.config | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const e=JSON.parse(s).extra||{};process.stdout.write(String(e.apiBaseUrl||""))})')"
case "$API_URL" in
  https://*) pass "API base URL: $API_URL" ;;
  *) fail "API base URL is not https: '${API_URL}'" ;;
esac
PRIVACY="$(unzip -p "$APK" assets/app.config | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const e=JSON.parse(s).extra||{};process.stdout.write(typeof e.privacyPolicyUrl==="string"?e.privacyPolicyUrl:"")})')"
[ -n "$PRIVACY" ] && pass "privacy policy URL set" || echo "warn: PUREBITE_PRIVACY_URL not set (required for Google Play)"

# 4. 16 KB page alignment for native libraries.
if "$BT/zipalign" -c -P 16 4 "$APK" >/dev/null 2>&1; then pass "zipalign -P 16 (16 KB pages)"; else fail "not 16 KB page aligned"; fi

# 5. Secret scan over everything in the APK (JS bundle, resources, dex).
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
unzip -q -o "$APK" -d "$TMP"
PATTERNS='AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9]{20,}|\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{40,}|X-Master-Key|PureBiteAdmin|GEMINI_API_KEY|JSONBIN_API_KEY|BEGIN (RSA |EC )?PRIVATE KEY'
HITS="$(grep -rEao "$PATTERNS" "$TMP" 2>/dev/null | sort -u | head -20 || true)"
if [ -n "$HITS" ]; then fail "possible secrets in APK:"; echo "$HITS" | sed 's/^/        /'; else pass "no secret patterns found"; fi

# 6. Signing.
if "$BT/apksigner" verify --print-certs "$APK" 2>/dev/null | grep -q 'CN=Android Debug'; then
  echo "warn: signed with the DEBUG key (fine for local testing, not uploadable to Play)"
else pass "signed with a non-debug key"; fi

[ "$FAIL" -eq 0 ] && echo "RELEASE CHECKS PASSED" || { echo "RELEASE CHECKS FAILED"; exit 1; }
