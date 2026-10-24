import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/skeleton';
import { Card } from '@/components/surfaces';
import { useStrings } from '@/i18n';
import { useTheme } from '@/theme';

import { resultStrings } from './strings';

/** Placeholder shaped like the hero card and the first two sections. */
export function ResultSkeleton() {
  const { radii, spacing } = useTheme();
  const t = useStrings(resultStrings);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t.loading}
      accessibilityState={{ busy: true }}
      style={{ gap: spacing.lg }}>
      <Card>
        <View style={[styles.row, { gap: spacing.lg }]}>
          <Skeleton width={72} height={72} />
          <View style={[styles.fill, { gap: spacing.sm }]}>
            <Skeleton width="35%" height={14} radius={radii.xs} />
            <Skeleton width="85%" height={24} radius={radii.xs} />
            <Skeleton width="60%" height={12} radius={radii.xs} />
          </View>
        </View>
        <View style={[styles.center, { gap: spacing.lg, marginTop: spacing.xl }]}>
          <Skeleton width={148} height={148} radius={74} />
          <Skeleton width={128} height={44} radius={radii.full} />
        </View>
      </Card>
      <Section />
      <Section />
    </View>
  );
}

function Section() {
  const { radii, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      <Skeleton width="50%" height={20} radius={radii.xs} />
      <Card style={{ gap: spacing.sm }}>
        <Skeleton height={14} radius={radii.xs} />
        <Skeleton height={14} radius={radii.xs} />
        <Skeleton width="70%" height={14} radius={radii.xs} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center' },
});
