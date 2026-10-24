import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { OfflineBanner } from '@/components/offline-banner';
import { Screen, ScreenHeader } from '@/components/screen';
import { Banner, Card, SectionHeader } from '@/components/surfaces';
import { fmt, useStrings } from '@/i18n';
import { common } from '@/i18n/common';
import { MAX_PHOTOS } from '@/shared/api-schema';
import { useScanSession } from '@/state/scan-session';
import { useTheme } from '@/theme';

import { MarketChip } from './market-chip';
import { PermissionCard, type CameraCardVariant } from './permission-card';
import { PhotoTray } from './photo-tray';
import { scanStrings } from './strings';
import type { ScanActions } from './use-scan-actions';

type ScanFallbackProps = {
  variant: CameraCardVariant;
  onPrimary: () => void;
  actions: ScanActions;
};

/** Scan tab without a live camera (permission missing or camera error): gallery still works. */
export function ScanFallback({ variant, onPrimary, actions }: ScanFallbackProps) {
  const { spacing } = useTheme();
  const t = useStrings(scanStrings);
  const tc = useStrings(common);
  const session = useScanSession();
  const count = session.photos.length;

  return (
    <Screen topInset>
      <ScreenHeader title={tc.appName} trailing={<MarketChip />} />
      <PermissionCard
        variant={variant}
        onPrimary={onPrimary}
        onGallery={() => void actions.pickFromGallery()}
        galleryBusy={actions.processing}
        galleryDisabled={session.isFull || actions.busy}
      />
      {actions.notice ? (
        <Banner tone={actions.notice.tone === 'error' ? 'error' : 'info'} message={actions.notice.message} />
      ) : null}
      <OfflineBanner />
      {count > 0 || actions.processing ? (
        <Card style={{ gap: spacing.md }}>
          <SectionHeader title={fmt(t.trayLabel, { count, total: MAX_PHOTOS })} icon="image" />
          {session.isFull ? (
            <AppText variant="bodyMedium" color="onSurfaceVariant" accessibilityLiveRegion="polite">
              {fmt(t.full, { max: MAX_PHOTOS })}
            </AppText>
          ) : null}
          <View style={styles.tray}>
            <PhotoTray photos={session.photos} processing={actions.processing} onRemove={actions.removePhoto} />
          </View>
          <Button
            label={count > 0 ? fmt(t.analyzeCount, { count }) : t.analyze}
            accessibilityLabel={
              count === 1 ? t.analyzeA11yOne : count > 1 ? fmt(t.analyzeA11yMany, { count }) : t.analyze
            }
            size="large"
            fullWidth
            disabled={count === 0 || actions.busy}
            onPress={actions.analyze}
          />
        </Card>
      ) : (
        <AppText variant="bodyMedium" color="onSurfaceVariant">
          {t.tips}
        </AppText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tray: { alignItems: 'flex-start' },
});
