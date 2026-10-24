import { useEffect, useRef, useState } from 'react';

import { ApiError, analyzeLabel, isApiError } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { saveScan } from '@/lib/history';
import { deleteFiles, makeThumbnail, toJpegDataUrl } from '@/lib/images';
import { log } from '@/lib/log';
import { queryClient } from '@/lib/query';
import { historyKeys } from '@/lib/query-keys';
import { AnalyzeRequestSchema, type AnalysisResult, type AnalyzeRequest } from '@/shared/api-schema';
import type { Market } from '@/shared/market';
import type { SessionPhoto } from '@/state/scan-session';
import { useSettings } from '@/state/settings';

import { INITIAL_TIMING, withUploadProgress, type ProgressTiming } from './progress-model';

/** Upper bound for the summed data URLs, kept under the backend's request body limit. */
const MAX_PAYLOAD_CHARS = 3_500_000;
/** Upload progress is reported in 5 % steps so the screen re-renders at most ~20 times. */
const UPLOAD_STEPS = 20;
/**
 * Between steps, a live upload still reports at least this often, so a slow uplink isn't
 * mistaken for a stalled one (see FALLBACK_UPLOAD_MS in the progress model).
 */
const UPLOAD_HEARTBEAT_MS = 1000;

/** A session photo could not be read from disk (for example, the cache was cleared). */
export class PhotoReadError extends Error {
  constructor() {
    super('photo_read');
    this.name = 'PhotoReadError';
  }
}

/** A readable result that still has to be stored in history. */
export type PendingSave = { result: AnalysisResult; market: Market; barcode: string | null };

export type AnalysisPhase =
  /** Nothing started yet (the screen first checks that this visit may start a paid analysis). */
  | { status: 'idle' }
  /** Reading photos, uploading, or waiting for the AI. */
  | { status: 'running'; timing: ProgressTiming }
  /** Response received; making the thumbnail and saving to history. Can't be cancelled. */
  | { status: 'finishing'; timing: ProgressTiming }
  /** The backend answered but could not read the label. Nothing is saved. */
  | { status: 'unreadable'; reason: string; reasonHindi: string }
  /** The analysis succeeded but storing it on the device failed; `retrySave` repeats only that. */
  | { status: 'save_error'; pending: PendingSave }
  | { status: 'error'; error: unknown };

const IDLE_PHASE: AnalysisPhase = { status: 'idle' };
const INITIAL_PHASE: AnalysisPhase = { status: 'running', timing: INITIAL_TIMING };

type Options = {
  photos: readonly SessionPhoto[];
  barcode: string | null;
  /** The result was saved to history under `id`; the screen should open it. */
  onSaved: (id: string, result: AnalysisResult) => void;
  /** The result was saved after the screen had been left: its photos are no longer needed. */
  onSavedAfterLeave: () => void;
  /** The request was cancelled by something other than this screen; the screen should close. */
  onCancelled: () => void;
};

/**
 * Runs one paid analysis at a time for the given photos: reads them as data URLs at upload
 * time, posts them, and saves a readable result to history. Never retries on its own.
 * The in-flight request is aborted by `cancel()`, by a new `start()`, and on unmount. Once
 * the response has arrived it is no longer cancellable: it is saved even if the screen is
 * left, and a failed save is retried on its own (`retrySave`), never by paying again.
 */
export function useAnalysis({ photos, barcode, onSaved, onSavedAfterLeave, onCancelled }: Options) {
  const { effectiveMarket, timeZone } = useSettings();
  const [phase, setPhase] = useState<AnalysisPhase>(IDLE_PHASE);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  /** True while a received result is being saved. */
  const savingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const cancel = () => {
    if (!savingRef.current) controllerRef.current?.abort();
  };

  /** Stores a readable result. Runs to completion even if the screen is left meanwhile. */
  const save = async (pending: PendingSave) => {
    savingRef.current = true;
    setPhase((prev) => ({ status: 'finishing', timing: prev.status === 'running' ? prev.timing : INITIAL_TIMING }));
    let thumbUri: string | null = null;
    let id: string;
    try {
      thumbUri = await makeThumbnail(photos[0].uri).then(
        (thumb) => thumb.uri,
        () => null,
      );
      id = await saveScan({
        result: pending.result,
        market: pending.market,
        barcode: pending.barcode,
        thumbSourceUri: thumbUri,
      });
    } catch (error) {
      // Only the local save failed (storage full, database error): keep the paid result.
      log.warn('Saving the scan failed:', error instanceof Error ? error.name : 'unknown');
      if (mountedRef.current) haptic('error');
      setPhase({ status: 'save_error', pending });
      return;
    } finally {
      // saveScan moves the thumbnail into history storage; this only removes a leftover
      // temp file when that move failed.
      if (thumbUri) deleteFiles([thumbUri]);
      savingRef.current = false;
    }
    void queryClient.invalidateQueries({ queryKey: historyKeys.all });
    if (mountedRef.current) onSaved(id, pending.result);
    else onSavedAfterLeave();
  };

  const retrySave = () => {
    if (phase.status !== 'save_error' || savingRef.current) return;
    void save(phase.pending);
  };

  const start = async () => {
    if (photos.length === 0 || savingRef.current) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;
    const isCurrent = () => controllerRef.current === controller && !signal.aborted;
    const update = (next: (prev: AnalysisPhase) => AnalysisPhase) => {
      if (isCurrent()) setPhase(next);
    };

    setPhase(INITIAL_PHASE);
    let pending: PendingSave;
    try {
      const body = await buildRequest(photos, effectiveMarket, timeZone, barcode, signal);
      if (!isCurrent()) return;

      const requestAt = Date.now();
      update(() => ({ status: 'running', timing: { ...INITIAL_TIMING, requestAt } }));

      let lastStep = -1;
      let lastReportAt = requestAt;
      const result = await analyzeLabel(body, {
        signal,
        onUploadProgress: (fraction) => {
          const step = Math.floor(fraction * UPLOAD_STEPS);
          const now = Date.now();
          if (step === lastStep && now - lastReportAt < UPLOAD_HEARTBEAT_MS) return;
          lastStep = step;
          lastReportAt = now;
          update((prev) => {
            if (prev.status !== 'running') return prev;
            const timing = withUploadProgress(prev.timing, fraction, now);
            return timing === prev.timing ? prev : { ...prev, timing };
          });
        },
      });
      if (!isCurrent()) return;

      if (!result.isReadable) {
        haptic('error');
        update(() => ({ status: 'unreadable', reason: result.primaryReason, reasonHindi: result.primaryReasonHindi }));
        return;
      }
      pending = { result, market: effectiveMarket, barcode: body.barcode ?? null };
    } catch (error) {
      if (!isCurrent()) return;
      if (isApiError(error) && error.kind === 'cancelled') {
        onCancelled();
        return;
      }
      log.warn('Analysis failed:', isApiError(error) ? error.kind : error instanceof Error ? error.name : 'unknown');
      haptic('error');
      setPhase({ status: 'error', error });
      return;
    }
    // The paid response has arrived: from here on it is kept, whatever happens to the screen.
    await save(pending);
  };

  return { phase, start, cancel, retrySave };
}

async function buildRequest(
  photos: readonly SessionPhoto[],
  market: Market,
  timeZone: string,
  barcode: string | null,
  signal: AbortSignal,
): Promise<AnalyzeRequest> {
  const imagesBase64: string[] = [];
  let totalChars = 0;
  for (const photo of photos) {
    let dataUrl: string;
    try {
      dataUrl = await toJpegDataUrl(photo.uri);
    } catch {
      throw new PhotoReadError();
    }
    if (signal.aborted) throw new ApiError('cancelled');
    totalChars += dataUrl.length;
    if (totalChars > MAX_PAYLOAD_CHARS) throw new ApiError('too_large');
    imagesBase64.push(dataUrl);
  }

  // A malformed barcode is only extra context: drop it rather than fail the request.
  const validBarcode =
    barcode !== null && AnalyzeRequestSchema.shape.barcode.safeParse(barcode).success ? barcode : undefined;
  const parsed = AnalyzeRequestSchema.safeParse({
    imagesBase64,
    userCountry: market,
    userTimezone: timeZone.slice(0, 64),
    barcode: validBarcode,
  });
  if (!parsed.success) throw new ApiError('bad_request');
  return parsed.data;
}
