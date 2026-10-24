import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEY = 'install_id';
/**
 * iOS keychain accessibility (ignored on Android): readable once the device has been unlocked
 * after boot, and ThisDeviceOnly so the item never moves to another device through a backup.
 */
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};
let cached: string | null = null;

/**
 * Random identifier (not tied to the user or to hardware ids) that lets the backend rate-limit
 * per install. It never leaves the device it was created on:
 * - Android: Keystore-backed SecureStore, which the expo-secure-store plugin excludes from
 *   cloud backup and device transfer. Uninstalling removes it, so a reinstall gets a new id.
 * - iOS: a ThisDeviceOnly keychain item, so it is not restored onto another device. iOS keeps
 *   keychain items after the app is deleted, so a reinstall on the same device keeps the id.
 */
export async function getInstallId(): Promise<string> {
  if (cached) return cached;
  try {
    const existing = await SecureStore.getItemAsync(KEY, STORE_OPTIONS);
    if (existing) return (cached = existing);
    const fresh = randomUUID();
    await SecureStore.setItemAsync(KEY, fresh, STORE_OPTIONS);
    return (cached = fresh);
  } catch {
    // Keystore can be unavailable on some devices; fall back to a per-session id.
    return (cached = randomUUID());
  }
}
