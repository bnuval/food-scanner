import { z } from "zod";

/** Market names exactly as the web pages and the mobile app send them in `userCountry`. */
export const MARKETS = ["India", "United States", "United Kingdom", "European Union", "Australia", "UAE"] as const;
export type Market = (typeof MARKETS)[number];

/** Largest accepted JSON body; checked before parsing. Below Vercel's 4.5 MB function limit. */
export const MAX_JSON_BODY_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_DATA_URL_CHARS = 1.5 * 1024 * 1024;
const MAX_IMAGES = 3;

const JPEG_DATA_URL_PREFIX = "data:image/jpeg;base64,";
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
// Every JPEG starts with FF D8 FF, which base64-encodes to "/9j/".
const JPEG_BASE64_MAGIC = "/9j/";

const market = z.enum(MARKETS).default("India");

const jpegDataUrl = z
  .string()
  .max(MAX_IMAGE_DATA_URL_CHARS)
  .refine((value) => {
    if (!value.startsWith(JPEG_DATA_URL_PREFIX)) return false;
    const payload = value.slice(JPEG_DATA_URL_PREFIX.length);
    return payload.startsWith(JPEG_BASE64_MAGIC) && BASE64_RE.test(payload);
  }, "Expected a base64 JPEG data URL");

function isIanaTimeZone(value: string): boolean {
  if (!/^[A-Za-z][A-Za-z0-9_+\-/]{0,63}$/.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Missing or empty falls back to the old server default; anything else must be a real zone. */
const timeZone = z
  .string()
  .max(64)
  .optional()
  .transform((value) => value?.trim() || "Asia/Kolkata")
  .refine(isIanaTimeZone, "Expected an IANA time zone");

// Control characters, plus invisible format/bidi characters other than ZWNJ/ZWJ (used in Indic text).
const HIDDEN_CHARS_RE =
  /[\u0000-\u001F\u007F-\u009F­؜᠎​‎‏‪-‮⁠-⁤⁦-⁯﻿￹-￻]/g;

const searchQuery = z
  .string()
  .max(1000)
  .transform((value) => value.replace(HIDDEN_CHARS_RE, " ").replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1).max(100));

export const AnalyzeRequestSchema = z.object({
  imagesBase64: z.array(jpegDataUrl).min(1).max(MAX_IMAGES),
  userCountry: market,
  userTimezone: timeZone,
  barcode: z
    .string()
    .regex(/^[0-9]{8,14}$/)
    .nullish(),
});

export const SearchRequestSchema = z.object({
  query: searchQuery,
  categoryType: z.enum(["food", "cosmetics"]).default("food"),
  userCountry: market,
});

/** True when the only problem is an oversized photo, which deserves a 413 rather than a 400. */
export function isOversizedImage(error: z.ZodError): boolean {
  return error.issues.some(
    (issue) => issue.code === "too_big" && issue.path[0] === "imagesBase64" && issue.path.length === 2
  );
}

/** Field paths of the failed checks, for server logs (never the submitted values). */
export function issuePaths(error: z.ZodError): string {
  return error.issues.map((issue) => issue.path.join(".") || "(body)").join(", ");
}
