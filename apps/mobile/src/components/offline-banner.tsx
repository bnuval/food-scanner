import { useNetworkState } from 'expo-network';
import type { StyleProp, ViewStyle } from 'react-native';

import { useStrings } from '@/i18n';
import { common } from '@/i18n/common';

import { Banner } from './surfaces';

/**
 * True only when the device reports no network at all (unknown counts as online).
 * isInternetReachable is ignored: on Android it needs NET_CAPABILITY_VALIDATED, which many
 * working networks lack, so it would flag people as offline while requests still succeed.
 */
export function useIsOffline(): boolean {
  const net = useNetworkState();
  return net.isConnected === false;
}

export function OfflineBanner({ style }: { style?: StyleProp<ViewStyle> }) {
  const offline = useIsOffline();
  const t = useStrings(common);
  if (!offline) return null;
  return <Banner tone="warning" icon="cloudOff" message={t.offline} style={style} />;
}
