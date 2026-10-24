import { useCameraPermissions, type CameraMountError } from 'expo-camera';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { ScanFallback } from '@/features/scan/fallback-view';
import { LiveScanner } from '@/features/scan/live-scanner';
import type { CameraCardVariant } from '@/features/scan/permission-card';
import { useAppActive } from '@/features/scan/use-app-active';
import { useScanActions } from '@/features/scan/use-scan-actions';
import { log } from '@/lib/log';
import { useTheme } from '@/theme';

/**
 * Scan tab (camera-first home). The preview is mounted only while this tab is focused, the
 * app is in the foreground and camera permission is granted, so no other screen ever
 * competes for the camera. Permission is only requested from an explicit tap.
 */
export default function ScanScreen() {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [mountError, setMountError] = useState(false);
  const actions = useScanActions();

  const known = permission !== null;
  const granted = permission?.granted === true;

  // Re-read (never re-request) the status when the user comes back, e.g. from Settings.
  useEffect(() => {
    if (known && !granted && appActive && isFocused) {
      getPermission().catch((error: unknown) => log.warn('Camera permission check failed', error));
    }
  }, [known, granted, appActive, isFocused, getPermission]);

  if (!permission) return <View style={[styles.fill, { backgroundColor: colors.background }]} />;

  if (granted && !mountError) {
    if (!isFocused || !appActive) return <View style={[styles.fill, styles.dark]} />;
    return (
      <LiveScanner
        actions={actions}
        onMountError={(error: CameraMountError) => {
          log.warn('Camera mount error', error.message);
          setMountError(true);
        }}
      />
    );
  }

  const variant: CameraCardVariant = mountError
    ? 'error'
    : !permission.canAskAgain
      ? 'blocked'
      : permission.status === 'denied'
        ? 'declined'
        : 'ask';

  const onPrimary = () => {
    if (variant === 'error') {
      setMountError(false);
    } else if (variant === 'blocked') {
      Linking.openSettings().catch((error: unknown) => log.warn('Could not open settings', error));
    } else {
      requestPermission().catch((error: unknown) => log.warn('Camera permission request failed', error));
    }
  };

  return <ScanFallback variant={variant} onPrimary={onPrimary} actions={actions} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  dark: { backgroundColor: '#000000' },
});
