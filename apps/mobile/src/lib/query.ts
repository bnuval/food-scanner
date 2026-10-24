import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { addNetworkStateListener, getNetworkStateAsync, type NetworkState } from 'expo-network';
import { AppState, Platform } from 'react-native';

import { isApiError } from './api';

// Only an explicit "no network" pauses requests; unknown (undefined) counts as online.
// isInternetReachable is deliberately ignored: on Android it needs NET_CAPABILITY_VALIDATED,
// which is missing on many working networks (captive-portal probes blocked, some VPNs).
// Real request failures surface as ApiError('network') with a Retry action instead.
const isOnline = (s: NetworkState) => s.isConnected !== false;

onlineManager.setEventListener((setOnline) => {
  void getNetworkStateAsync().then((s) => setOnline(isOnline(s)));
  const sub = addNetworkStateListener((s) => setOnline(isOnline(s)));
  return () => sub.remove();
});

/**
 * Re-reads the connection state, in case a network change event was missed. Paused
 * queries resume on their own once this reports online.
 */
export async function recheckOnline(): Promise<void> {
  try {
    onlineManager.setOnline(isOnline(await getNetworkStateAsync()));
  } catch {
    // Keep the last known state.
  }
}

focusManager.setEventListener((setFocused) => {
  const sub = AppState.addEventListener('change', (status) => {
    if (Platform.OS !== 'web') setFocused(status === 'active');
  });
  return () => sub.remove();
});

/**
 * Automatic retry policy for queries. Search is a paid AI call, so only a connection
 * failure is retried (once). A timeout (our own or a gateway's) or a 5xx means the server
 * may still be running, and billing, the first request; the user decides with Retry.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && isApiError(error) && error.kind === 'network';
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // AI search results don't change minute to minute; avoid paying for repeat calls.
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: shouldRetryQuery,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000) + Math.random() * 500,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Each analysis is a paid AI call: never retry automatically, let the user decide.
      retry: false,
    },
  },
});

export { isApiError };
