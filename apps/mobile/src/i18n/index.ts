import { useSettings } from '@/state/settings';

export type Lang = 'en' | 'hi';

type Dict = Record<string, string>;

/**
 * Declares a feature's UI strings. TypeScript requires the Hindi dictionary to have
 * exactly the same keys as the English one, so a missing translation fails `tsc`.
 */
export function defineStrings<T extends Dict>(dicts: { en: T; hi: { [K in keyof T]: string } }) {
  return dicts as { en: T; hi: T };
}

/** Returns the dictionary for the user's current app language. */
export function useStrings<T extends Dict>(dicts: { en: T; hi: T }): T {
  const { lang } = useSettings();
  return dicts[lang];
}

/** Replaces `{name}` placeholders: fmt('Photo {n} of {total}', { n: 1, total: 3 }). */
export function fmt(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in params ? String(params[key]) : whole,
  );
}
