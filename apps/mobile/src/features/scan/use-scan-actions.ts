import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useStrings } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { deleteDocumentScannerCache, deleteFiles, prepareForUpload, type PreparedPhoto } from '@/lib/images';
import { log } from '@/lib/log';
import { MAX_PHOTOS } from '@/shared/api-schema';
import { useScanSession } from '@/state/scan-session';

import { isCacheFile, isPermanentDocScanError, withTimeout } from './helpers';
import { scanStrings } from './strings';
import { useRecommendedTimeout } from './use-recommended-timeout';

export type ScanNotice = { tone: 'error' | 'info'; message: string };

const CAPTURE_TIMEOUT_MS = 15_000;
/** Info notices only; errors stay until the next scan action or until the user leaves the tab. */
const NOTICE_MS = 5_000;

function isDocumentScannerAvailable(): boolean {
  try {
    return CameraView.isDocumentScannerAvailable === true;
  } catch {
    return false;
  }
}

/**
 * Every way a photo can enter the scan session: camera capture, gallery, ML Kit document
 * scanner and an Android picker result recovered after the activity was killed. One action
 * runs at a time (`busy`); `processing` is true only while images are being prepared.
 * Also owns opening the analysis, so a double tap can't start two paid analyses.
 */
export function useScanActions() {
  const session = useScanSession();
  const t = useStrings(scanStrings);
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState<ScanNotice | null>(null);
  const [docScanBroken, setDocScanBroken] = useState(false);
  const busyRef = useRef(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analyzePending = useRef(false);
  // Honours Android's accessibility "Time to take action" setting.
  const noticeMs = useRecommendedTimeout(NOTICE_MS);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  // Focus: the analyze screen (if one was opened) is gone, so Analyze works again.
  // Blur: a notice from this visit is stale by the time the user comes back.
  useFocusEffect(
    useCallback(() => {
      analyzePending.current = false;
      return () => {
        if (noticeTimer.current) clearTimeout(noticeTimer.current);
        noticeTimer.current = null;
        setNotice(null);
      };
    }, []),
  );

  const clearNotice = () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = null;
    setNotice(null);
  };

  const showNotice = (message: string, tone: ScanNotice['tone'] = 'error') => {
    clearNotice();
    setNotice({ tone, message });
    // Errors are the only record of a failed capture or import: keep them until the next
    // action instead of timing them out under the user.
    if (tone === 'info') noticeTimer.current = setTimeout(() => setNotice(null), noticeMs);
    else haptic('error');
  };

  const exclusive = async (task: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    clearNotice();
    try {
      await task();
    } finally {
      busyRef.current = false;
      setBusy(false);
      setProcessing(false);
    }
  };

  const remaining = () => Math.max(0, MAX_PHOTOS - session.photos.length);

  /** Prepares picked or scanned files, adds them, and deletes the cache originals. */
  const importFiles = async (uris: string[], limit: number) => {
    deleteFiles(uris.slice(limit).filter(isCacheFile));
    const wanted = uris.slice(0, limit);
    if (wanted.length === 0) return;
    setProcessing(true);
    const prepared: PreparedPhoto[] = [];
    let failed = 0;
    for (const uri of wanted) {
      try {
        prepared.push(await prepareForUpload(uri));
      } catch (error) {
        failed += 1;
        log.warn('Could not prepare image', error);
      }
    }
    deleteFiles(wanted.filter(isCacheFile));
    const added = session.addPhotos(prepared);
    if (failed > 0) showNotice(added > 0 ? t.importFailed : t.importFailedAll);
    else if (added > 0) haptic('success');
  };

  const capture = (camera: CameraView | null) =>
    exclusive(async () => {
      if (!camera || session.isFull) return;
      haptic('shutter');
      setProcessing(true);
      let originalUri: string | null = null;
      try {
        // exif: false keeps Android's default processing, which rotates pixels upright.
        const picture = await withTimeout(
          camera.takePictureAsync({ quality: 0.9, exif: false, base64: false }),
          CAPTURE_TIMEOUT_MS,
          (late) => deleteFiles([late.uri]),
        );
        originalUri = picture.uri;
        const prepared = await prepareForUpload(picture.uri);
        session.addPhotos([prepared]);
      } catch (error) {
        log.warn('Capture failed', error);
        showNotice(t.captureFailed);
      } finally {
        if (originalUri) deleteFiles([originalUri]);
      }
    });

  const pickFromGallery = () =>
    exclusive(async () => {
      const limit = remaining();
      if (limit === 0) return;
      let result: ImagePicker.ImagePickerResult;
      try {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          selectionLimit: limit,
          exif: false,
          quality: 1,
        });
      } catch (error) {
        log.warn('Image library failed', error);
        showNotice(t.pickerFailed);
        return;
      }
      if (result.canceled) return;
      await importFiles(
        result.assets.map((a) => a.uri),
        limit,
      );
    });

  const docScanAvailable = !docScanBroken && isDocumentScannerAvailable();

  const scanDocument = () =>
    exclusive(async () => {
      const limit = remaining();
      if (limit === 0) return;
      try {
        let result: Awaited<ReturnType<typeof CameraView.scanDocumentAsync>>;
        try {
          result = await CameraView.scanDocumentAsync({ requestPdf: false });
        } catch (error) {
          log.warn('Document scanner failed', error);
          // Hide the button only when it can never work; a transient failure (ML Kit module
          // still downloading, activity recreated) just shows the notice.
          if (isPermanentDocScanError(error)) setDocScanBroken(true);
          showNotice(t.docScanFailed);
          return;
        }
        if (!result) return;
        if (result.pdfUri) deleteFiles([result.pdfUri]);
        await importFiles(result.pages, limit);
      } finally {
        // ML Kit keeps its own copy of every page; expo-camera only cleans up its copies.
        deleteDocumentScannerCache();
      }
    });

  const removePhoto = (id: string) => {
    clearNotice();
    session.removePhoto(id);
    haptic('tick');
  };

  /** Opens the analysis once: ignores repeat taps until the Scan tab is focused again. */
  const analyze = () => {
    if (analyzePending.current || busyRef.current || session.photos.length === 0) return;
    analyzePending.current = true;
    session.requestAnalysis();
    // navigate (not push) reuses an analyze screen that is already open.
    router.navigate('/analyze');
  };

  // Android can kill the activity while the system photo picker is open; the pick is
  // recovered here on the next launch. Not cancelled on unmount: the result is one-shot.
  const onPendingAssets = useEffectEvent((uris: string[]) => {
    void exclusive(() => importFiles(uris, remaining()));
  });
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    ImagePicker.getPendingResultAsync()
      .then((pending) => {
        if (!pending) return;
        if ('code' in pending) {
          log.warn('Pending picker result failed', pending.code);
          return;
        }
        if (!pending.canceled && pending.assets.length > 0) onPendingAssets(pending.assets.map((a) => a.uri));
      })
      .catch((error: unknown) => log.warn('getPendingResultAsync failed', error));
  }, []);

  return { busy, processing, notice, docScanAvailable, capture, pickFromGallery, scanDocument, removePhoto, analyze };
}

export type ScanActions = ReturnType<typeof useScanActions>;
