import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { log } from './log';

/** Same limits as the web client: ~1000 px wide JPEG at q0.8 (≈150–300 KB per label photo). */
const UPLOAD_MAX_WIDTH = 1000;
const UPLOAD_MAX_HEIGHT = 1600;
const UPLOAD_QUALITY = 0.8;
const THUMB_WIDTH = 320;

export type PreparedPhoto = {
  /** file:// JPEG in the app cache, already resized and re-encoded (EXIF/GPS dropped). */
  uri: string;
  width: number;
  height: number;
};

/**
 * Downscales and re-encodes a captured or picked image for upload. Re-encoding through
 * the manipulator strips EXIF metadata (including GPS) and normalizes the format to JPEG.
 */
export async function prepareForUpload(sourceUri: string): Promise<PreparedPhoto> {
  return renderJpeg(sourceUri, { maxWidth: UPLOAD_MAX_WIDTH, maxHeight: UPLOAD_MAX_HEIGHT }, UPLOAD_QUALITY);
}

/** Small JPEG used for history rows. Written to the cache; the caller moves it somewhere durable. */
export async function makeThumbnail(sourceUri: string): Promise<PreparedPhoto> {
  return renderJpeg(sourceUri, { maxWidth: THUMB_WIDTH }, 0.7);
}

/**
 * Decodes with load-time bounds (the native side downsamples to fit, keeping the aspect
 * ratio, so 12–50 MP photos never fully load into memory), then saves a JPEG.
 * One context → one render: a second render of the same context reuses the native
 * bitmap, so releasing the first result would invalidate it.
 */
async function renderJpeg(
  sourceUri: string,
  bounds: { maxWidth: number; maxHeight?: number },
  compress: number,
): Promise<PreparedPhoto> {
  const ctx = ImageManipulator.manipulate(sourceUri, bounds);
  try {
    const image = await ctx.renderAsync();
    try {
      const saved = await image.saveAsync({ compress, format: SaveFormat.JPEG });
      return { uri: saved.uri, width: saved.width, height: saved.height };
    } finally {
      image.release();
    }
  } finally {
    ctx.release();
  }
}

/** Reads a prepared JPEG as a data URL, only at upload time to keep memory low. */
export async function toJpegDataUrl(uri: string): Promise<string> {
  const base64 = await new File(uri).base64();
  return `data:image/jpeg;base64,${base64}`;
}

/** Best-effort removal of temporary image files (captures, picks, prepared uploads). */
export function deleteFiles(uris: Iterable<string>): void {
  for (const uri of uris) {
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch (error) {
      log.warn('Could not delete temp file', error);
    }
  }
}

/** Cache folders that only ever hold transient captures, scans and prepared uploads. */
const TRANSIENT_DIRS = ['ImageManipulator', 'Camera', 'DocumentScanner', 'mlkit_docscan_ui_client'];
/** Picker copies keep the original bytes (incl. EXIF); keep recent ones for pending-result recovery. */
const PICKER_DIR = 'ImagePicker';
const PICKER_GRACE_MS = 10 * 60 * 1000;

/**
 * Removes label photos left behind when the process died mid-session (Android kills
 * backgrounded apps). Call once per launch, before any scan session holds photos.
 */
export function sweepTransientImages(now = Date.now()): void {
  for (const name of TRANSIENT_DIRS) {
    try {
      const dir = new Directory(Paths.cache, name);
      if (dir.exists) dir.delete();
    } catch (error) {
      log.warn('Could not sweep', name, error);
    }
  }
  try {
    const picker = new Directory(Paths.cache, PICKER_DIR);
    if (!picker.exists) return;
    for (const entry of picker.list()) {
      const modified = entry instanceof File ? entry.info().modificationTime : undefined;
      if (entry instanceof File && modified !== undefined && now - modified > PICKER_GRACE_MS) entry.delete();
    }
  } catch (error) {
    log.warn('Could not sweep picker copies', error);
  }
}

/** Deletes the ML Kit document scanner's own page copies (expo-camera only cleans its copies). */
export function deleteDocumentScannerCache(): void {
  try {
    const dir = new Directory(Paths.cache, 'mlkit_docscan_ui_client');
    if (dir.exists) dir.delete();
  } catch (error) {
    log.warn('Could not delete document scanner cache', error);
  }
}
