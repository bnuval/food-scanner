import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { fmt, useStrings } from '@/i18n';
import { MAX_PHOTOS } from '@/shared/api-schema';
import type { SessionPhoto } from '@/state/scan-session';
import { MAX_CONTENT_WIDTH, useTheme } from '@/theme';

import { analyzeStrings } from './strings';

const GAP = 12;
const MAX_THUMB_WIDTH = 104;
/** Height of the glowing band around the scan line. */
const BAND = 48;
const SWEEP_MS = 1600;

/**
 * The photos being analysed, with a scan line sweeping over them in sync. The sweep is
 * left out entirely when the system "remove animations" setting is on.
 */
export function ScanningThumbnails({ photos }: { photos: readonly SessionPhoto[] }) {
  const { colors, radii, spacing, dark } = useTheme();
  const t = useStrings(analyzeStrings);
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const sweep = useSharedValue(0);

  // Always sized for three slots so the row looks the same whatever the photo count.
  const available = Math.min(width, MAX_CONTENT_WIDTH) - spacing.lg * 2;
  const thumbWidth = Math.floor(Math.min(MAX_THUMB_WIDTH, (available - GAP * (MAX_PHOTOS - 1)) / MAX_PHOTOS));
  const thumbHeight = Math.round((thumbWidth * 4) / 3);
  // A bright mint reads well over photos in both themes.
  const beam = dark ? colors.primary : colors.primaryContainer;

  useEffect(() => {
    if (reduceMotion) return;
    sweep.set(
      withRepeat(
        withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
        undefined,
        ReduceMotion.System,
      ),
    );
    return () => cancelAnimation(sweep);
  }, [sweep, reduceMotion]);

  const label = photos.length === 1 ? t.photosA11yOne : fmt(t.photosA11yMany, { count: photos.length });

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={[styles.row, { gap: GAP }]}>
      {photos.map((photo) => (
        <View
          key={photo.id}
          style={[
            styles.thumb,
            {
              width: thumbWidth,
              height: thumbHeight,
              borderRadius: radii.md,
              backgroundColor: colors.surfaceContainerHighest,
              borderColor: colors.outlineVariant,
            },
          ]}>
          <Image
            source={{ uri: photo.uri }}
            contentFit="cover"
            cachePolicy="memory"
            transition={150}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, styles.dim, { backgroundColor: colors.scrim }]} />
          {reduceMotion ? null : <ScanBeam sweep={sweep} width={thumbWidth} height={thumbHeight} color={beam} />}
        </View>
      ))}
    </View>
  );
}

function ScanBeam({ sweep, width, height, color }: { sweep: SharedValue<number>; width: number; height: number; color: string }) {
  // The line sits in the middle of the band and travels from the top edge to the bottom edge.
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -BAND / 2 + sweep.get() * height }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.beam, style]}>
      <Svg width={width} height={BAND}>
        <Defs>
          <LinearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0} />
            <Stop offset="0.5" stopColor={color} stopOpacity={0.45} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={BAND} fill="url(#beam)" />
        <Rect x={0} y={BAND / 2 - 1} width={width} height={2} fill={color} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center' },
  thumb: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  dim: { opacity: 0.12 },
  beam: { position: 'absolute', top: 0, left: 0, height: BAND },
});
