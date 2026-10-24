// Framework-free: no React / React Native imports in src/shared.

/** Market names exactly as the PureBite backend expects them in `userCountry`. */
export const MARKETS = [
  'India',
  'United States',
  'United Kingdom',
  'European Union',
  'Australia',
  'UAE',
] as const;

export type Market = (typeof MARKETS)[number];

export const DEFAULT_MARKET: Market = 'India';

export function isMarket(value: unknown): value is Market {
  return typeof value === 'string' && (MARKETS as readonly string[]).includes(value);
}

/** Mirrors the web app's timezone → market inference so both clients agree. */
export function marketFromTimeZone(timeZone: string | null | undefined): Market {
  const tz = timeZone ?? '';
  if (tz.includes('Calcutta') || tz.includes('Kolkata') || tz.includes('Asia/Colombo')) return 'India';
  if (tz.includes('Europe/London')) return 'United Kingdom';
  if (tz.includes('America/') || tz.includes('US/')) return 'United States';
  if (tz.includes('Europe/')) return 'European Union';
  if (tz.includes('Australia/')) return 'Australia';
  if (tz.includes('Asia/Dubai')) return 'UAE';
  return DEFAULT_MARKET;
}

/** Bilingual (English + Hindi) AI output is only produced for the India market. */
export function isBilingualMarket(market: Market): boolean {
  return market === 'India';
}
