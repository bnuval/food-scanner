import { useEffect } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme';

type SkeletonProps = { width?: DimensionValue; height: number; radius?: number; style?: StyleProp<ViewStyle> };

/** Pulsing placeholder block. Static when the system reduce-motion setting is on. */
export function Skeleton({ width = '100%', height, radius, style }: SkeletonProps) {
  const { colors, radii } = useTheme();
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
      undefined,
      ReduceMotion.System,
    );
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius ?? radii.md, backgroundColor: colors.surfaceContainerHighest },
        animated,
        style,
      ]}
    />
  );
}
