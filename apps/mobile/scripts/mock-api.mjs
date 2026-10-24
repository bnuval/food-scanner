#!/usr/bin/env node
// Local stand-in for the PureBite backend so the app can be developed and tested
// without a deployed server or Gemini quota. Same routes and response shapes as
// food-scanner/src/app/api/{analyze,search-products}.
//
//   node scripts/mock-api.mjs                # http://127.0.0.1:8787
//   MOCK_SCENARIO=avoid node scripts/...     # buy | avoid | unreadable | error | ratelimit | slow
//
// The Android emulator reaches this server at http://10.0.2.2:8787.

import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '127.0.0.1';
const BODY_LIMIT = 4.5 * 1024 * 1024; // Vercel serverless request body limit
let scenario = process.env.MOCK_SCENARIO ?? 'cycle';
let counter = 0;

const amazon = (market, q) =>
  `https://www.amazon.${market === 'India' ? 'in' : 'com'}/s?k=${encodeURIComponent(q)}`;

const fixtures = {
  avoid: (market) => ({
    isReadable: true,
    productName: 'Tomato Ketchup',
    brandName: 'TastyCo',
    category: 'Condiments',
    healthScore: 38,
    verdict: 'AVOID',
    primaryReason:
      'High added sugar (~25 g per 100 g) and refined salt, plus the preservative sodium benzoate (E211). A 15 g serving adds almost a teaspoon of sugar.',
    primaryReasonHindi:
      'इसमें अतिरिक्त चीनी (~25 ग्राम प्रति 100 ग्राम) और नमक अधिक है, साथ ही प्रिज़र्वेटिव सोडियम बेंजोएट (E211) भी है।',
    complianceNotes:
      'FSSAI: label lists INS 211 within permitted limits; front-of-pack sugar disclosure is not prominent.',
    complianceNotesHindi: 'FSSAI: INS 211 अनुमत सीमा में है; पैक के सामने चीनी की जानकारी स्पष्ट नहीं है।',
    flaggedIngredients: [
      {
        name: 'Sugar',
        concern: 'Second ingredient by weight; frequent intake is linked to weight gain and tooth decay.',
        concernHindi: 'वज़न के हिसाब से दूसरी सामग्री; ज़्यादा सेवन से वज़न और दाँतों की समस्या।',
      },
      {
        name: 'Sodium benzoate (E211)',
        concern: 'Preservative; can form benzene with vitamin C under heat or light.',
        concernHindi: 'प्रिज़र्वेटिव; गर्मी या रोशनी में विटामिन C के साथ बेंज़ीन बना सकता है।',
      },
      {
        name: 'Acidity regulator (INS 260)',
        concern: 'Generally safe; listed for completeness.',
        concernHindi: 'आम तौर पर सुरक्षित।',
      },
    ],
    positiveHighlights: ['Made with real tomatoes', 'No artificial colours'],
    alternatives: [
      {
        brand: 'Organic Tattva',
        productName: 'Organic Tomato Ketchup',
        estimatedScore: 72,
        whyBetter: 'Organic tomatoes and less added sugar, no sodium benzoate.',
        marketCountry: market,
        purchaseUrl: amazon(market, 'Organic Tattva Organic Tomato Ketchup'),
      },
      {
        brand: 'Wingreens',
        productName: 'Tomato Ketchup with Jaggery',
        estimatedScore: 68,
        whyBetter: 'Sweetened with jaggery instead of refined sugar.',
        marketCountry: market,
        purchaseUrl: amazon(market, 'Wingreens Tomato Ketchup Jaggery'),
      },
      {
        brand: 'Example',
        productName: 'Unsafe link is dropped by the app',
        estimatedScore: 70,
        whyBetter: 'The app must refuse non-allowlisted URLs.',
        purchaseUrl: 'javascript:alert(1)',
      },
    ],
  }),
  buy: (market) => ({
    isReadable: true,
    productName: 'Rolled Oats',
    brandName: 'Wholesome Farms',
    category: 'Breakfast cereals',
    healthScore: 86,
    verdict: 'BUY',
    primaryReason: '100% whole-grain oats with 10 g fibre per 100 g, no added sugar, salt or additives.',
    primaryReasonHindi: '100% साबुत ओट्स, प्रति 100 ग्राम 10 ग्राम फ़ाइबर, बिना अतिरिक्त चीनी, नमक या एडिटिव।',
    complianceNotes: 'FSSAI: whole-grain claim is consistent with the ingredient list.',
    complianceNotesHindi: 'FSSAI: होल-ग्रेन का दावा सामग्री सूची से मेल खाता है।',
    flaggedIngredients: [],
    positiveHighlights: ['High fibre', 'No added sugar', 'Single ingredient', 'Good source of protein'],
    alternatives: [
      {
        brand: 'True Elements',
        productName: 'Steel Cut Oats',
        estimatedScore: 88,
        whyBetter: 'Less processed, lower glycaemic index.',
        purchaseUrl: amazon(market, 'True Elements Steel Cut Oats'),
      },
    ],
  }),
  unreadable: () => ({
    isReadable: false,
    healthScore: 0,
    verdict: 'AVOID',
    primaryReason: 'The ingredient text is blurred by glare. Retake the photo in even light, holding the phone steady.',
    alternatives: [],
  }),
};

const searchFixture = (market, category, query) => ({
  products: [
    {
      brand: category === 'cosmetics' ? 'Juicy Chemistry' : 'Pintola',
      productName: category === 'cosmetics' ? 'Kakadu Plum Face Wash' : `All Natural ${query}`,
      healthScore: 91,
      verdictReason: 'Short, recognisable ingredient list with no additives of concern.',
      keyIngredients: ['Roasted peanuts'],
      highlights: ['No added sugar', 'No palm oil', 'High protein'],
      stores:
        market === 'India'
          ? [
              { name: 'Amazon', url: amazon(market, `Pintola ${query}`) },
              { name: 'Flipkart', url: `https://www.flipkart.com/search?q=${encodeURIComponent(query)}` },
              { name: category === 'cosmetics' ? 'Nykaa' : 'Blinkit', url: category === 'cosmetics' ? `https://www.nykaa.com/search/result/?q=${encodeURIComponent(query)}` : `https://blinkit.com/s/?q=${encodeURIComponent(query)}` },
              { name: 'Evil', url: 'intent://evil#Intent;scheme=http;end' },
            ]
          : [{ name: 'Amazon', url: amazon(market, `Pintola ${query}`) }],
    },
    {
      brand: 'The Whole Truth',
      productName: `Unsweetened ${query}`,
      healthScore: 84,
      verdictReason: 'Single-ingredient product; nothing added.',
      keyIngredients: [],
      highlights: ['Single ingredient'],
      stores: [{ name: 'Amazon', url: amazon(market, `The Whole Truth ${query}`) }],
    },
  ],
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw Object.assign(new Error('too large'), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

const server = createServer(async (req, res) => {
  const started = Date.now();
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  try {
    if (req.method === 'POST' && url.pathname === '/__scenario') {
      scenario = url.searchParams.get('s') ?? 'cycle';
      return send(res, 200, { scenario });
    }
    if (req.method !== 'POST') return send(res, 404, { error: 'Not found' });

    const body = await readJson(req);
    const s = scenario === 'cycle' ? ['avoid', 'buy', 'unreadable'][counter++ % 3] : scenario;

    if (s === 'ratelimit') return send(res, 429, { error: 'Too many requests' }, { 'Retry-After': '20' });
    if (s === 'error') return send(res, 500, { error: 'Internal stack trace that must not be shown' });
    if (s === 'upgrade') return send(res, 426, { error: 'Upgrade required' });

    if (url.pathname === '/api/analyze') {
      const images = Array.isArray(body.imagesBase64) ? body.imagesBase64 : [];
      if (images.length === 0) return send(res, 400, { error: 'No images provided' });
      const kb = Math.round(images.reduce((n, i) => n + String(i).length, 0) / 1024);
      console.log(
        `analyze: ${images.length} image(s), ${kb} KB base64, market=${body.userCountry}, tz=${body.userTimezone}, barcode=${body.barcode ?? '-'}, ` +
          `v=${req.headers['x-app-version']}, install=${String(req.headers['x-install-id'] ?? '').slice(0, 8)}…, scenario=${s}`,
      );
      await sleep(s === 'slow' ? 70_000 : 4_500);
      const fixture = (fixtures[s] ?? fixtures.avoid)(body.userCountry ?? 'India');
      return send(res, 200, fixture);
    }

    if (url.pathname === '/api/search-products') {
      if (!body.query) return send(res, 400, { error: 'Query is required' });
      console.log(`search: "${body.query}" category=${body.categoryType} market=${body.userCountry}`);
      await sleep(s === 'slow' ? 40_000 : 1_800);
      return send(res, 200, searchFixture(body.userCountry ?? 'India', body.categoryType, body.query));
    }

    return send(res, 404, { error: 'Not found' });
  } catch (err) {
    const status = err.status ?? 400;
    return send(res, status, { error: status === 413 ? 'Payload too large' : 'Bad request' });
  } finally {
    console.log(`${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - started}ms`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`PureBite mock API on http://${HOST}:${PORT} (scenario: ${scenario}); emulator: http://10.0.2.2:${PORT}`);
});
