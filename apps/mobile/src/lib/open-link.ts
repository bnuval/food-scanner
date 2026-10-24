import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

import { safeStoreUrl } from '@/shared/links';

/**
 * Opens a retailer link only if it is an https URL on the store allowlist. Linking hands
 * it to Android App Links, so the Amazon / Flipkart / Blinkit app opens when installed;
 * otherwise a Custom Tab is used. Never a WebView, never a non-https scheme.
 */
export async function openStoreLink(raw: string, toolbarColor?: string): Promise<boolean> {
  const url = safeStoreUrl(raw);
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    try {
      await WebBrowser.openBrowserAsync(url, { toolbarColor, showTitle: true, enableBarCollapsing: true });
      return true;
    } catch {
      return false;
    }
  }
}

/** Opens one of the app's own https pages (privacy policy, terms) in a Custom Tab. */
export async function openInfoPage(url: string, toolbarColor?: string): Promise<boolean> {
  if (!/^https:\/\/[^\s]+$/i.test(url)) return false;
  try {
    await WebBrowser.openBrowserAsync(url, { toolbarColor, showTitle: true, createTask: false });
    return true;
  } catch {
    return false;
  }
}

/** Opens this app's own Play Store listing (used when the server requires an update). */
export async function openAppStoreListing(): Promise<boolean> {
  const pkg = Constants.expoConfig?.android?.package;
  if (Platform.OS !== 'android' || !pkg || !/^[a-zA-Z0-9._]+$/.test(pkg)) return false;
  try {
    await Linking.openURL(`market://details?id=${pkg}`);
    return true;
  } catch {
    return openInfoPage(`https://play.google.com/store/apps/details?id=${pkg}`);
  }
}
