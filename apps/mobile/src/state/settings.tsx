import { getCalendars, useCalendars, useLocales } from 'expo-localization';
import { Storage } from 'expo-sqlite/kv-store';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';

import type { Lang } from '@/i18n';
import { isMarket, marketFromTimeZone, type Market } from '@/shared/market';

export type LanguagePref = 'system' | Lang;
export type ThemePref = 'system' | 'light' | 'dark';

type StoredSettings = {
  language: LanguagePref;
  /** null = infer from the device time zone. */
  market: Market | null;
  theme: ThemePref;
};

type SettingsContextValue = StoredSettings & {
  /** Effective UI language. */
  lang: Lang;
  /** Effective market sent to the backend. */
  effectiveMarket: Market;
  /** IANA time zone of the device (sent to the backend for context). */
  timeZone: string;
  update: (patch: Partial<StoredSettings>) => void;
};

const STORAGE_KEY = 'settings.v1';
const DEFAULTS: StoredSettings = { language: 'system', market: null, theme: 'system' };

function readStored(): StoredSettings {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULTS;
    const p = parsed as Record<string, unknown>;
    return {
      language: p.language === 'en' || p.language === 'hi' ? p.language : 'system',
      market: isMarket(p.market) ? p.market : null,
      theme: p.theme === 'light' || p.theme === 'dark' ? p.theme : 'system',
    };
  } catch {
    return DEFAULTS;
  }
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredSettings>(readStored);
  const locales = useLocales();
  const calendars = useCalendars();

  // Apply the theme override natively too, so the status bar, tab bar, dialogs and
  // pickers follow it — not just React-rendered views.
  useEffect(() => {
    Appearance.setColorScheme(stored.theme === 'system' ? 'unspecified' : stored.theme);
  }, [stored.theme]);

  const timeZone = calendars[0]?.timeZone ?? getCalendars()[0]?.timeZone ?? 'Asia/Kolkata';
  const systemLang: Lang = locales[0]?.languageCode === 'hi' ? 'hi' : 'en';

  const update = (patch: Partial<StoredSettings>) => {
    setStored((prev) => {
      const next = { ...prev, ...patch };
      try {
        Storage.setItemSync(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Persisting is best-effort; the in-memory value still applies.
      }
      return next;
    });
  };

  const value: SettingsContextValue = {
    ...stored,
    lang: stored.language === 'system' ? systemLang : stored.language,
    effectiveMarket: stored.market ?? marketFromTimeZone(timeZone),
    timeZone,
    update,
  };

  return <SettingsContext value={value}>{children}</SettingsContext>;
}

export function useSettings(): SettingsContextValue {
  const ctx = use(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
