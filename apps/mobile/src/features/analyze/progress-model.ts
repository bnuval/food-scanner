/**
 * Progress shown while a label is analysed. The real upload fills the first 30 % of the
 * bar; the server gives no progress, so the rest eases towards ~90 % over time and
 * holds there until the response arrives. Stages advance on the same clock.
 */

const UPLOAD_SHARE = 0.3;
const HOLD_AT = 0.9;
/** Time constant of the server-side ease (≈63 % of the remaining way after this long). */
const SERVER_TAU_MS = 7000;
/** Assumed upload time when the HTTP stack stops (or never starts) reporting upload progress. */
const FALLBACK_UPLOAD_MS = 3000;
/** Server-relative start of the "check ingredients" and "alternatives" stages. */
const CHECK_STAGE_AT_MS = 3500;
const ALTERNATIVES_STAGE_AT_MS = 9000;
const SLOW_AFTER_MS = 25_000;

/** How often the progress UI re-reads the clock. */
export const PROGRESS_TICK_MS = 250;

/** Stage indexes: 0 upload, 1 read label, 2 check ingredients, 3 find alternatives. */
export const STAGE_COUNT = 4;

export type ProgressTiming = {
  /** When the request was sent; null while photos are still being read from disk. */
  requestAt: number | null;
  /** Latest reported upload fraction (0..1); null until the first progress event. */
  upload: number | null;
  /** When the latest upload progress event arrived; null until the first one. */
  uploadAt: number | null;
  /** When the upload finished; null until then. */
  uploadDoneAt: number | null;
};

export type ProgressSnapshot = { value: number; stage: number; slow: boolean };

export const INITIAL_TIMING: ProgressTiming = { requestAt: null, upload: null, uploadAt: null, uploadDoneAt: null };

export const DONE_SNAPSHOT: ProgressSnapshot = { value: 1, stage: STAGE_COUNT, slow: false };

const MIN_VISIBLE = 0.02;
/** Upload fraction at which the upload counts as finished (the last bytes are often unreported). */
const UPLOAD_DONE_AT = 0.98;

/**
 * Applies an upload progress event to the timing. Once the quiet-upload fallback has
 * moved the bar on to the server stages, it stays latched there: a late event can't
 * send it back to "Uploading" (the fallback start is recorded as the upload's end).
 */
export function withUploadProgress(timing: ProgressTiming, fraction: number, now: number): ProgressTiming {
  const { requestAt, upload, uploadAt, uploadDoneAt } = timing;
  if (requestAt === null || uploadDoneAt !== null) return timing;
  const lastSignal = uploadAt ?? requestAt;
  if (now - lastSignal >= FALLBACK_UPLOAD_MS) return { ...timing, uploadDoneAt: lastSignal + FALLBACK_UPLOAD_MS };
  return {
    ...timing,
    upload: Math.max(upload ?? 0, fraction),
    uploadAt: now,
    uploadDoneAt: fraction >= UPLOAD_DONE_AT ? now : null,
  };
}

/**
 * The snapshot to show after `shown`: the bar and the ticked stages never go backwards,
 * whatever the clock-based estimate does between real progress events.
 */
export function holdProgress(shown: ProgressSnapshot, next: ProgressSnapshot): ProgressSnapshot {
  const value = Math.max(shown.value, next.value);
  const stage = Math.max(shown.stage, next.stage);
  return value === shown.value && stage === shown.stage && next.slow === shown.slow ? shown : { value, stage, slow: next.slow };
}

export function progressAt(timing: ProgressTiming, now: number): ProgressSnapshot {
  const { requestAt, upload, uploadAt, uploadDoneAt } = timing;
  if (requestAt === null) return { value: MIN_VISIBLE, stage: 0, slow: false };

  const sinceRequest = Math.max(0, now - requestAt);
  const slow = sinceRequest >= SLOW_AFTER_MS;
  // Android may send one early event and never report completion: treat a quiet
  // upload as finished FALLBACK_UPLOAD_MS after the last sign of progress.
  const lastSignal = uploadAt ?? requestAt;
  const serverFrom =
    uploadDoneAt ?? (now - lastSignal >= FALLBACK_UPLOAD_MS ? lastSignal + FALLBACK_UPLOAD_MS : null);

  if (serverFrom === null) {
    const fraction = upload === null ? sinceRequest / FALLBACK_UPLOAD_MS : Math.max(upload, (now - lastSignal) / FALLBACK_UPLOAD_MS);
    return { value: Math.max(MIN_VISIBLE, UPLOAD_SHARE * Math.min(1, fraction)), stage: 0, slow };
  }

  const elapsed = Math.max(0, now - serverFrom);
  const value = UPLOAD_SHARE + (HOLD_AT - UPLOAD_SHARE) * (1 - Math.exp(-elapsed / SERVER_TAU_MS));
  const stage = elapsed < CHECK_STAGE_AT_MS ? 1 : elapsed < ALTERNATIVES_STAGE_AT_MS ? 2 : 3;
  return { value, stage, slow };
}
