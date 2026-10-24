import { useRecyclingState } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View, type AccessibilityActionEvent } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { ScoreBadge, useBandLabel, VerdictPill } from '@/components/verdict';
import { fmt, useStrings } from '@/i18n';
import { common } from '@/i18n/common';
import { haptic } from '@/lib/haptics';
import type { ScanSummary } from '@/lib/history';
import { useSettings } from '@/state/settings';
import { MAX_CONTENT_WIDTH, MIN_TOUCH, useTheme } from '@/theme';

import { formatScanDate } from './format-date';
import { historyStrings } from './strings';

const THUMB = 56;
const ACTION_WIDTH = 96;

type HistoryRowProps = {
  scan: ScanSummary;
  onOpen: (scan: ScanSummary) => void;
  /** Swipe action: deletes without a second confirmation. */
  onDelete: (scan: ScanSummary) => void;
  /** Long press / TalkBack action: asks first. */
  onConfirmDelete: (scan: ScanSummary) => void;
  /** Start of the current local day (useCalendarDay), so "Today"/"Yesterday" roll over at midnight. */
  today: number;
};

/** One saved scan. Swipe left to reveal Delete; long press or the TalkBack action asks first. */
export function HistoryRow({ scan, onOpen, onDelete, onConfirmDelete, today }: HistoryRowProps) {
  const { colors, spacing } = useTheme();
  const t = useStrings(historyStrings);
  const tc = useStrings(common);
  const { lang } = useSettings();
  const bandLabel = useBandLabel();
  const swipeRef = useRef<SwipeableMethods>(null);

  // FlashList recycles this component for other scans: a recycled row must never stay
  // swiped open.
  useEffect(() => {
    swipeRef.current?.reset();
  }, [scan.id]);

  const name = scan.productName.trim() || t.untitled;
  const brand = scan.brand.trim();
  const date = formatScanDate(scan.createdAt, lang, t, today);
  const verdict = scan.verdict === 'BUY' ? tc.verdictBuy : tc.verdictAvoid;
  const a11yLabel = [
    name,
    brand,
    fmt(tc.scoreA11y, { score: scan.score, band: bandLabel(scan.score) }),
    fmt(t.verdictA11y, { verdict }),
    fmt(t.scannedA11y, { date }),
  ]
    .filter(Boolean)
    .join(', ');

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'delete') onConfirmDelete(scan);
  };

  return (
    <View style={styles.column}>
      <ReanimatedSwipeable
        ref={swipeRef}
        friction={1.4}
        rightThreshold={ACTION_WIDTH / 2}
        overshootRight={false}
        onSwipeableWillOpen={() => haptic('tick')}
        renderRightActions={(progress, _translation, methods) => (
          <DeleteAction
            progress={progress}
            label={t.deleteAction}
            onPress={() => {
              methods.close();
              onDelete(scan);
            }}
          />
        )}
        childrenContainerStyle={{ backgroundColor: colors.background }}>
        <Pressable
          onPress={() => onOpen(scan)}
          onLongPress={() => {
            haptic('tick');
            onConfirmDelete(scan);
          }}
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          accessibilityHint={t.rowHint}
          accessibilityActions={[{ name: 'delete', label: tc.delete }]}
          onAccessibilityAction={onAccessibilityAction}
          android_ripple={{ color: `${colors.onSurface}1F` }}
          style={[styles.row, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.lg }]}>
          <Thumbnail scan={scan} />
          <View style={[styles.body, { gap: spacing.xxs }]}>
            <AppText variant="titleSmall" numberOfLines={2}>
              {name}
            </AppText>
            {brand ? (
              <AppText variant="bodyMedium" color="onSurfaceVariant" numberOfLines={1}>
                {brand}
              </AppText>
            ) : null}
            {/* Already part of the row's label; hidden so TalkBack doesn't stop on each badge. */}
            <View
              importantForAccessibility="no-hide-descendants"
              style={[styles.meta, { gap: spacing.sm, marginTop: spacing.xs }]}>
              <ScoreBadge score={scan.score} />
              <VerdictPill verdict={scan.verdict} size="small" />
              <AppText variant="bodySmall" color="onSurfaceVariant" style={styles.date}>
                {date}
              </AppText>
            </View>
          </View>
        </Pressable>
      </ReanimatedSwipeable>
    </View>
  );
}

function Thumbnail({ scan }: { scan: ScanSummary }) {
  const { colors, radii } = useTheme();
  const [failed, setFailed] = useRecyclingState(false, [scan.id]);
  const showImage = scan.thumbUri !== null && !failed;
  return (
    <View style={[styles.thumb, { borderRadius: radii.md, backgroundColor: colors.surfaceContainerHighest }]}>
      {showImage ? (
        <Image
          source={{ uri: scan.thumbUri ?? undefined }}
          recyclingKey={scan.id}
          // Local files: a disk-cache copy would outlive Delete and Clear history.
          cachePolicy="memory"
          contentFit="cover"
          transition={{ duration: 150, skipOnCacheHit: 'all' }}
          onError={() => setFailed(true)}
          accessible={false}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <Icon name="image" size={28} color="onSurfaceVariant" />
      )}
    </View>
  );
}

type DeleteActionProps = { progress: SharedValue<number>; label: string; onPress: () => void };

/** Revealed behind the row on swipe. Hidden from TalkBack, which uses the row's Delete action. */
function DeleteAction({ progress, label, onPress }: DeleteActionProps) {
  const { colors, spacing } = useTheme();
  const contentStyle = useAnimatedStyle(() => {
    const p = Math.min(Math.max(progress.value, 0), 1);
    return { opacity: p, transform: [{ scale: 0.7 + 0.3 * p }] };
  });
  return (
    <View importantForAccessibility="no-hide-descendants" style={[styles.action, { backgroundColor: colors.error }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        android_ripple={{ color: `${colors.onError}33` }}
        style={styles.actionPress}>
        <Animated.View style={[styles.actionContent, { gap: spacing.xs }, contentStyle]}>
          <Icon name="delete" size={24} color="onError" />
          <AppText variant="labelMedium" color="onError" numberOfLines={1}>
            {label}
          </AppText>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start', minHeight: MIN_TOUCH },
  body: { flex: 1, minWidth: 0 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  date: { marginLeft: 'auto' },
  thumb: { width: THUMB, height: THUMB, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  action: { width: ACTION_WIDTH },
  actionPress: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actionContent: { alignItems: 'center' },
});
