import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';

import { useShowMessage } from '@/components/alert';
import { AppText } from '@/components/app-text';
import { Button, IconButton } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { buildShareMessage, pickText, productLabel } from '@/features/result/format';
import { ResultSkeleton } from '@/features/result/result-skeleton';
import { hasHindiText, ResultView } from '@/features/result/result-view';
import { resultStrings } from '@/features/result/strings';
import { useStrings, type Lang } from '@/i18n';
import { common } from '@/i18n/common';
import { haptic } from '@/lib/haptics';
import { deleteScan, getScan, type ScanRecord } from '@/lib/history';
import { log } from '@/lib/log';
import { historyKeys } from '@/lib/query-keys';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme';

export default function ResultScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const t = useStrings(resultStrings);
  const c = useStrings(common);
  const { lang } = useSettings();
  const queryClient = useQueryClient();
  const showMessage = useShowMessage();
  // null = follow the app language until the user picks one with the toggle.
  const [langOverride, setLangOverride] = useState<Lang | null>(null);

  const query = useQuery({
    queryKey: historyKeys.detail(id),
    queryFn: () => getScan(id),
    enabled: id.length > 0,
  });
  const record = query.data ?? null;

  const remove = useMutation({
    mutationFn: () => deleteScan(id),
    onSuccess: () => {
      // Keep this screen's own entry so it doesn't flash "not found" while popping;
      // it is dropped on unmount (below).
      void queryClient.invalidateQueries({
        queryKey: historyKeys.all,
        predicate: (q) => !isDetailKey(q.queryKey, id),
      });
      if (router.canGoBack()) router.back();
      else router.replace('/');
    },
    onError: (error) => {
      log.warn('Delete scan failed', error);
      haptic('error');
      showMessage(t.deleteFailed);
    },
  });

  const deleted = remove.isSuccess;
  useEffect(() => {
    if (!deleted) return;
    return () => queryClient.removeQueries({ queryKey: historyKeys.detail(id), exact: true });
  }, [deleted, queryClient, id]);

  const bilingual = record !== null && hasHindiText(record);
  const textLang: Lang = bilingual ? (langOverride ?? lang) : 'en';

  const share = async (scan: ScanRecord) => {
    const { result } = scan;
    const message = buildShareMessage(t, {
      name: productLabel(result.brandName, result.productName) || t.productFallback,
      score: result.healthScore,
      verdict: result.verdict === 'BUY' ? c.verdictBuy : c.verdictAvoid,
      reason: pickText(result.primaryReason, result.primaryReasonHindi, textLang),
      appName: c.appName,
    });
    try {
      await Share.share({ message }, { dialogTitle: c.share });
    } catch (error) {
      log.warn('Share failed', error);
    }
  };

  const confirmDelete = () => {
    Alert.alert(t.deleteTitle, t.deleteMessage, [
      { text: c.cancel, style: 'cancel' },
      { text: c.delete, style: 'destructive', onPress: () => remove.mutate() },
    ]);
  };

  // Scan tab: pop back to the existing tabs route (and select Scan) rather than stacking a second one.
  const goToScan = () => router.dismissTo('/');

  const header = (
    <Stack.Screen
      options={{
        title: record?.result.brandName || t.title,
        headerRight: record
          ? () => (
              <View style={styles.headerActions}>
                <IconButton icon="share" accessibilityLabel={t.shareA11y} onPress={() => void share(record)} />
                <IconButton
                  icon="delete"
                  accessibilityLabel={t.deleteA11y}
                  disabled={remove.isPending || deleted}
                  onPress={confirmDelete}
                />
              </View>
            )
          : undefined,
      }}
    />
  );

  if (!id || query.data === null) {
    return (
      <>
        {header}
        <Message
          icon="history"
          title={t.notFoundTitle}
          body={t.notFoundBody}
          action={<Button label={t.scanProduct} icon="camera" onPress={goToScan} />}
        />
      </>
    );
  }

  if (query.isError) {
    return (
      <>
        {header}
        <Message
          icon="warning"
          title={t.loadErrorTitle}
          body={t.loadErrorBody}
          action={
            <>
              <Button label={c.retry} icon="refresh" onPress={() => void query.refetch()} />
              <Button variant="text" label={t.scanProduct} onPress={goToScan} />
            </>
          }
        />
      </>
    );
  }

  return (
    <>
      {header}
      <Screen bottomInset>
        {record ? (
          <ResultView record={record} textLang={textLang} onChangeTextLang={bilingual ? setLangOverride : undefined} />
        ) : (
          <ResultSkeleton />
        )}
      </Screen>
    </>
  );
}

function isDetailKey(key: readonly unknown[], id: string): boolean {
  const detail = historyKeys.detail(id);
  return key.length === detail.length && detail.every((part, i) => key[i] === part);
}

type MessageProps = { icon: IconName; title: string; body: string; action: ReactNode };

/** Centered empty / error state. */
function Message({ icon, title, body, action }: MessageProps) {
  const { spacing } = useTheme();
  return (
    <Screen bottomInset contentStyle={styles.center}>
      <View accessibilityLiveRegion="polite" style={[styles.message, { gap: spacing.md, padding: spacing.lg }]}>
        <Icon name={icon} size={48} color="onSurfaceVariant" />
        <AppText variant="titleLarge" align="center" accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="bodyMedium" color="onSurfaceVariant" align="center">
          {body}
        </AppText>
        <View style={[styles.message, { gap: spacing.sm, marginTop: spacing.sm }]}>{action}</View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  center: { flexGrow: 1, justifyContent: 'center' },
  message: { alignItems: 'center' },
});
