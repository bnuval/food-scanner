// Framework-free: no React / React Native imports in src/shared.

/**
 * Exact hostnames the app is willing to open. Store links come from the backend
 * (built from fixed templates there), but the app treats every URL as untrusted
 * and only opens https links to these retailers.
 */
const STORE_HOSTS = new Set([
  'www.amazon.in',
  'amazon.in',
  'www.amazon.com',
  'amazon.com',
  'www.flipkart.com',
  'flipkart.com',
  'blinkit.com',
  'www.nykaa.com',
  'nykaa.com',
  'www.walmart.com',
  'walmart.com',
  'www.target.com',
  'target.com',
  'www.sephora.com',
  'sephora.com',
]);

// Strict: https scheme, plain hostname (no userinfo, no port), optional path/query/fragment
// without whitespace, quotes or angle brackets. Deliberately does not rely on the
// runtime's URL implementation.
const HTTPS_URL = /^https:\/\/([a-z0-9.-]+)([/?#][^\s"'<>\\]*)?$/i;

/** Returns the URL if it is an https link to an allowlisted store, otherwise null. */
export function safeStoreUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (value.length === 0 || value.length > 2048) return null;
  const match = HTTPS_URL.exec(value);
  if (!match) return null;
  const host = match[1].toLowerCase();
  if (!STORE_HOSTS.has(host)) return null;
  return `https://${host}${match[2] ?? '/'}`;
}

/** Display name for an allowlisted store URL, used when the backend gives no name. */
export function storeNameFromUrl(url: string): string {
  const match = HTTPS_URL.exec(url);
  const host = (match?.[1] ?? '').toLowerCase().replace(/^www\./, '');
  if (host.startsWith('amazon.')) return 'Amazon';
  const name = host.split('.')[0] ?? host;
  return name.charAt(0).toUpperCase() + name.slice(1);
}
