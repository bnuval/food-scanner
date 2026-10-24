import { describe, expect, it } from '@jest/globals';

import { safeStoreUrl, storeNameFromUrl } from '../links';

describe('safeStoreUrl', () => {
  it.each([
    'https://www.amazon.in/s?k=Organic%20Tattva%20Ketchup',
    'https://www.amazon.com/s?k=oats',
    'https://www.flipkart.com/search?q=peanut%20butter',
    'https://blinkit.com/s/?q=oats',
    'https://www.nykaa.com/search/result/?q=sunscreen',
    'https://www.walmart.com/search?q=oats',
    'https://www.target.com/s?searchTerm=oats',
    'https://www.sephora.com/search?keyword=spf',
  ])('accepts allowlisted store link %s', (url) => {
    expect(safeStoreUrl(url)).toBe(url);
  });

  it('normalizes the host to lower case and adds a root path', () => {
    expect(safeStoreUrl('https://WWW.Amazon.IN')).toBe('https://www.amazon.in/');
  });

  it.each([
    ['http (cleartext)', 'http://www.amazon.in/s?k=oats'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['intent scheme', 'intent://evil#Intent;scheme=http;end'],
    ['file scheme', 'file:///data/data/com.purebite.app/files/x'],
    ['data URL', 'data:text/html,<script>alert(1)</script>'],
    ['unknown host', 'https://evil.example/s?k=oats'],
    ['lookalike suffix host', 'https://www.amazon.in.evil.example/s'],
    ['lookalike prefix host', 'https://notamazon.in/s'],
    ['userinfo trick', 'https://www.amazon.in@evil.example/'],
    ['explicit port', 'https://www.amazon.in:8443/s'],
    ['embedded whitespace', 'https://www.amazon.in/s?k=a b'],
    ['quote injection', 'https://www.amazon.in/s?k="><img>'],
    ['backslash host confusion', 'https://www.amazon.in\\@evil.example/'],
    ['empty', ''],
  ])('rejects %s', (_label, url) => {
    expect(safeStoreUrl(url)).toBeNull();
  });

  it('rejects non-strings and oversized values', () => {
    expect(safeStoreUrl(undefined)).toBeNull();
    expect(safeStoreUrl(42)).toBeNull();
    expect(safeStoreUrl({ url: 'https://www.amazon.in/' })).toBeNull();
    expect(safeStoreUrl(`https://www.amazon.in/s?k=${'a'.repeat(3000)}`)).toBeNull();
  });
});

describe('storeNameFromUrl', () => {
  it('names stores from their host', () => {
    expect(storeNameFromUrl('https://www.amazon.in/s?k=x')).toBe('Amazon');
    expect(storeNameFromUrl('https://www.flipkart.com/search?q=x')).toBe('Flipkart');
    expect(storeNameFromUrl('https://blinkit.com/s/?q=x')).toBe('Blinkit');
  });
});
