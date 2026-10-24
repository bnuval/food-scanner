import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

/** Build-time configuration from app.config.ts (`extra`). None of these values are secrets. */
export const config = {
  /** Origin of the PureBite backend, without a trailing slash ('' when not configured). */
  apiBaseUrl: (str(extra.apiBaseUrl) ?? '').replace(/\/+$/, ''),
  appVersion: Constants.expoConfig?.version ?? '0.0.0',
  privacyPolicyUrl: str(extra.privacyPolicyUrl),
  termsUrl: str(extra.termsUrl),
  supportEmail: str(extra.supportEmail),
} as const;
