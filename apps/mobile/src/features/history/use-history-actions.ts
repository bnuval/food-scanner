import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { AccessibilityInfo, Alert } from 'react-native';

import { useShowMessage } from '@/components/alert';
import { fmt, useStrings } from '@/i18n';
import { common } from '@/i18n/common';
import { haptic } from '@/lib/haptics';
import { clearHistory, deleteScan, type ScanSummary } from '@/lib/history';
import { log } from '@/lib/log';
import { historyKeys } from '@/lib/query-keys';

import { historyStrings } from './strings';

/** Delete / clear actions for scan history, with confirmations and cache updates. */
export function useHistoryActions() {
  const queryClient = useQueryClient();
  const t = useStrings(historyStrings);
  const tc = useStrings(common);
  const showMessage = useShowMessage();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: historyKeys.all });

  /** Deletes immediately (the swipe-and-tap gesture is already a deliberate two-step action). */
  const deleteNow = async (scan: ScanSummary) => {
    // An in-flight read (tab focus, a previous delete) would otherwise land after the
    // optimistic update below and bring the deleted row back.
    await queryClient.cancelQueries({ queryKey: historyKeys.all });
    // Drop the row from every cached list right away so the list reacts instantly.
    queryClient.setQueriesData<ScanSummary[]>(
      { queryKey: historyKeys.all, predicate: (query) => query.queryKey[1] === 'list' },
      (rows) => rows?.filter((row) => row.id !== scan.id),
    );
    queryClient.setQueryData<number>(historyKeys.count(), (n) => (typeof n === 'number' ? Math.max(0, n - 1) : n));
    try {
      await deleteScan(scan.id);
      haptic('success');
      AccessibilityInfo.announceForAccessibility(t.deleted);
    } catch (error) {
      log.warn('Could not delete scan', error);
      haptic('error');
      showMessage(t.deleteFailed);
    } finally {
      await invalidate();
    }
  };

  const confirmDelete = (scan: ScanSummary) => {
    const name = scan.productName.trim() || t.untitled;
    Alert.alert(
      t.deleteTitle,
      fmt(t.deleteMessage, { name }),
      [
        { text: tc.cancel, style: 'cancel' },
        { text: tc.delete, style: 'destructive', onPress: () => void deleteNow(scan) },
      ],
      { cancelable: true },
    );
  };

  /**
   * Asks for confirmation, clears everything, then calls `onCleared` on success. Pass
   * `announce: false` when the caller shows its own live-region confirmation.
   */
  const confirmClearAll = ({ onCleared, announce = true }: { onCleared?: () => void; announce?: boolean } = {}) => {
    const run = async () => {
      try {
        await clearHistory();
        haptic('success');
        if (announce) AccessibilityInfo.announceForAccessibility(t.cleared);
        onCleared?.();
      } catch (error) {
        log.warn('Could not clear history', error);
        haptic('error');
        showMessage(t.clearFailed);
      } finally {
        await invalidate();
      }
    };
    Alert.alert(
      t.clearTitle,
      t.clearMessage,
      [
        { text: tc.cancel, style: 'cancel' },
        { text: t.clearConfirm, style: 'destructive', onPress: () => void run() },
      ],
      { cancelable: true },
    );
  };

  return { deleteNow, confirmDelete, confirmClearAll };
}

/**
 * Re-reads local history when a tab regains focus (tab screens stay mounted, and a scan
 * may have been saved elsewhere meanwhile). Skips the first focus: the queries just loaded.
 */
export function useRefreshHistoryOnFocus() {
  const queryClient = useQueryClient();
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void queryClient.invalidateQueries({ queryKey: historyKeys.all });
    }, [queryClient]),
  );
}
