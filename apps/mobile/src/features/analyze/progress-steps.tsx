import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { Card } from '@/components/surfaces';
import { fmt, useStrings } from '@/i18n';
import { useTheme } from '@/theme';

import { PROGRESS_TICK_MS } from './progress-model';
import { analyzeStrings } from './strings';

const TRACK_HEIGHT = 8;
const STEP_ICON = 22;

/** Material 3 determinate linear progress indicator with a percentage label. */
export function ProgressBar({ value }: { value: number }) {
  const { colors, radii, spacing } = useTheme();
  const t = useStrings(analyzeStrings);
  const clamped = Math.max(0, Math.min(1, value));
  const percent = Math.round(clamped * 100);
  const progress = useSharedValue(0);

  useEffect(() => {
    // Slightly longer than a clock tick so the bar glides instead of stepping.
    progress.set(
      withTiming(clamped, { duration: PROGRESS_TICK_MS * 1.6, easing: Easing.linear, reduceMotion: ReduceMotion.System }),
    );
  }, [clamped, progress]);

  const fill = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` as const }));

  return (
    <View style={[styles.barRow, { gap: spacing.md }]}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t.progressLabel}
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={[styles.track, { backgroundColor: colors.surfaceContainerHighest, borderRadius: radii.full }]}>
        <Animated.View style={[styles.fill, { backgroundColor: colors.primary, borderRadius: radii.full }, fill]} />
      </View>
      <AppText
        variant="labelLarge"
        color="onSurfaceVariant"
        importantForAccessibility="no"
        accessibilityElementsHidden
        style={styles.percent}>
        {fmt(t.percent, { percent })}
      </AppText>
    </View>
  );
}

type StepState = 'done' | 'active' | 'pending';

/** Checklist of the analysis stages: done ones are ticked, the current one spins. */
export function StageChecklist({ labels, current }: { labels: readonly string[]; current: number }) {
  const { spacing } = useTheme();
  return (
    <Card accessibilityRole="list" style={{ gap: spacing.xs, paddingVertical: spacing.md }}>
      {labels.map((label, index) => (
        <StageRow
          key={index}
          label={label}
          state={index < current ? 'done' : index === current ? 'active' : 'pending'}
        />
      ))}
    </Card>
  );
}

function StageRow({ label, state }: { label: string; state: StepState }) {
  const { colors, spacing } = useTheme();
  const t = useStrings(analyzeStrings);
  const status = state === 'done' ? t.stepDone : state === 'active' ? t.stepActive : t.stepPending;

  return (
    <View
      accessible
      accessibilityLabel={fmt(t.stepA11y, { step: label, status })}
      accessibilityState={{ busy: state === 'active' }}
      style={[styles.stepRow, { gap: spacing.md, paddingVertical: spacing.xs }]}>
      <View style={styles.stepIcon}>
        {state === 'done' ? (
          <Icon name="checkCircle" size={STEP_ICON} color="primary" />
        ) : state === 'active' ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Icon name="radioUnchecked" size={STEP_ICON} color="outline" />
        )}
      </View>
      <AppText
        variant={state === 'active' ? 'titleSmall' : 'bodyMedium'}
        color={state === 'pending' ? 'onSurfaceVariant' : 'onSurface'}
        style={styles.stepLabel}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  barRow: { flexDirection: 'row', alignItems: 'center' },
  track: { flex: 1, height: TRACK_HEIGHT, overflow: 'hidden' },
  fill: { height: '100%' },
  percent: { minWidth: 44, textAlign: 'right', fontVariant: ['tabular-nums'] },
  stepRow: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
  stepIcon: { width: STEP_ICON + 2, height: STEP_ICON + 2, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { flex: 1 },
});
