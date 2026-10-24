import { describe, expect, it } from '@jest/globals';

import { DEFAULT_MARKET, isBilingualMarket, isMarket, marketFromTimeZone } from '../market';

describe('marketFromTimeZone (mirrors the web app)', () => {
  it.each([
    ['Asia/Kolkata', 'India'],
    ['Asia/Calcutta', 'India'],
    ['Asia/Colombo', 'India'],
    ['Europe/London', 'United Kingdom'],
    ['America/New_York', 'United States'],
    ['US/Pacific', 'United States'],
    ['Europe/Berlin', 'European Union'],
    ['Australia/Sydney', 'Australia'],
    ['Asia/Dubai', 'UAE'],
    ['Asia/Tokyo', DEFAULT_MARKET],
    ['', DEFAULT_MARKET],
  ])('%s → %s', (tz, market) => {
    expect(marketFromTimeZone(tz)).toBe(market);
  });

  it('falls back for missing time zones', () => {
    expect(marketFromTimeZone(null)).toBe(DEFAULT_MARKET);
    expect(marketFromTimeZone(undefined)).toBe(DEFAULT_MARKET);
  });
});

describe('market helpers', () => {
  it('recognizes only known markets', () => {
    expect(isMarket('India')).toBe(true);
    expect(isMarket('india')).toBe(false);
    expect(isMarket(42)).toBe(false);
  });

  it('only India gets bilingual output', () => {
    expect(isBilingualMarket('India')).toBe(true);
    expect(isBilingualMarket('United States')).toBe(false);
  });
});
