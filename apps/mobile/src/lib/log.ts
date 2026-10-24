/**
 * Development-only logger. Release builds log nothing, so photos, AI responses or
 * identifiers can never end up in logcat. Never pass base64 image data here.
 */
export const log = {
  info: (...args: unknown[]) => {
    if (__DEV__) console.log('[purebite]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (__DEV__) console.warn('[purebite]', ...args);
  },
  error: (...args: unknown[]) => {
    if (__DEV__) console.error('[purebite]', ...args);
  },
};
