import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { useShowMessage } from '@/components/alert';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { isRetryable, useErrorMessage } from '@/components/error-message';
import { Banner } from '@/components/surfaces';
import { fmt, useStrings } from '@/i18n';
import { common } from '@/i18n/common';
import { isApiError } from '@/lib/api';
import { openAppStoreListing } from '@/lib/open-link';

import { StateHeader, StateLayout } from './state-layout';
import { analyzeStrings } from './strings';
import { PhotoReadError } from './use-analysis';

/** Longest the retry button stays locked after a rate limit, whatever Retry-After says. */
const MAX_RETRY_LOCK_S = 60;

type Props = {
  error: unknown;
  onRetry: () => void;
  /** Back to the Scan tab with the photos kept. */
  onBack: () => void;
  /** Clear the photos and go back to the camera. */
  onRetake: () => void;
};

/**
 * Failed analysis. Retry is offered only when it can help: never for an outdated app (which
 * gets an "Update app" action instead) or a missing server, and photo problems lead to a
 * retake. Nothing retries on its own.
 */
export function ErrorState({ error, onRetry, onBack, onRetake }: Props) {
  const t = useStrings(analyzeStrings);
  const c = useStrings(common);
  const errorMessage = useErrorMessage();
  const showMessage = useShowMessage();
  const kind = isApiError(error) ? error.kind : null;
  const retryAfter = isApiError(error) ? error.retryAfter : null;

  const photoProblem = error instanceof PhotoReadError || kind === 'too_large';
  const upgrade = kind === 'upgrade_required';
  const canRetry = !photoProblem && isRetryable(error);
  // The store listing can only be opened on Android for now (see openAppStoreListing).
  const canUpdate = upgrade && Platform.OS === 'android';
  const message = error instanceof PhotoReadError ? t.errorPhotos : errorMessage(error);

  const openUpdate = async () => {
    if (!(await openAppStoreListing())) showMessage(c.linkBlocked);
  };

  const [lockSeconds, setLockSeconds] = useState(() =>
    kind === 'rate_limited' && retryAfter ? Math.min(retryAfter, MAX_RETRY_LOCK_S) : 0,
  );
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const id = setTimeout(() => setLockSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [lockSeconds]);

  const footer = canRetry ? (
    <>
      <Button
        label={lockSeconds > 0 ? fmt(t.retryIn, { seconds: lockSeconds }) : c.retry}
        icon="refresh"
        size="large"
        fullWidth
        disabled={lockSeconds > 0}
        onPress={onRetry}
      />
      <Button label={t.backToPhotos} variant="outlined" fullWidth onPress={onBack} />
    </>
  ) : photoProblem ? (
    <>
      <Button label={t.retake} icon="camera" size="large" fullWidth onPress={onRetake} />
      <Button label={t.backToPhotos} variant="outlined" fullWidth onPress={onBack} />
    </>
  ) : canUpdate ? (
    <>
      <Button label={c.updateApp} icon="openInNew" size="large" fullWidth onPress={() => void openUpdate()} />
      <Button label={t.backToPhotos} variant="outlined" fullWidth onPress={onBack} />
    </>
  ) : (
    <Button label={t.backToPhotos} icon="arrowBack" size="large" fullWidth onPress={onBack} />
  );

  return (
    <StateLayout footer={footer}>
      <StateHeader
        icon={kind === 'network' ? 'cloudOff' : upgrade ? 'info' : 'warning'}
        tone={upgrade ? 'info' : 'error'}
        title={upgrade ? t.updateTitle : t.errorTitle}
      />
      <Banner
        tone={upgrade ? 'info' : kind === 'network' ? 'warning' : 'error'}
        icon={kind === 'network' ? 'cloudOff' : undefined}
        message={message}
      />
      {canRetry ? (
        <AppText variant="bodyMedium" color="onSurfaceVariant" align="center">
          {t.photosKept}
        </AppText>
      ) : null}
    </StateLayout>
  );
}

type SaveErrorProps = {
  /** Saves the result again (no new upload or AI call). */
  onRetry: () => void;
  /** Back to the Scan tab with the photos kept; the unsaved result is dropped. */
  onBack: () => void;
};

/**
 * The analysis finished but storing it on this phone failed (for example, storage is full).
 * Retry repeats only the save with the result already received, never the paid analysis.
 */
export function SaveErrorState({ onRetry, onBack }: SaveErrorProps) {
  const t = useStrings(analyzeStrings);
  return (
    <StateLayout
      footer={
        <>
          <Button label={t.retrySave} icon="refresh" size="large" fullWidth onPress={onRetry} />
          <Button label={t.backToPhotos} variant="outlined" fullWidth onPress={onBack} />
        </>
      }>
      <StateHeader icon="warning" tone="error" title={t.saveErrorTitle} body={t.saveErrorBody} announce />
    </StateLayout>
  );
}
