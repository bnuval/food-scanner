import { describe, expect, it } from '@jest/globals';

import {
  AnalysisResultSchema,
  AnalyzeRequestSchema,
  BUY_THRESHOLD,
  scoreBand,
  SearchRequestSchema,
  SearchResponseSchema,
} from '../api-schema';

const goodResult = {
  isReadable: true,
  productName: 'Tomato Ketchup',
  brandName: 'TastyCo',
  category: 'Condiments',
  healthScore: 38,
  verdict: 'AVOID',
  primaryReason: 'High added sugar.',
  primaryReasonHindi: 'अतिरिक्त चीनी अधिक है।',
  complianceNotes: 'FSSAI ok.',
  complianceNotesHindi: '',
  flaggedIngredients: [{ name: 'Sugar', concern: 'High', concernHindi: 'अधिक' }],
  positiveHighlights: ['Real tomatoes'],
  alternatives: [
    {
      brand: 'Organic Tattva',
      productName: 'Organic Ketchup',
      estimatedScore: 72,
      whyBetter: 'Less sugar',
      purchaseUrl: 'https://www.amazon.in/s?k=Organic%20Tattva',
    },
  ],
};

describe('AnalysisResultSchema', () => {
  it('parses a well-formed backend response', () => {
    const r = AnalysisResultSchema.parse(goodResult);
    expect(r.healthScore).toBe(38);
    expect(r.verdict).toBe('AVOID');
    expect(r.isReadable).toBe(true);
    expect(r.alternatives[0].purchaseUrl).toBe('https://www.amazon.in/s?k=Organic%20Tattva');
  });

  it('derives the verdict from the score when the model contradicts itself', () => {
    expect(AnalysisResultSchema.parse({ ...goodResult, healthScore: 90, verdict: 'AVOID' }).verdict).toBe('BUY');
    expect(AnalysisResultSchema.parse({ ...goodResult, healthScore: 10, verdict: 'BUY' }).verdict).toBe('AVOID');
    expect(AnalysisResultSchema.parse({ ...goodResult, healthScore: BUY_THRESHOLD }).verdict).toBe('BUY');
    expect(AnalysisResultSchema.parse({ ...goodResult, healthScore: BUY_THRESHOLD - 1 }).verdict).toBe('AVOID');
  });

  it('clamps and rounds scores, accepting numeric strings', () => {
    expect(AnalysisResultSchema.parse({ ...goodResult, healthScore: 140 }).healthScore).toBe(100);
    expect(AnalysisResultSchema.parse({ ...goodResult, healthScore: -5 }).healthScore).toBe(0);
    expect(AnalysisResultSchema.parse({ ...goodResult, healthScore: '71.6' }).healthScore).toBe(72);
  });

  it('treats a missing score as unreadable rather than inventing one', () => {
    const r = AnalysisResultSchema.parse({ ...goodResult, healthScore: undefined });
    expect(r.isReadable).toBe(false);
  });

  it('drops unsafe purchase URLs but keeps the alternative', () => {
    const r = AnalysisResultSchema.parse({
      ...goodResult,
      alternatives: [{ ...goodResult.alternatives[0], purchaseUrl: 'javascript:alert(1)' }],
    });
    expect(r.alternatives).toHaveLength(1);
    expect(r.alternatives[0].purchaseUrl).toBeNull();
  });

  it('caps string lengths and list sizes from untrusted AI output', () => {
    const r = AnalysisResultSchema.parse({
      ...goodResult,
      primaryReason: 'x'.repeat(10_000),
      positiveHighlights: Array.from({ length: 50 }, (_, i) => `h${i}`),
      flaggedIngredients: Array.from({ length: 50 }, (_, i) => ({ name: `i${i}`, concern: 'c' })),
    });
    expect(r.primaryReason.length).toBe(600);
    expect(r.positiveHighlights).toHaveLength(10);
    expect(r.flaggedIngredients).toHaveLength(15);
  });

  it('skips malformed list entries instead of failing the whole result', () => {
    const r = AnalysisResultSchema.parse({
      ...goodResult,
      flaggedIngredients: [null, 'Sugar', { concern: 'no name' }, { name: 'Salt', concern: 'High' }],
      positiveHighlights: ['', 42, 'Fibre'],
    });
    expect(r.flaggedIngredients.map((f) => f.name)).toEqual(['Salt']);
    expect(r.positiveHighlights).toEqual(['Fibre']);
  });

  it('defaults missing optional text to empty strings', () => {
    const r = AnalysisResultSchema.parse({ isReadable: true, healthScore: 70, verdict: 'BUY' });
    expect(r.primaryReasonHindi).toBe('');
    expect(r.complianceNotes).toBe('');
    expect(r.alternatives).toEqual([]);
  });

  it('honours an explicit unreadable flag', () => {
    expect(AnalysisResultSchema.parse({ ...goodResult, isReadable: false }).isReadable).toBe(false);
  });

  it('rejects non-object payloads', () => {
    expect(AnalysisResultSchema.safeParse('oops').success).toBe(false);
    expect(AnalysisResultSchema.safeParse(null).success).toBe(false);
  });
});

describe('SearchResponseSchema', () => {
  it('keeps only allowlisted store links and names unnamed ones', () => {
    const r = SearchResponseSchema.parse({
      products: [
        {
          brand: 'Pintola',
          productName: 'Peanut Butter',
          healthScore: 91,
          verdictReason: 'Clean',
          stores: [
            { name: 'Amazon', url: 'https://www.amazon.in/s?k=pintola' },
            { name: '', url: 'https://www.flipkart.com/search?q=pintola' },
            { name: 'Evil', url: 'intent://evil#Intent;end' },
          ],
        },
      ],
    });
    expect(r.products[0].stores).toEqual([
      { name: 'Amazon', url: 'https://www.amazon.in/s?k=pintola' },
      { name: 'Flipkart', url: 'https://www.flipkart.com/search?q=pintola' },
    ]);
  });

  it('drops products without a name and tolerates a missing products array', () => {
    expect(SearchResponseSchema.parse({ products: [{ brand: 'X', healthScore: 90 }] }).products).toEqual([]);
    expect(SearchResponseSchema.parse({}).products).toEqual([]);
  });

  it('drops products without a usable score instead of showing them as 0/100', () => {
    const r = SearchResponseSchema.parse({
      products: [
        { productName: 'No score' },
        { productName: 'Null score', healthScore: null },
        { productName: 'Junk score', healthScore: 'high' },
        { productName: 'Rated', healthScore: '88.4' },
      ],
    });
    expect(r.products.map((p) => [p.productName, p.healthScore])).toEqual([['Rated', 88]]);
  });

  it('keeps the score the AI gave, clamped to 0..100', () => {
    const r = SearchResponseSchema.parse({
      products: [
        { productName: 'Low', healthScore: 42 },
        { productName: 'Over', healthScore: 140 },
      ],
    });
    expect(r.products.map((p) => p.healthScore)).toEqual([42, 100]);
  });

  it('caps the product list and per-product lists', () => {
    const r = SearchResponseSchema.parse({
      products: Array.from({ length: 20 }, (_, i) => ({
        productName: `P${i}`,
        healthScore: 80,
        highlights: Array.from({ length: 20 }, (_, j) => `h${j}`),
      })),
    });
    expect(r.products).toHaveLength(8);
    expect(r.products[0].highlights).toHaveLength(8);
  });
});

describe('request schemas', () => {
  it('validates analyze requests', () => {
    const ok = {
      imagesBase64: ['data:image/jpeg;base64,AAAA'],
      userCountry: 'India',
      userTimezone: 'Asia/Kolkata',
    };
    expect(AnalyzeRequestSchema.safeParse(ok).success).toBe(true);
    expect(AnalyzeRequestSchema.safeParse({ ...ok, imagesBase64: [] }).success).toBe(false);
    expect(AnalyzeRequestSchema.safeParse({ ...ok, imagesBase64: Array(4).fill(ok.imagesBase64[0]) }).success).toBe(false);
    expect(AnalyzeRequestSchema.safeParse({ ...ok, imagesBase64: ['data:image/png;base64,AAAA'] }).success).toBe(false);
    expect(AnalyzeRequestSchema.safeParse({ ...ok, userCountry: 'Mars' }).success).toBe(false);
    expect(AnalyzeRequestSchema.safeParse({ ...ok, barcode: '8901234567890' }).success).toBe(true);
    expect(AnalyzeRequestSchema.safeParse({ ...ok, barcode: '12ab' }).success).toBe(false);
  });

  it('validates search requests', () => {
    expect(SearchRequestSchema.safeParse({ query: ' oats ', categoryType: 'food', userCountry: 'India' }).success).toBe(true);
    expect(SearchRequestSchema.safeParse({ query: '   ', categoryType: 'food', userCountry: 'India' }).success).toBe(false);
    expect(SearchRequestSchema.safeParse({ query: 'x'.repeat(101), categoryType: 'food', userCountry: 'India' }).success).toBe(false);
    expect(SearchRequestSchema.safeParse({ query: 'oats', categoryType: 'drugs', userCountry: 'India' }).success).toBe(false);
  });
});

describe('scoreBand', () => {
  it('maps scores to bands consistent with the BUY threshold', () => {
    expect(scoreBand(100)).toBe('excellent');
    expect(scoreBand(80)).toBe('excellent');
    expect(scoreBand(79)).toBe('good');
    expect(scoreBand(BUY_THRESHOLD)).toBe('good');
    expect(scoreBand(BUY_THRESHOLD - 1)).toBe('poor');
    expect(scoreBand(40)).toBe('poor');
    expect(scoreBand(39)).toBe('bad');
    expect(scoreBand(0)).toBe('bad');
  });
});
