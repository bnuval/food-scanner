import type { Market } from '@/shared/market';

import { defineStrings, useStrings } from './index';

/** Localized display names. The English market value itself is what the backend receives. */
const marketNames = defineStrings({
  en: {
    India: 'India',
    'United States': 'United States',
    'United Kingdom': 'United Kingdom',
    'European Union': 'European Union',
    Australia: 'Australia',
    UAE: 'UAE',
  } satisfies Record<Market, string>,
  hi: {
    India: 'भारत',
    'United States': 'अमेरिका',
    'United Kingdom': 'यूनाइटेड किंगडम',
    'European Union': 'यूरोपीय संघ',
    Australia: 'ऑस्ट्रेलिया',
    UAE: 'यूएई',
  },
});

/** Returns a function that names a market in the current app language. */
export function useMarketName(): (market: Market) => string {
  const names = useStrings(marketNames);
  return (market) => names[market];
}
