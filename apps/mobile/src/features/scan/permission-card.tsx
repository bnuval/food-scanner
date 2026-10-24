import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Card } from '@/components/surfaces';
import { useStrings } from '@/i18n';
import { common } from '@/i18n/common';
import { useTheme, type ColorRole } from '@/theme';

import { scanStrings } from './strings';

/**
 * ask      – never asked: explain, then request on tap.
 * declined – denied once but the system may ask again (only on an explicit tap).
 * blocked  – denied permanently: only Settings can grant it.
 * error    – permission granted but the camera failed to start.
 */
export type CameraCardVariant = 'ask' | 'declined' | 'blocked' | 'error';

type PermissionCardProps = {
  variant: CameraCardVariant;
  /** Primary action: request permission, open Settings, or retry the camera. */
  onPrimary: () => void;
  onGallery: () => void;
  galleryBusy: boolean;
  galleryDisabled: boolean;
};

const VISUALS: Record<CameraCardVariant, { icon: IconName; bg: ColorRole; fg: ColorRole }> = {
  ask: { icon: 'camera', bg: 'primaryContainer', fg: 'onPrimaryContainer' },
  declined: { icon: 'camera', bg: 'secondaryContainer', fg: 'onSecondaryContainer' },
  blocked: { icon: 'lock', bg: 'secondaryContainer', fg: 'onSecondaryContainer' },
  error: { icon: 'warning', bg: 'errorContainer', fg: 'onErrorContainer' },
};

/** In-app explanation shown instead of the camera, always with a gallery fallback. */
export function PermissionCard({ variant, onPrimary, onGallery, galleryBusy, galleryDisabled }: PermissionCardProps) {
  const { colors, spacing } = useTheme();
  const t = useStrings(scanStrings);
  const tc = useStrings(common);
  const visual = VISUALS[variant];

  const copy = {
    ask: { title: t.permTitle, body: t.permBody, action: t.permAllow },
    declined: { title: t.permDeclinedTitle, body: t.permDeclinedBody, action: t.permAllow },
    blocked: { title: t.permBlockedTitle, body: t.permBlockedBody, action: tc.openSettings },
    error: { title: t.cameraErrorTitle, body: t.cameraErrorBody, action: tc.retry },
  }[variant];

  return (
    <Card style={[styles.card, { gap: spacing.lg, paddingVertical: spacing.xl }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors[visual.bg] }]}>
        <Icon name={visual.icon} size={36} color={visual.fg} />
      </View>
      <View
        style={[styles.text, { gap: spacing.sm }]}
        accessibilityLiveRegion="polite"
        accessibilityRole={variant === 'error' ? 'alert' : undefined}>
        <AppText variant="titleLarge" align="center" accessibilityRole="header">
          {copy.title}
        </AppText>
        <AppText variant="bodyMedium" color="onSurfaceVariant" align="center">
          {copy.body}
        </AppText>
      </View>
      <View style={[styles.actions, { gap: spacing.sm }]}>
        <Button
          label={copy.action}
          icon={variant === 'blocked' ? 'settings' : variant === 'error' ? 'refresh' : 'camera'}
          onPress={onPrimary}
          size="large"
          fullWidth
        />
        <Button
          label={t.gallery}
          variant="outlined"
          icon="photoLibrary"
          onPress={onGallery}
          loading={galleryBusy}
          disabled={galleryDisabled}
          fullWidth
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  text: { alignSelf: 'stretch' },
  actions: { alignSelf: 'stretch' },
});
