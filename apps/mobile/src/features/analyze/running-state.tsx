import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { fmt, useStrings } from '@/i18n';
import type { SessionPhoto } from '@/state/scan-session';
import { useTheme } from '@/theme';

import { DONE_SNAPSHOT, PROGRESS_TICK_MS, holdProgress, progressAt, type ProgressTiming } from './progress-model';
import { ProgressBar, StageChecklist } from './progress-steps';
import { ResultSkeleton } from './result-skeleton';
import { ScanningThumbnails } from './scanning-thumbnails';
import { StateLayout } from './state-layout';
import { analyzeStrings } from './strings';

type Props = {
  photos: readonly SessionPhoto[];
  timing: ProgressTiming;
  /** The response has arrived and is being saved: show everything complete. */
  finished: boolean;
};

/** Everything shown while the analysis runs. Keeps the screen awake while mounted. */
export function RunningState({ photos, timing, finished }: Props) {
  useKeepAwake(undefined, { suppressDeactivateWarnings: true });
  const { spacing } = useTheme();
  const t = useStrings(analyzeStrings);
  // Wall clock for the time-based stages; only this subtree re-renders on each tick.
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => setNow(Date.now()), PROGRESS_TICK_MS);
    return () => clearInterval(id);
  }, [finished]);

  const estimate = finished ? DONE_SNAPSHOT : progressAt(timing, now);
  // The bar and the ticked stages never go backwards (e.g. when a late upload event arrives).
  const [shown, setShown] = useState(estimate);
  const snapshot = holdProgress(shown, estimate);
  if (snapshot !== shown) setShown(snapshot);
  const stages = [t.stageUpload, t.stageRead, t.stageCheck, t.stageAlternatives];
  const headline = finished ? t.stageDone : fmt(t.stageHeadline, { stage: stages[snapshot.stage] ?? t.stageUpload });

  return (
    <StateLayout>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="headlineSmall" accessibilityLiveRegion="polite">
          {headline}
        </AppText>
        {finished ? null : (
          <AppText variant="bodyMedium" color="onSurfaceVariant" accessibilityLiveRegion="polite">
            {snapshot.slow ? t.slow : t.typicalTime}
          </AppText>
        )}
      </View>
      <ScanningThumbnails photos={photos} />
      <ProgressBar value={snapshot.value} />
      <StageChecklist labels={stages} current={snapshot.stage} />
      <ResultSkeleton />
    </StateLayout>
  );
}
