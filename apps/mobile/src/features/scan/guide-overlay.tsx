import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { fmt, useStrings } from '@/i18n';
import { MIN_TOUCH, useTheme } from '@/theme';

import { ON_SCRIM, ON_SCRIM_RIPPLE, SCRIM_STRONG, spellDigits } from './helpers';
import { scanStrings } from './strings';

export type FrameRect = { x: number; y: number; width: number; height: number };

const FRAME_ASPECT = 5 / 4; // height / width (portrait label, 4:5)
const FRAME_WIDTH_RATIO = 0.84;
const MAX_FRAME_WIDTH = 480;
const FRAME_RADIUS = 20;
const MASK_OPACITY = 0.55;

/**
 * Frame position inside the guide area, leaving room above it for the step chip and below
 * it for the status pill (scaled with the system font size so text never overlaps the frame).
 */
export function computeFrame(area: { width: number; height: number }, fontScale: number): FrameRect | null {
  const above = Math.ceil(44 * fontScale) + 16;
  const below = Math.ceil(64 * fontScale) + 16;
  const available = area.height - above - below;
  if (available < 96 || area.width < 96) return null;
  const width = Math.min(area.width * FRAME_WIDTH_RATIO, MAX_FRAME_WIDTH, available / FRAME_ASPECT);
  const height = width * FRAME_ASPECT;
  return { x: (area.width - width) / 2, y: above + (available - height) / 2, width, height };
}

function roundedRect({ x, y, width: w, height: h }: FrameRect, r: number): string {
  return (
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}` +
    `A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
}

function cornerBrackets({ x, y, width: w, height: h }: FrameRect, r: number): string {
  const l = Math.min(40, w / 4, h / 4);
  return [
    `M${x} ${y + l}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}H${x + l}`,
    `M${x + w - l} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + l}`,
    `M${x + w} ${y + h - l}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + w - l}`,
    `M${x + l} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + h - l}`,
  ].join('');
}

/**
 * Dims everything outside the rounded guide frame and draws its corner brackets. `frame` is
 * in the coordinates of the full-screen layer this is rendered in.
 */
export function GuideMask({ frame, muted }: { frame: FrameRect; muted: boolean }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%">
        <Path
          d={`M-8 -8H20000V20000H-8Z${roundedRect(frame, FRAME_RADIUS)}`}
          fill="#000000"
          fillOpacity={MASK_OPACITY}
          fillRule="evenodd"
        />
        <Path d={roundedRect(frame, FRAME_RADIUS)} fill="none" stroke={ON_SCRIM} strokeOpacity={0.35} strokeWidth={1.5} />
        <Path
          d={cornerBrackets(frame, FRAME_RADIUS)}
          fill="none"
          stroke={ON_SCRIM}
          strokeOpacity={muted ? 0.5 : 1}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

export type GuideStatus = { kind: 'hint' | 'full' | 'processing' | 'error' | 'info'; text: string };

type GuideContentProps = {
  /** Frame in the guide area's own coordinates. */
  frame: FrameRect;
  stepText: string;
  stepDone: boolean;
  status: GuideStatus;
  barcode: string | null;
  onRemoveBarcode: () => void;
};

/** Text around the guide frame: step chip above, detected barcode inside, status pill below. */
export function GuideContent({ frame, stepText, stepDone, status, barcode, onRemoveBarcode }: GuideContentProps) {
  const { spacing } = useTheme();
  const isError = status.kind === 'error';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View
        pointerEvents="none"
        accessibilityLiveRegion="polite"
        style={[styles.above, { height: Math.max(0, frame.y - spacing.md), paddingHorizontal: spacing.lg }]}>
        <ScrimPill icon={stepDone ? 'checkCircle' : 'camera'} text={stepText} />
      </View>

      <View
        pointerEvents="box-none"
        accessibilityLiveRegion="polite"
        style={[styles.inside, { top: frame.y + spacing.md, left: frame.x + spacing.sm, width: frame.width - spacing.lg }]}>
        {barcode ? <BarcodeChip code={barcode} onRemove={onRemoveBarcode} /> : null}
      </View>

      <View
        pointerEvents="none"
        // The steady-state hint is not re-announced after every capture; changes to it are.
        accessibilityLiveRegion={isError ? 'assertive' : status.kind === 'hint' ? 'none' : 'polite'}
        style={[styles.below, { top: frame.y + frame.height + spacing.md, paddingHorizontal: spacing.lg }]}>
        <StatusPill status={status} />
      </View>
    </View>
  );
}

type CompactGuideProps = Omit<GuideContentProps, 'frame'>;

/**
 * The same step, status and barcode as GuideContent, stacked for the capture panel. Used
 * when the guide frame does not fit (large font sizes) or the camera is paused, so errors
 * and the detected barcode never disappear. The live regions stay mounted while it is shown.
 */
export function CompactGuide({ stepText, stepDone, status, barcode, onRemoveBarcode }: CompactGuideProps) {
  const { spacing } = useTheme();
  const isError = status.kind === 'error';
  // The steady-state hint is about the frame, which is not drawn in this layout.
  const showStatus = status.kind !== 'hint';
  return (
    <View>
      <View accessibilityLiveRegion="polite" style={[styles.compactRow, { gap: spacing.sm }]}>
        <Icon name={stepDone ? 'checkCircle' : 'camera'} size={18} color="onSurfaceVariant" />
        <AppText variant="labelLarge" color="onSurfaceVariant" style={styles.shrink}>
          {stepText}
        </AppText>
      </View>
      <View
        accessibilityLiveRegion={isError ? 'assertive' : 'polite'}
        style={[styles.compactItem, { marginTop: showStatus ? spacing.sm : 0 }]}>
        {showStatus ? <StatusPill status={status} onSurface /> : null}
      </View>
      <View accessibilityLiveRegion="polite" style={[styles.compactItem, { marginTop: barcode ? spacing.sm : 0 }]}>
        {barcode ? <BarcodeChip code={barcode} onRemove={onRemoveBarcode} /> : null}
      </View>
    </View>
  );
}

function ScrimPill({ icon, text }: { icon: IconName; text: string }) {
  const { radii, spacing } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: SCRIM_STRONG, borderRadius: radii.full, gap: spacing.sm }]}>
      <Icon name={icon} size={18} color={ON_SCRIM} />
      <AppText variant="labelLarge" style={styles.onScrimText} align="center">
        {text}
      </AppText>
    </View>
  );
}

/** `onSurface`: themed colours for the capture panel instead of the over-camera scrim. */
function StatusPill({ status, onSurface = false }: { status: GuideStatus; onSurface?: boolean }) {
  const { colors, radii, spacing } = useTheme();
  if (status.kind === 'error') {
    return (
      <View
        accessibilityRole="alert"
        style={[styles.pill, { backgroundColor: colors.errorContainer, borderRadius: radii.lg, gap: spacing.sm }]}>
        <Icon name="warning" size={18} color="onErrorContainer" />
        <AppText variant="labelLarge" color="onErrorContainer" style={styles.shrink}>
          {status.text}
        </AppText>
      </View>
    );
  }
  const fg = onSurface ? colors.onSurfaceVariant : ON_SCRIM;
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: onSurface ? colors.surfaceContainerHighest : SCRIM_STRONG,
          borderRadius: radii.lg,
          gap: spacing.sm,
        },
      ]}>
      {status.kind === 'processing' ? (
        <ActivityIndicator size="small" color={onSurface ? colors.primary : ON_SCRIM} />
      ) : (
        <Icon name={status.kind === 'full' || status.kind === 'info' ? 'info' : 'cropFree'} size={18} color={fg} />
      )}
      <AppText variant="labelLarge" style={[styles.shrink, { color: fg }]} align={onSurface ? undefined : 'center'}>
        {status.text}
      </AppText>
    </View>
  );
}

function BarcodeChip({ code, onRemove }: { code: string; onRemove: () => void }) {
  const { colors, radii, spacing } = useTheme();
  const t = useStrings(scanStrings);
  return (
    <View
      style={[
        styles.barcodeChip,
        { backgroundColor: colors.primaryContainer, borderRadius: radii.full, paddingLeft: spacing.md, gap: spacing.sm },
      ]}>
      <Icon name="barcode" size={18} color="onPrimaryContainer" />
      <AppText
        variant="labelLarge"
        color="onPrimaryContainer"
        numberOfLines={1}
        ellipsizeMode="middle"
        style={styles.shrink}
        accessibilityLabel={fmt(t.barcodeDetected, { code: spellDigits(code) })}>
        {fmt(t.barcodeDetected, { code })}
      </AppText>
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={t.barcodeRemove}
        android_ripple={{ color: ON_SCRIM_RIPPLE, borderless: true, radius: 22 }}
        style={styles.barcodeRemove}>
        <Icon name="close" size={18} color="onPrimaryContainer" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  above: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'flex-end' },
  inside: { position: 'absolute', alignItems: 'center' },
  below: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    minHeight: 32,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  onScrimText: { color: ON_SCRIM, flexShrink: 1 },
  shrink: { flexShrink: 1 },
  compactRow: { flexDirection: 'row', alignItems: 'center' },
  compactItem: { alignItems: 'flex-start' },
  barcodeChip: { flexDirection: 'row', alignItems: 'center', maxWidth: '100%', minHeight: MIN_TOUCH },
  barcodeRemove: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
