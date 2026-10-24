import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/button';
import { ScreenHeader } from '@/components/screen';
import { Chip } from '@/components/surfaces';
import { HistoryRow } from '@/features/history/history-row';
import { HistoryEmpty, HistoryError, HistoryFilteredEmpty, HistorySkeleton } from '@/features/history/history-states';
import { historyStrings } from '@/features/history/strings';
import { useCalendarDay } from '@/features/history/use-calendar-day';
import { useHistoryActions, useRefreshHistoryOnFocus } from '@/features/history/use-history-actions';
import { fmt, useStrings } from '@/i18n';
import { common } from '@/i18n/common';
import { haptic } from '@/lib/haptics';
import { countScans, listScans, type HistoryFilter, type ScanSummary } from '@/lib/history';
import { historyKeys } from '@/lib/query-keys';
import { MAX_CONTENT_WIDTH, useTheme } from '@/theme';

const FILTERS: HistoryFilter[] = ['all', 'buy', 'avoid'];

function matchesFilter(scan: ScanSummary, filter: HistoryFilter): boolean {
  return filter === 'all' || scan.verdict === (filter === 'buy' ? 'BUY' : 'AVOID');
}

export default function HistoryScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useStrings(historyStrings);
  const tc = useStrings(common);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const listRef = useRef<FlashListRef<ScanSummary>>(null);
  const { deleteNow, confirmDelete, confirmClearAll } = useHistoryActions();
  // Rows say "Today"/"Yesterday": re-render them when the date changes.
  const today = useCalendarDay();

  const list = useQuery({
    queryKey: historyKeys.list(filter),
    queryFn: () => listScans(filter),
    // While a newly selected filter loads, narrow the rows already on screen instead of
    // flashing a skeleton (exact for All → Buy/Avoid, a subset for the other directions).
    placeholderData: (previous) => previous?.filter((scan) => matchesFilter(scan, filter)),
  });
  const count = useQuery({ queryKey: historyKeys.count(), queryFn: countScans });
  useRefreshHistoryOnFocus();

  const rows = list.data;
  const total = count.data ?? (filter === 'all' && !list.isPlaceholderData ? rows?.length : undefined);
  const noScans =
    count.data === 0 || (filter === 'all' && rows !== undefined && rows.length === 0 && !list.isPlaceholderData);

  const labels: Record<HistoryFilter, string> = { all: t.filterAll, buy: tc.verdictBuy, avoid: tc.verdictAvoid };

  const selectFilter = (next: HistoryFilter) => {
    if (next === filter) return;
    haptic('tick');
    setFilter(next);
    void listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const openScan = (scan: ScanSummary) => {
    router.push({ pathname: '/result/[id]', params: { id: scan.id } });
  };

  const sidePadding = {
    paddingLeft: Math.max(insets.left, spacing.lg),
    paddingRight: Math.max(insets.right, spacing.lg),
  };

  let content: ReactNode;
  if (rows === undefined) {
    content = list.isError ? <HistoryError onRetry={() => void list.refetch()} /> : <HistorySkeleton />;
  } else if (noScans) {
    content = <HistoryEmpty onScan={() => router.navigate('/')} />;
  } else if (rows.length === 0) {
    content = list.isPlaceholderData ? null : (
      <HistoryFilteredEmpty
        message={filter === 'buy' ? t.filteredEmptyBuy : t.filteredEmptyAvoid}
        onShowAll={() => selectFilter('all')}
      />
    );
  } else {
    content = (
      <FlashList
        ref={listRef}
        data={rows}
        keyExtractor={(item) => item.id}
        extraData={today}
        renderItem={({ item }) => (
          <HistoryRow
            scan={item}
            today={today}
            onOpen={openScan}
            onDelete={deleteNow}
            onConfirmDelete={confirmDelete}
          />
        )}
        ItemSeparatorComponent={RowDivider}
        // Newest scans are inserted at the top; keep them visible instead of anchoring.
        maintainVisibleContentPosition={{ disabled: true }}
        contentContainerStyle={{ paddingLeft: insets.left, paddingRight: insets.right, paddingBottom: spacing.xl }}
      />
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={[styles.column, sidePadding, { paddingTop: insets.top + spacing.sm, paddingBottom: spacing.sm }]}>
        <ScreenHeader
          title={tc.tabHistory}
          subtitle={total ? (total === 1 ? t.countOne : fmt(t.countOther, { count: total })) : undefined}
          trailing={
            total ? (
              <IconButton
                icon="delete"
                accessibilityLabel={t.clearAll}
                onPress={() => confirmClearAll({ onCleared: () => setFilter('all') })}
              />
            ) : null
          }
        />
        {rows !== undefined && !noScans ? (
          <View style={[styles.chips, { gap: spacing.sm, paddingTop: spacing.md }]}>
            {FILTERS.map((value) => (
              <Chip
                key={value}
                label={labels[value]}
                selected={filter === value}
                accessibilityLabel={fmt(t.filterA11y, { filter: labels[value] })}
                onPress={() => selectFilter(value)}
              />
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.fill}>{content}</View>
    </View>
  );
}

function RowDivider() {
  const { colors, spacing } = useTheme();
  return (
    <View style={styles.column}>
      <View
        style={{
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.outlineVariant,
          marginLeft: spacing.lg * 2 + 56,
          marginRight: spacing.lg,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
});
