import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Skeleton } from '@/components/skeleton';
import { Banner } from '@/components/surfaces';
import { useStrings } from '@/i18n';
import { common } from '@/i18n/common';
import { MAX_CONTENT_WIDTH, useTheme } from '@/theme';

import { historyStrings } from './strings';

/** First-run state: nothing has been scanned on this device yet. */
export function HistoryEmpty({ onScan }: { onScan: () => void }) {
  const { colors, spacing } = useTheme();
  const t = useStrings(historyStrings);
  return (
    <View style={[styles.center, { padding: spacing.xl, gap: spacing.lg }]}>
      <View style={[styles.badge, { backgroundColor: colors.secondaryContainer }]}>
        <Icon name="history" size={48} color="onSecondaryContainer" />
      </View>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="titleLarge" align="center" accessibilityRole="header">
          {t.emptyTitle}
        </AppText>
        <AppText variant="bodyMedium" color="onSurfaceVariant" align="center">
          {t.emptyBody}
        </AppText>
      </View>
      <Button label={t.emptyAction} icon="camera" onPress={onScan} />
    </View>
  );
}

/** A filter chip is active but no scan matches it. */
export function HistoryFilteredEmpty({ message, onShowAll }: { message: string; onShowAll: () => void }) {
  const { spacing } = useTheme();
  const t = useStrings(historyStrings);
  return (
    <View accessibilityLiveRegion="polite" style={[styles.center, { padding: spacing.xl, gap: spacing.md }]}>
      <Icon name="search" size={40} color="onSurfaceVariant" />
      <AppText variant="bodyLarge" color="onSurfaceVariant" align="center">
        {message}
      </AppText>
      <Button label={t.showAll} variant="text" onPress={onShowAll} />
    </View>
  );
}

export function HistoryError({ onRetry }: { onRetry: () => void }) {
  const { spacing } = useTheme();
  const t = useStrings(historyStrings);
  const tc = useStrings(common);
  return (
    <View style={[styles.column, { paddingHorizontal: spacing.lg, paddingTop: spacing.lg }]}>
      <Banner
        tone="error"
        message={t.loadFailed}
        action={<Button label={tc.retry} variant="text" icon="refresh" onPress={onRetry} />}
      />
    </View>
  );
}

/** Placeholder rows. Waits briefly before appearing so fast local reads don't flash. */
export function HistorySkeleton({ rows = 5 }: { rows?: number }) {
  const { radii, spacing } = useTheme();
  const t = useStrings(historyStrings);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t.loading}
      accessibilityState={{ busy: true }}
      style={styles.column}>
      {visible
        ? Array.from({ length: rows }, (_, i) => (
            <View
              key={i}
              style={[styles.row, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.lg }]}>
              <Skeleton width={56} height={56} radius={radii.md} />
              <View style={[styles.fill, { gap: spacing.sm }]}>
                <Skeleton height={16} width="70%" radius={radii.xs} />
                <Skeleton height={14} width="40%" radius={radii.xs} />
                <Skeleton height={26} width={128} radius={radii.full} />
              </View>
            </View>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  badge: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
});
