import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Skeleton } from '@/components/skeleton';
import { Card } from '@/components/surfaces';
import { useStrings } from '@/i18n';
import { useTheme } from '@/theme';

import { analyzeStrings } from './strings';

/** Placeholder in the shape of the result screen (score ring, verdict, reasons, flags). */
export function ResultSkeleton() {
  const { radii, spacing } = useTheme();
  const t = useStrings(analyzeStrings);

  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ gap: spacing.sm }}>
      <AppText variant="labelLarge" color="onSurfaceVariant">
        {t.previewCaption}
      </AppText>
      <Card variant="outlined" style={{ gap: spacing.lg }}>
        <View style={[styles.row, { gap: spacing.lg }]}>
          <Skeleton width={88} height={88} radius={radii.full} />
          <View style={[styles.fill, { gap: spacing.sm }]}>
            <Skeleton width="75%" height={22} />
            <Skeleton width="45%" height={14} />
            <Skeleton width={96} height={32} radius={radii.full} />
          </View>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Skeleton height={14} />
          <Skeleton width="92%" height={14} />
          <Skeleton width="70%" height={14} />
        </View>
        <View style={{ gap: spacing.sm }}>
          <Skeleton height={56} />
          <Skeleton height={56} />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  fill: { flex: 1 },
});
