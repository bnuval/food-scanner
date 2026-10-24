import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

function subscribe(onChange: () => void) {
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
}

function getState() {
  return AppState.currentState;
}

/**
 * True while the app is in the foreground. 'unknown' (before the native module reports)
 * counts as active; 'inactive' (iOS app switcher / Control Center) and 'background' do not.
 */
export function useAppActive(): boolean {
  const state = useSyncExternalStore(subscribe, getState);
  return state !== 'background' && state !== 'inactive';
}
