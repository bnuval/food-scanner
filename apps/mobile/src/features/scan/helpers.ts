import { Paths } from 'expo-file-system';

import type { PhotoSlot } from '@/state/scan-session';

import type { ScanStrings } from './strings';

/** Over-camera colours: the preview is always dark-dimmed, so these do not follow the theme. */
export const SCRIM = 'rgba(0, 0, 0, 0.55)';
export const SCRIM_STRONG = 'rgba(0, 0, 0, 0.68)';
export const ON_SCRIM = '#FFFFFF';
export const ON_SCRIM_RIPPLE = '#FFFFFF40';

export function slotLabel(t: ScanStrings, slot: PhotoSlot): string {
  return slot === 'ingredients' ? t.slotIngredients : slot === 'nutrition' ? t.slotNutrition : t.slotFront;
}

/** EAN-8 / UPC-E / UPC-A / EAN-13 / GTIN-14 as plain digits, or null. */
export function normalizeBarcode(data: string): string | null {
  const code = data.trim();
  return /^\d{8,14}$/.test(code) ? code : null;
}

/** Digits separated by spaces so TalkBack reads "8 9 0 1…" instead of a huge number. */
export function spellDigits(code: string): string {
  return code.split('').join(' ');
}

const TARGET_PIXELS = 2.5e6;
const MIN_PIXELS = 1.8e6;

/**
 * Picks a ~2–3 MP, roughly 4:3 capture size from the camera's "WxH" list. Full-resolution
 * 12–50 MP captures only cost time and memory: uploads are downscaled to ~1000 px anyway.
 */
export function choosePictureSize(sizes: string[]): string | undefined {
  const parsed = sizes
    .map((s) => {
      const match = /^(\d+)x(\d+)$/.exec(s);
      if (!match) return null;
      const w = Number(match[1]);
      const h = Number(match[2]);
      return { s, pixels: w * h, ratio: Math.max(w, h) / Math.min(w, h) };
    })
    .filter((p): p is { s: string; pixels: number; ratio: number } => p !== null && p.pixels > 0);
  if (parsed.length === 0) return undefined;

  const fourThree = parsed.filter((p) => Math.abs(p.ratio - 4 / 3) < 0.05);
  const pool = fourThree.length > 0 ? fourThree : parsed;
  const bigEnough = pool.filter((p) => p.pixels >= MIN_PIXELS);
  if (bigEnough.length === 0) return pool.reduce((a, b) => (b.pixels > a.pixels ? b : a)).s;
  return bigEnough.reduce((a, b) =>
    Math.abs(b.pixels - TARGET_PIXELS) < Math.abs(a.pixels - TARGET_PIXELS) ? b : a,
  ).s;
}

/** A camera "WxH" capture size, e.g. "1920x1440". */
export function isPictureSize(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d{1,4}x[1-9]\d{1,4}$/.test(value);
}

/** Zoom change per tap of the zoom buttons (CameraView zoom is 0..1). */
export const ZOOM_BUTTON_STEP = 0.15;

/** Next zoom for a zoom-in (+1) or zoom-out (-1) tap, clamped to 0..1 without float drift. */
export function stepZoom(zoom: number, direction: 1 | -1): number {
  const next = Math.round((zoom + direction * ZOOM_BUTTON_STEP) * 1000) / 1000;
  return Math.min(1, Math.max(0, next));
}

/**
 * Document-scanner errors that will fail the same way for the rest of the session (no ML Kit
 * module or no Play services). Anything else (module still downloading, activity recreated,
 * a scan already open) is transient. Codes come from expo-camera's native exception classes.
 */
const PERMANENT_DOC_SCAN_ERRORS = new Set(['ERR_DOCUMENT_SCANNER_UNAVAILABLE', 'ERR_GOOGLE_PLAY_SERVICES_UNAVAILABLE']);

export function isPermanentDocScanError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  return typeof error.code === 'string' && PERMANENT_DOC_SCAN_ERRORS.has(error.code);
}

/** True for files inside this app's cache (picker copies, captures, scanner pages): safe to delete. */
export function isCacheFile(uri: string): boolean {
  try {
    return uri.startsWith(Paths.cache.uri);
  } catch {
    return false;
  }
}

/** Rejects after `ms`; `onLate` receives the value if the promise settles after the timeout. */
export function withTimeout<T>(promise: Promise<T>, ms: number, onLate?: (value: T) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      reject(new Error('timeout'));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        if (timedOut) onLate?.(value);
        else resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        if (!timedOut) reject(error);
      },
    );
  });
}
