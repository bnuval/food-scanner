// Framework-free: no React / React Native imports in src/shared.
//
// Contract between the app and the PureBite backend (/api/analyze, /api/search-products).
// Everything the backend returns is AI-generated and treated as untrusted input: it is
// validated, length-capped and normalized here before any screen renders it.

import { z } from 'zod';

import { safeStoreUrl, storeNameFromUrl } from './links';
import { MARKETS } from './market';

// Hermes has no `new Function`; skip zod's eval-based fast path instead of probing for it.
z.config({ jitless: true });

export const BUY_THRESHOLD = 65;
export const MAX_PHOTOS = 3;

// Every field helper starts from `z.unknown().optional()`: in zod 4 a bare `z.unknown()`
// object key still rejects a *missing* key, and the backend omits optional fields.

/** Untrusted string → trimmed, length-capped string ('' when missing or not a string). */
const text = (max: number) =>
  z
    .unknown()
    .optional()
    .transform((v) => (typeof v === 'string' ? v.trim().slice(0, max) : ''));

/** Untrusted number → integer clamped to 0..100 (null when unusable). */
const score = z.unknown().optional().transform((v) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : null;
});

/** Untrusted array → array of successfully parsed items, capped at `max`. */
const list = <T extends z.ZodType>(item: T, max: number) =>
  z
    .unknown()
    .optional()
    .transform((v) => {
    if (!Array.isArray(v)) return [] as z.output<T>[];
    const out: z.output<T>[] = [];
    for (const entry of v) {
      const parsed = item.safeParse(entry);
      if (parsed.success) out.push(parsed.data);
      if (out.length >= max) break;
    }
    return out;
  });

// ---------- Requests ----------

export const AnalyzeRequestSchema = z.object({
  imagesBase64: z.array(z.string().startsWith('data:image/jpeg;base64,')).min(1).max(MAX_PHOTOS),
  userCountry: z.enum(MARKETS),
  userTimezone: z.string().max(64),
  /** Optional EAN/UPC detected on-device; extra context for the backend. */
  barcode: z.string().regex(/^[0-9]{8,14}$/).optional(),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const SEARCH_CATEGORIES = ['food', 'cosmetics'] as const;
export type SearchCategory = (typeof SEARCH_CATEGORIES)[number];

export const SearchRequestSchema = z.object({
  query: z.string().trim().min(1).max(100),
  categoryType: z.enum(SEARCH_CATEGORIES),
  userCountry: z.enum(MARKETS),
});
export type SearchRequest = z.infer<typeof SearchRequestSchema>;

// ---------- Responses ----------

const FlaggedIngredientSchema = z
  .object({ name: text(80), concern: text(400), concernHindi: text(600) })
  .refine((i) => i.name.length > 0);

const AlternativeSchema = z
  .object({
    brand: text(60),
    productName: text(120),
    estimatedScore: score,
    whyBetter: text(400),
    purchaseUrl: z.unknown().optional().transform(safeStoreUrl),
  })
  .refine((a) => a.brand.length > 0 || a.productName.length > 0);

export const AnalysisResultSchema = z
  .object({
    isReadable: z
      .unknown()
      .optional()
      .transform((v) => v !== false),
    productName: text(120),
    brandName: text(60),
    category: text(60),
    healthScore: score,
    verdict: z.unknown().optional(),
    primaryReason: text(600),
    primaryReasonHindi: text(900),
    complianceNotes: text(800),
    complianceNotesHindi: text(1200),
    flaggedIngredients: list(FlaggedIngredientSchema, 15),
    positiveHighlights: list(text(80).refine((s) => s.length > 0), 10),
    alternatives: list(AlternativeSchema, 5),
  })
  .transform((r) => {
    const healthScore = r.healthScore ?? 0;
    // The score is the source of truth; the verdict must agree with it.
    const verdict: 'BUY' | 'AVOID' = healthScore >= BUY_THRESHOLD ? 'BUY' : 'AVOID';
    return { ...r, isReadable: r.isReadable && r.healthScore !== null, healthScore, verdict };
  });
export type AnalysisResult = z.output<typeof AnalysisResultSchema>;
export type FlaggedIngredient = AnalysisResult['flaggedIngredients'][number];
export type Alternative = AnalysisResult['alternatives'][number];

const StoreLinkSchema = z
  .object({ name: text(30), url: z.unknown().optional().transform(safeStoreUrl) })
  .transform((s) => (s.url ? { name: s.name || storeNameFromUrl(s.url), url: s.url } : null));

const ProductSchema = z
  .object({
    brand: text(60),
    productName: text(120),
    healthScore: score,
    verdictReason: text(500),
    keyIngredients: list(text(60).refine((s) => s.length > 0), 10),
    highlights: list(text(60).refine((s) => s.length > 0), 8),
    stores: list(StoreLinkSchema, 6),
  })
  .transform(({ healthScore, ...p }, ctx) => {
    // A product without a name or a usable score is dropped, never shown as "0/100".
    if (p.productName.length === 0 || healthScore === null) {
      ctx.issues.push({ code: 'custom', message: 'Product needs a name and a score', input: p });
      return z.NEVER;
    }
    return {
      ...p,
      healthScore,
      stores: p.stores.filter((s): s is { name: string; url: string } => s !== null),
    };
  });

export const SearchResponseSchema = z.object({ products: list(ProductSchema, 8) });
export type SearchResponse = z.output<typeof SearchResponseSchema>;
export type Product = SearchResponse['products'][number];

// ---------- Score bands ----------

export type ScoreBand = 'excellent' | 'good' | 'poor' | 'bad';

export function scoreBand(value: number): ScoreBand {
  if (value >= 80) return 'excellent';
  if (value >= BUY_THRESHOLD) return 'good';
  if (value >= 40) return 'poor';
  return 'bad';
}
