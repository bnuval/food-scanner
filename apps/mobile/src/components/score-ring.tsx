import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { fmt, useStrings } from '@/i18n';
import { common } from '@/i18n/common';
import { useTheme } from '@/theme';

import { AppText } from './app-text';
import { bandColor, useBandLabel } from './verdict';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ScoreRingProps = { score: number; size?: number; strokeWidth?: number };

/**
 * 0–100 health score ring that sweeps in on mount (instant when the system "remove
 * animations" setting is on). Exposed to TalkBack as a single "Health score N of 100, band".
 */
export function ScoreRing({ score, size = 148, strokeWidth = 12 }: ScoreRingProps) {
  const { colors, motion } = useTheme();
  const t = useStrings(common);
  const bandLabel = useBandLabel();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(100, score)) / 100, {
      duration: motion.scoreRing,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [score, progress, motion.scoreRing]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.value) }));
  const color = colors[bandColor(score)];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={fmt(t.scoreA11y, { score, band: bandLabel(score) })}
      style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceContainerHighest}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} importantForAccessibility="no-hide-descendants">
        <AppText
          variant="displaySmall"
          maxFontSizeMultiplier={1.3}
          style={{ fontWeight: '700', fontVariant: ['tabular-nums'], lineHeight: size * 0.34, fontSize: size * 0.28 }}>
          {String(score)}
        </AppText>
        <AppText variant="labelMedium" color="onSurfaceVariant" maxFontSizeMultiplier={1.3}>
          {bandLabel(score)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  svg: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
