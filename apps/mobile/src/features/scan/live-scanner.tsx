import type { BarcodeScanningResult, CameraMountError, CameraView } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, useWindowDimensions, View, type LayoutRectangle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { OfflineBanner } from '@/components/offline-banner';
import { fmt, useStrings } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { MAX_PHOTOS } from '@/shared/api-schema';
import { useScanSession } from '@/state/scan-session';
import { MAX_CONTENT_WIDTH, useTheme } from '@/theme';

import { ScanCamera } from './camera-view';
import { CaptureControls } from './capture-controls';
import { CompactGuide, computeFrame, GuideContent, GuideMask, type GuideStatus } from './guide-overlay';
import { normalizeBarcode, ON_SCRIM, slotLabel } from './helpers';
import { PhotoTray } from './photo-tray';
import { scanStrings } from './strings';
import { ScanTopBar } from './top-bar';
import { useIdleTimer } from './use-idle-timer';
import { useRecommendedTimeout } from './use-recommended-timeout';
import type { ScanActions } from './use-scan-actions';
import { ZoomControl } from './zoom-control';

/** Ignore repeat detections for this long after accepting a code (events fire many times/s). */
const BARCODE_DEBOUNCE_MS = 2_000;
/**
 * The camera stops after this long without interaction: the screen may sleep again and
 * CameraX / ML Kit are released. Extended by Android's accessibility timeout setting.
 */
const CAMERA_IDLE_MS = 90_000;
/** The tips are optional help; capping their growth leaves room for the guide at large font sizes. */
const TIPS_MAX_FONT_SCALE = 1.3;
/** Guide areas shorter than this get a horizontal zoom control. */
const ZOOM_COLUMN_MIN_HEIGHT = 120;

type LiveScannerProps = {
  actions: ScanActions;
  onMountError: (error: CameraMountError) => void;
};

/**
 * Camera-first Scan tab: live preview with guide frame and barcode detection, plus the
 * capture panel (tray, Analyze, gallery, shutter, document scanner). Mounted only while
 * the tab is focused, the app is active and camera permission is granted.
 */
export function LiveScanner({ actions, onMountError }: LiveScannerProps) {
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const t = useStrings(scanStrings);
  const session = useScanSession();
  const cameraRef = useRef<CameraView>(null);
  const lastBarcodeAt = useRef(0);
  const [ready, setReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [guideArea, setGuideArea] = useState<LayoutRectangle | null>(null);
  const idleMs = useRecommendedTimeout(CAMERA_IDLE_MS);
  const { idle, markActive, resume } = useIdleTimer(idleMs);

  const count = session.photos.length;
  const full = session.isFull;
  const frame = guideArea && !idle ? computeFrame(guideArea, fontScale) : null;
  // Status, step and barcode move into the panel when the frame doesn't fit or the camera is paused.
  const compact = idle || (guideArea !== null && frame === null);

  useEffect(() => {
    if (idle) AccessibilityInfo.announceForAccessibility(t.cameraPaused);
  }, [idle, t.cameraPaused]);

  const resumeCamera = () => {
    setReady(false);
    setTorch(false);
    resume();
  };

  const handleBarcode = (result: BarcodeScanningResult) => {
    if (session.barcode !== null) return;
    const code = normalizeBarcode(result.data);
    if (!code) return;
    const now = Date.now();
    if (now - lastBarcodeAt.current < BARCODE_DEBOUNCE_MS) return;
    lastBarcodeAt.current = now;
    markActive();
    session.setBarcode(code);
    haptic('tick');
  };

  // Touches reset the idle timer through onTouchStartCapture; TalkBack and Switch Access
  // activations don't send touches, so every control also marks activity itself.
  const toggleTorch = () => {
    markActive();
    if (idle) {
      resumeCamera();
      haptic('toggleOn');
      setTorch(true);
      return;
    }
    haptic(torch ? 'toggleOff' : 'toggleOn');
    setTorch(!torch);
  };

  const changeZoom = (next: number) => {
    markActive();
    setZoom(next);
  };

  const removeBarcode = () => {
    markActive();
    session.setBarcode(null);
  };

  const status: GuideStatus = actions.notice
    ? { kind: actions.notice.tone, text: actions.notice.message }
    : actions.processing
      ? { kind: 'processing', text: t.processing }
      : full
        ? { kind: 'full', text: fmt(t.full, { max: MAX_PHOTOS }) }
        : { kind: 'hint', text: t.hint };

  const stepText = full
    ? fmt(t.stepChipFull, { total: MAX_PHOTOS })
    : fmt(t.stepChip, { n: count + 1, total: MAX_PHOTOS, slot: slotLabel(t, session.nextSlot ?? 'front') });

  const shutterLabel = full
    ? t.shutterFull
    : actions.processing
      ? t.shutterBusy
      : fmt(t.shutter, { n: count + 1, total: MAX_PHOTOS });

  const analyzeLabel = count > 0 ? fmt(t.analyzeCount, { count }) : t.analyze;
  const analyzeA11y = count === 1 ? t.analyzeA11yOne : count > 1 ? fmt(t.analyzeA11yMany, { count }) : t.analyze;

  // Centre the zoom control on the frame (or the guide area when there is no frame).
  const zoomOffset = guideArea ? 2 * (frame ? frame.y + frame.height / 2 : guideArea.height / 2) - guideArea.height : 0;

  return (
    <View style={styles.root} onTouchStartCapture={markActive}>
      <StatusBar style="light" />
      {idle ? null : (
        <ScanCamera
          cameraRef={cameraRef}
          torch={torch}
          zoom={zoom}
          onZoomChange={setZoom}
          onReady={() => setReady(true)}
          onBarcode={handleBarcode}
          onMountError={onMountError}
        />
      )}
      {frame && guideArea ? (
        <GuideMask
          frame={{ ...frame, x: guideArea.x + frame.x, y: guideArea.y + frame.y }}
          muted={full}
        />
      ) : null}

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <ScanTopBar topInset={insets.top} torch={torch && !idle} onToggleTorch={toggleTorch} />

        <View style={styles.guide} pointerEvents="box-none" onLayout={(e) => setGuideArea(e.nativeEvent.layout)}>
          {idle ? <CameraPaused onResume={resumeCamera} /> : null}
          {frame ? (
            <GuideContent
              frame={frame}
              stepText={stepText}
              stepDone={full}
              status={status}
              barcode={session.barcode}
              onRemoveBarcode={removeBarcode}
            />
          ) : null}
          {guideArea && !idle ? (
            <View
              pointerEvents="box-none"
              style={[
                styles.zoomRail,
                {
                  right: Math.max(insets.right, spacing.sm),
                  paddingTop: Math.max(0, zoomOffset),
                  paddingBottom: Math.max(0, -zoomOffset),
                },
              ]}>
              <ZoomControl zoom={zoom} onChange={changeZoom} horizontal={guideArea.height < ZOOM_COLUMN_MIN_HEIGHT} />
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.surfaceContainer,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              paddingTop: spacing.lg,
              paddingBottom: spacing.md,
              paddingLeft: Math.max(insets.left, spacing.lg),
              paddingRight: Math.max(insets.right, spacing.lg),
            },
          ]}>
          <View style={[styles.panelContent, { gap: spacing.md }]}>
            <OfflineBanner />
            {compact ? (
              <CompactGuide
                stepText={stepText}
                stepDone={full}
                status={status}
                barcode={session.barcode}
                onRemoveBarcode={removeBarcode}
              />
            ) : null}
            <View style={[styles.trayRow, { gap: spacing.md }]}>
              <View style={styles.trayStart}>
                {count > 0 || actions.processing ? (
                  <PhotoTray
                    photos={session.photos}
                    processing={actions.processing}
                    onRemove={(id) => {
                      markActive();
                      actions.removePhoto(id);
                    }}
                  />
                ) : (
                  <AppText variant="bodySmall" color="onSurfaceVariant" maxFontSizeMultiplier={TIPS_MAX_FONT_SCALE}>
                    {t.tips}
                  </AppText>
                )}
              </View>
              <Button
                label={analyzeLabel}
                singleLine
                accessibilityLabel={analyzeA11y}
                style={styles.analyze}
                disabled={count === 0 || actions.busy}
                onPress={actions.analyze}
              />
            </View>
            <CaptureControls
              shutterLabel={shutterLabel}
              shutterDisabled={!ready || idle || full || actions.busy}
              processing={actions.processing}
              galleryDisabled={full || actions.busy}
              onShutter={() => {
                markActive();
                void actions.capture(cameraRef.current);
              }}
              onGallery={() => {
                markActive();
                void actions.pickFromGallery();
              }}
              onDocScan={
                actions.docScanAvailable
                  ? () => {
                      markActive();
                      void actions.scanDocument();
                    }
                  : undefined
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/** Shown in the guide area while the camera is stopped for inactivity. */
function CameraPaused({ onResume }: { onResume: () => void }) {
  const { spacing } = useTheme();
  const t = useStrings(scanStrings);
  return (
    <Pressable
      onPress={onResume}
      accessibilityRole="button"
      accessibilityLabel={t.resumeCameraA11y}
      style={[StyleSheet.absoluteFill, styles.paused, { padding: spacing.lg, gap: spacing.sm }]}>
      <Icon name="camera" size={32} color={ON_SCRIM} />
      <AppText variant="titleMedium" align="center" style={styles.onScrim}>
        {t.cameraPaused}
      </AppText>
      <AppText variant="bodyMedium" align="center" style={styles.onScrimMuted}>
        {t.resumeCamera}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  guide: { flex: 1 },
  zoomRail: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' },
  paused: { alignItems: 'center', justifyContent: 'center' },
  onScrim: { color: ON_SCRIM },
  onScrimMuted: { color: ON_SCRIM, opacity: 0.8 },
  panel: { alignItems: 'center' },
  panelContent: { width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  trayRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', minHeight: 56 },
  // Basis = width of three 52dp slots, so the Analyze button wraps (right-aligned) rather than overlapping.
  trayStart: { flexGrow: 1, flexShrink: 1, flexBasis: 172, minWidth: 172 },
  analyze: { marginLeft: 'auto' },
});
