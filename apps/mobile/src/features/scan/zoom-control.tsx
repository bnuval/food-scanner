import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useStrings } from '@/i18n';
import { MIN_TOUCH, useTheme } from '@/theme';

import { ON_SCRIM, ON_SCRIM_RIPPLE, SCRIM, stepZoom } from './helpers';
import { scanStrings } from './strings';

// Material Icons "add" / "remove" (Apache License 2.0); the shared icon set has no minus.
const PLUS = 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z';
const MINUS = 'M19 13H5v-2h14v2z';

type ZoomControlProps = {
  /** CameraView zoom, 0..1. */
  zoom: number;
  onChange: (zoom: number) => void;
  /** A row instead of a column, for short guide areas (large font sizes). */
  horizontal: boolean;
};

/**
 * Zoom in / out buttons drawn over the preview: the single-tap alternative to pinch
 * (WCAG 2.5.1) that also works with TalkBack and Switch Access. Shares zoom with the pinch.
 */
export function ZoomControl({ zoom, onChange, horizontal }: ZoomControlProps) {
  const { radii, spacing } = useTheme();
  const t = useStrings(scanStrings);
  const zoomIn = (
    <ZoomButton key="in" path={PLUS} label={t.zoomIn} disabled={zoom >= 1} onPress={() => onChange(stepZoom(zoom, 1))} />
  );
  const zoomOut = (
    <ZoomButton key="out" path={MINUS} label={t.zoomOut} disabled={zoom <= 0} onPress={() => onChange(stepZoom(zoom, -1))} />
  );
  return (
    <View
      style={[
        styles.pill,
        { flexDirection: horizontal ? 'row' : 'column', borderRadius: radii.full, padding: spacing.xs, gap: spacing.xs },
      ]}>
      {horizontal ? [zoomOut, zoomIn] : [zoomIn, zoomOut]}
    </View>
  );
}

type ZoomButtonProps = { path: string; label: string; disabled: boolean; onPress: () => void };

function ZoomButton({ path, label, disabled, onPress }: ZoomButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      android_ripple={{ color: ON_SCRIM_RIPPLE, borderless: true, radius: MIN_TOUCH / 2 }}
      style={[styles.button, { opacity: disabled ? 0.4 : 1 }]}>
      <Svg width={24} height={24} viewBox="0 0 24 24" accessible={false} importantForAccessibility="no">
        <Path d={path} fill={ON_SCRIM} />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { backgroundColor: SCRIM, alignItems: 'center' },
  button: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
