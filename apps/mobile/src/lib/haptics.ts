import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Semantic haptics. On Android these use View.performHapticFeedback, which respects the
 * user's touch-feedback setting and needs no VIBRATE permission (VIBRATE is blocked in
 * app.config.ts). Unsupported constants on older Android versions fall back silently.
 */
type Kind = 'shutter' | 'tick' | 'success' | 'error' | 'toggleOn' | 'toggleOff';

const ANDROID: Record<Kind, Haptics.AndroidHaptics[]> = {
  shutter: [Haptics.AndroidHaptics.Virtual_Key],
  tick: [Haptics.AndroidHaptics.Segment_Tick, Haptics.AndroidHaptics.Clock_Tick],
  success: [Haptics.AndroidHaptics.Confirm, Haptics.AndroidHaptics.Context_Click],
  error: [Haptics.AndroidHaptics.Reject, Haptics.AndroidHaptics.Long_Press],
  toggleOn: [Haptics.AndroidHaptics.Toggle_On, Haptics.AndroidHaptics.Clock_Tick],
  toggleOff: [Haptics.AndroidHaptics.Toggle_Off, Haptics.AndroidHaptics.Clock_Tick],
};

async function iosHaptic(kind: Kind) {
  if (kind === 'success') return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  if (kind === 'error') return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  if (kind === 'shutter') return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  return Haptics.selectionAsync();
}

export function haptic(kind: Kind): void {
  void (async () => {
    try {
      if (Platform.OS !== 'android') return await iosHaptic(kind);
      for (const type of ANDROID[kind]) {
        try {
          await Haptics.performAndroidHapticsAsync(type);
          return;
        } catch {
          // Constant not supported on this API level; try the next fallback.
        }
      }
    } catch {
      // Haptics are never essential.
    }
  })();
}
