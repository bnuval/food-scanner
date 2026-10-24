import { Alert } from 'react-native';

import { useStrings } from '@/i18n';
import { common } from '@/i18n/common';

/**
 * Localized one-button message dialog. React Native's Alert hard-codes an English "OK"
 * on Android when no buttons are passed, so every message goes through this instead.
 */
export function useShowMessage() {
  const t = useStrings(common);
  return (message: string, title = '') => Alert.alert(title, message, [{ text: t.ok }]);
}
