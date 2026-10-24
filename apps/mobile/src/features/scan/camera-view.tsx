import { CameraView, type BarcodeScanningResult, type BarcodeSettings, type CameraMountError } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { Storage } from 'expo-sqlite/kv-store';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureDetector, usePinchGesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { log } from '@/lib/log';

import { choosePictureSize, isPictureSize } from './helpers';

/** Retail product codes only. Module constant: Android applies settings on rebind only. */
const BARCODE_SETTINGS: BarcodeSettings = { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] };

/** Zoom added per doubling of finger distance (Android maps zoom linearly to maxZoomRatio). */
const ZOOM_PER_DOUBLING = 0.25;
/** Smallest zoom change worth a JS update; keeps bridge traffic low during a pinch. */
const ZOOM_STEP = 0.005;

/** kv-store key for the capture size chosen for this device's back camera (Android). */
const PICTURE_SIZE_KEY = 'scan.pictureSize.v1';

/**
 * Capture size for this device (Android). Changing `pictureSize` on a mounted camera rebinds
 * it, so the size is chosen once, persisted, and every later mount (later launches too)
 * starts with it. undefined = not read yet; null = nothing stored.
 */
let preferredPictureSize: string | null | undefined;

function readPictureSize(): string | undefined {
  if (Platform.OS !== 'android') return undefined;
  if (preferredPictureSize === undefined) {
    try {
      const stored = Storage.getItemSync(PICTURE_SIZE_KEY);
      preferredPictureSize = isPictureSize(stored) ? stored : null;
    } catch (error) {
      log.warn('Could not read the picture size', error);
      preferredPictureSize = null;
    }
  }
  return preferredPictureSize ?? undefined;
}

function savePictureSize(size: string) {
  preferredPictureSize = size;
  Storage.setItemAsync(PICTURE_SIZE_KEY, size).catch((error: unknown) =>
    log.warn('Could not save the picture size', error),
  );
}

type ScanCameraProps = {
  cameraRef: RefObject<CameraView | null>;
  torch: boolean;
  /** CameraView zoom (0..1). Owned by the parent so pinch and the zoom buttons stay in sync. */
  zoom: number;
  /** Receives pinch updates. Pass a stable function (e.g. a state setter): the gesture captures it. */
  onZoomChange: (zoom: number) => void;
  /** The camera can take a picture at its final capture size. */
  onReady: () => void;
  onBarcode: (result: BarcodeScanningResult) => void;
  onMountError: (error: CameraMountError) => void;
};

/**
 * Full-bleed back-camera preview with pinch-to-zoom and live EAN/UPC detection. Mount it
 * only while the Scan tab is focused and the app is active (one preview at a time).
 */
export function ScanCamera({ cameraRef, torch, zoom, onZoomChange, onReady, onBarcode, onMountError }: ScanCameraProps) {
  useKeepAwake('purebite-scan-camera', { suppressDeactivateWarnings: true });
  const [pictureSize, setPictureSize] = useState(readPictureSize);
  const sizeRequested = useRef(false);

  // Adding/removing onBarcodeScanned rebinds the camera, so CameraView gets one stable
  // function that forwards to the latest handler.
  const onBarcodeRef = useRef(onBarcode);
  useLayoutEffect(() => {
    onBarcodeRef.current = onBarcode;
  });
  const handleBarcode = useCallback((result: BarcodeScanningResult) => onBarcodeRef.current(result), []);

  // Android fires onCameraReady on every camera open, including the rebind a new pictureSize causes.
  const handleReady = () => {
    if (Platform.OS !== 'android' || pictureSize !== undefined) {
      onReady();
      return;
    }
    // First run on this device: choose a size, and keep the shutter disabled until the
    // rebind it triggers has reopened the camera (a capture during the rebind fails).
    if (sizeRequested.current) return;
    sizeRequested.current = true;
    const camera = cameraRef.current;
    if (!camera) {
      onReady();
      return;
    }
    camera
      .getAvailablePictureSizesAsync()
      .then((sizes) => {
        const best = choosePictureSize(sizes);
        if (!best) {
          onReady();
          return;
        }
        savePictureSize(best);
        setPictureSize(best);
      })
      .catch((error: unknown) => {
        log.warn('Picture sizes unavailable', error);
        onReady();
      });
  };

  // Last zoom the parent committed, readable on the UI thread when a pinch starts.
  const committedZoom = useSharedValue(zoom);
  useEffect(() => {
    committedZoom.set(zoom);
  }, [committedZoom, zoom]);
  const startZoom = useSharedValue(0);
  const sentZoom = useSharedValue(0);
  const pinch = usePinchGesture({
    onActivate: () => {
      startZoom.set(committedZoom.get());
      sentZoom.set(committedZoom.get());
    },
    onUpdate: (event) => {
      const next = Math.min(1, Math.max(0, startZoom.get() + Math.log2(Math.max(event.scale, 0.01)) * ZOOM_PER_DOUBLING));
      const sent = sentZoom.get();
      const atEdge = (next === 0 || next === 1) && next !== sent;
      if (atEdge || Math.abs(next - sent) >= ZOOM_STEP) {
        sentZoom.set(next);
        scheduleOnRN(onZoomChange, next);
      }
    },
  });

  return (
    <GestureDetector gesture={pinch}>
      <View
        style={StyleSheet.absoluteFill}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="picture"
          enableTorch={torch}
          zoom={zoom}
          pictureSize={pictureSize}
          barcodeScannerSettings={BARCODE_SETTINGS}
          onBarcodeScanned={handleBarcode}
          onCameraReady={handleReady}
          onMountError={onMountError}
        />
      </View>
    </GestureDetector>
  );
}
