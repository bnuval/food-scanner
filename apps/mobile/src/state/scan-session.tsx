import { randomUUID } from 'expo-crypto';
import { createContext, use, useRef, useState, type ReactNode } from 'react';

import { deleteFiles, sweepTransientImages, type PreparedPhoto } from '@/lib/images';
import { MAX_PHOTOS } from '@/shared/api-schema';

// Once per JS runtime (a full reload also resets the session; Fast Refresh keeps both).
const SWEPT = '__purebiteTransientImagesSwept';
const runtime = globalThis as typeof globalThis & { [SWEPT]?: boolean };
if (!runtime[SWEPT]) {
  runtime[SWEPT] = true;
  sweepTransientImages();
}

/** Suggested subject for each photo slot, in capture order. */
export const PHOTO_SLOTS = ['ingredients', 'nutrition', 'front'] as const;
export type PhotoSlot = (typeof PHOTO_SLOTS)[number];

export type SessionPhoto = PreparedPhoto & { id: string };

type ScanSessionValue = {
  photos: SessionPhoto[];
  /** EAN/UPC seen in the camera preview during this session, if any. */
  barcode: string | null;
  isFull: boolean;
  /** Slot hint for the next photo to take. */
  nextSlot: PhotoSlot | null;
  /** Adds photos up to MAX_PHOTOS; extras are deleted. Returns how many were added. */
  addPhotos: (photos: PreparedPhoto[]) => number;
  removePhoto: (id: string) => void;
  setBarcode: (code: string | null) => void;
  /** Clears the session and deletes its temporary files. */
  reset: () => void;
  /**
   * Called by the Analyze button right before navigating. The analyze screen only starts
   * a (paid) analysis when it can consume this, so deep links or duplicate pushes can't.
   */
  requestAnalysis: () => void;
  /** Returns true exactly once per requestAnalysis(). */
  consumeAnalysisRequest: () => boolean;
};

const ScanSessionContext = createContext<ScanSessionValue | null>(null);

/**
 * Photos the user is preparing for one analysis. Lives above the navigator so the Scan
 * tab and the analysis screen share it, and so photos survive a failed analysis for retry.
 */
export function ScanSessionProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<SessionPhoto[]>([]);
  const [barcode, setBarcode] = useState<string | null>(null);
  // Source of truth for synchronous reads between renders (e.g. two quick captures).
  const photosRef = useRef<SessionPhoto[]>([]);
  const analysisRequestedRef = useRef(false);

  const commit = (next: SessionPhoto[]) => {
    photosRef.current = next;
    setPhotos(next);
  };

  const addPhotos = (incoming: PreparedPhoto[]) => {
    const current = photosRef.current;
    const room = Math.max(0, MAX_PHOTOS - current.length);
    const accepted = incoming.slice(0, room).map((p) => ({ ...p, id: randomUUID() }));
    deleteFiles(incoming.slice(accepted.length).map((p) => p.uri));
    if (accepted.length > 0) commit([...current, ...accepted]);
    return accepted.length;
  };

  const removePhoto = (id: string) => {
    const current = photosRef.current;
    const removed = current.find((p) => p.id === id);
    if (!removed) return;
    deleteFiles([removed.uri]);
    commit(current.filter((p) => p.id !== id));
  };

  const reset = () => {
    deleteFiles(photosRef.current.map((p) => p.uri));
    commit([]);
    setBarcode(null);
  };

  const requestAnalysis = () => {
    analysisRequestedRef.current = true;
  };

  const consumeAnalysisRequest = () => {
    const requested = analysisRequestedRef.current;
    analysisRequestedRef.current = false;
    return requested;
  };

  const value: ScanSessionValue = {
    photos,
    barcode,
    isFull: photos.length >= MAX_PHOTOS,
    nextSlot: PHOTO_SLOTS[photos.length] ?? null,
    addPhotos,
    removePhoto,
    setBarcode,
    reset,
    requestAnalysis,
    consumeAnalysisRequest,
  };

  return <ScanSessionContext value={value}>{children}</ScanSessionContext>;
}

export function useScanSession(): ScanSessionValue {
  const ctx = use(ScanSessionContext);
  if (!ctx) throw new Error('useScanSession must be used inside <ScanSessionProvider>');
  return ctx;
}
