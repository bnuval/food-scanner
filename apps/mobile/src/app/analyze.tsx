import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { IconButton } from '@/components/button';
import { Screen } from '@/components/screen';
import { ErrorState, SaveErrorState } from '@/features/analyze/error-state';
import { RunningState } from '@/features/analyze/running-state';
import { analyzeStrings } from '@/features/analyze/strings';
import { UnreadableState } from '@/features/analyze/unreadable-state';
import { useAnalysis } from '@/features/analyze/use-analysis';
import { fmt, useStrings } from '@/i18n';
import { common } from '@/i18n/common';
import { haptic } from '@/lib/haptics';
import { useScanSession } from '@/state/scan-session';
import { useTheme } from '@/theme';

/**
 * Full-screen label analysis. Starts as soon as it opens, using the photos in the scan
 * session, and replaces itself with the saved result. Only a visit requested by the Scan
 * tab's Analyze button starts the (paid) analysis; a deep link or a duplicate push just
 * leaves. Leaving (close, Android back) aborts the request until the response has
 * arrived; after that the result is saved to history anyway.
 */
export default function AnalyzeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const session = useScanSession();
  const { colors } = useTheme();
  const t = useStrings(analyzeStrings);
  const c = useStrings(common);
  // Snapshot at mount: retries reuse exactly these photos, and the thumbnails stay put
  // after a successful analysis resets the session on the way out.
  const [initial] = useState(() => ({ photos: session.photos, barcode: session.barcode }));
  // Whether the Analyze button asked for this visit; null until the screen has opened.
  const requested = useRef<boolean | null>(null);
  const redirected = useRef(false);
  const left = useRef(false);

  const leave = () => {
    left.current = true;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  // The result was saved after the user left: it is in History, so drop the photos it used
  // (only those, in case new ones were taken meanwhile) so they aren't analysed again.
  const releasePhotos = () => {
    for (const photo of initial.photos) session.removePhoto(photo.id);
    session.setBarcode(null);
  };

  const analysis = useAnalysis({
    photos: initial.photos,
    barcode: initial.barcode,
    onSaved: (id, result) => {
      // Closed or backed out while the result was being saved: don't navigate from a screen
      // that is already going away (a replace would hit whatever is focused now).
      if (left.current || !navigation.isFocused()) {
        releasePhotos();
        return;
      }
      haptic('success');
      AccessibilityInfo.announceForAccessibility(
        fmt(t.resultReadyA11y, {
          verdict: result.verdict === 'BUY' ? c.verdictBuy : c.verdictAvoid,
          score: result.healthScore,
        }),
      );
      session.reset();
      router.replace({ pathname: '/result/[id]', params: { id } });
    },
    onSavedAfterLeave: releasePhotos,
    onCancelled: leave,
  });

  const onOpen = useEffectEvent(() => {
    requested.current ??= session.consumeAnalysisRequest();
    if (requested.current && initial.photos.length > 0) {
      void analysis.start();
    } else if (!redirected.current) {
      redirected.current = true;
      leave();
    }
  });
  useEffect(() => {
    onOpen();
  }, []);

  const cancel = () => {
    analysis.cancel();
    leave();
  };

  const retake = () => {
    session.reset();
    leave();
  };

  const { phase } = analysis;
  if (phase.status === 'idle') return <View style={[styles.fill, { backgroundColor: colors.background }]} />;

  // Once the response has arrived (finishing) closing no longer cancels: the result is kept.
  const cancellable = phase.status === 'running';
  const busy = phase.status === 'running' || phase.status === 'finishing';

  return (
    <Screen scroll={false} topInset bottomInset>
      <AppBar
        title={t.appBarTitle}
        closeLabel={cancellable ? t.cancelAnalysis : c.close}
        onClose={cancellable ? cancel : leave}
      />
      {busy ? (
        <RunningState photos={initial.photos} timing={phase.timing} finished={phase.status === 'finishing'} />
      ) : phase.status === 'unreadable' ? (
        <UnreadableState
          reason={phase.reason}
          reasonHindi={phase.reasonHindi}
          onRetake={retake}
          onRetry={() => void analysis.start()}
        />
      ) : phase.status === 'save_error' ? (
        <SaveErrorState onRetry={analysis.retrySave} onBack={leave} />
      ) : (
        <ErrorState
          error={phase.error}
          onRetry={() => void analysis.start()}
          onBack={leave}
          onRetake={retake}
        />
      )}
    </Screen>
  );
}

/** Material 3 small top app bar with a leading close action. */
function AppBar({ title, closeLabel, onClose }: { title: string; closeLabel: string; onClose: () => void }) {
  const { spacing } = useTheme();
  return (
    // Pull the 48dp button into the gutter so the icon lines up 16dp from the edge.
    <View style={[styles.appBar, { gap: spacing.xs, marginLeft: -spacing.md }]}>
      <IconButton icon="close" accessibilityLabel={closeLabel} onPress={onClose} />
      <AppText variant="titleLarge" accessibilityRole="header" numberOfLines={1} style={styles.fill}>
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  appBar: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
});
