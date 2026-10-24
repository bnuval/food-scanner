import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { useShowMessage } from '@/components/alert';
import { Screen, ScreenHeader } from '@/components/screen';
import { Banner } from '@/components/surfaces';
import { useHistoryActions, useRefreshHistoryOnFocus } from '@/features/history/use-history-actions';
import {
  ActionRow,
  InfoRow,
  LinkRow,
  RadioGroup,
  RadioRow,
  SectionNote,
  SettingsSection,
} from '@/features/settings/rows';
import { settingsStrings } from '@/features/settings/strings';
import { fmt, useStrings } from '@/i18n';
import { common } from '@/i18n/common';
import { useMarketName } from '@/i18n/markets';
import { config } from '@/lib/config';
import { haptic } from '@/lib/haptics';
import { countScans } from '@/lib/history';
import { openInfoPage } from '@/lib/open-link';
import { historyKeys } from '@/lib/query-keys';
import { MARKETS, marketFromTimeZone } from '@/shared/market';
import { useSettings, type LanguagePref, type ThemePref } from '@/state/settings';
import { useTheme } from '@/theme';

/** Host part of the configured API origin, for debug builds only. */
function apiHost(): string | null {
  return config.apiBaseUrl ? config.apiBaseUrl.replace(/^[a-z]+:\/\//i, '') : null;
}

export default function SettingsScreen() {
  const { colors, spacing } = useTheme();
  const t = useStrings(settingsStrings);
  const tc = useStrings(common);
  const settings = useSettings();
  const { confirmClearAll } = useHistoryActions();
  const [justCleared, setJustCleared] = useState(false);
  const showMessage = useShowMessage();

  const count = useQuery({ queryKey: historyKeys.count(), queryFn: countScans });
  useRefreshHistoryOnFocus();

  const savedScans = count.data;
  const inferredMarket = marketFromTimeZone(settings.timeZone);
  const marketName = useMarketName();

  /** Applies a selection only when it changes something, with a selection tick. */
  const select = (changed: boolean, patch: Parameters<typeof settings.update>[0]) => {
    if (!changed) return;
    haptic('tick');
    settings.update(patch);
  };

  const openPage = async (url: string) => {
    const opened = await openInfoPage(url, colors.surface);
    if (!opened) showMessage(tc.linkBlocked);
  };

  const languageOptions: { value: LanguagePref; label: string; description?: string }[] = [
    { value: 'system', label: t.languageSystem, description: t.languageSystemHint },
    { value: 'en', label: t.languageEnglish },
    { value: 'hi', label: t.languageHindi },
  ];
  const themeOptions: { value: ThemePref; label: string }[] = [
    { value: 'system', label: t.themeSystem },
    { value: 'light', label: t.themeLight },
    { value: 'dark', label: t.themeDark },
  ];

  const savedScansText =
    savedScans === undefined
      ? undefined
      : savedScans === 0
        ? t.savedScansNone
        : savedScans === 1
          ? t.savedScansOne
          : fmt(t.savedScansOther, { count: savedScans });

  const host = __DEV__ ? apiHost() : null;
  const { privacyPolicyUrl, termsUrl } = config;

  return (
    <Screen topInset>
      <ScreenHeader title={tc.tabSettings} />

      <SettingsSection title={t.languageTitle} icon="translate">
        <RadioGroup label={t.languageTitle}>
          {languageOptions.map((option) => (
            <RadioRow
              key={option.value}
              label={option.label}
              description={option.description}
              checked={settings.language === option.value}
              onSelect={() => select(settings.language !== option.value, { language: option.value })}
            />
          ))}
        </RadioGroup>
        <SectionNote icon="info" text={t.languageNote} />
      </SettingsSection>

      <SettingsSection title={tc.market} subtitle={t.marketSubtitle} icon="globe">
        <RadioGroup label={tc.market}>
          <RadioRow
            label={fmt(t.marketAuto, { market: marketName(inferredMarket) })}
            description={t.marketAutoHint}
            checked={settings.market === null}
            onSelect={() => select(settings.market !== null, { market: null })}
          />
          {MARKETS.map((market) => (
            <RadioRow
              key={market}
              label={marketName(market)}
              checked={settings.market === market}
              onSelect={() => select(settings.market !== market, { market })}
            />
          ))}
        </RadioGroup>
      </SettingsSection>

      <SettingsSection title={t.appearanceTitle} icon="contrast">
        <RadioGroup label={t.appearanceTitle}>
          {themeOptions.map((option) => (
            <RadioRow
              key={option.value}
              label={option.label}
              checked={settings.theme === option.value}
              onSelect={() => select(settings.theme !== option.value, { theme: option.value })}
            />
          ))}
        </RadioGroup>
      </SettingsSection>

      <SettingsSection title={t.privacyTitle} icon="shield">
        <SectionNote text={t.privacyBody} />
        <ActionRow
          tone="danger"
          icon="delete"
          label={t.clearHistory}
          description={savedScansText}
          disabled={savedScans === 0}
          // The success Banner below is a polite live region, so skip the extra announcement.
          onPress={() => confirmClearAll({ onCleared: () => setJustCleared(true), announce: false })}
        />
        {justCleared && savedScans === 0 ? (
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
            <Banner tone="success" message={t.historyCleared} />
          </View>
        ) : null}
        {privacyPolicyUrl ? (
          <LinkRow
            icon="lock"
            label={t.privacyPolicy}
            trailingIcon="openInNew"
            accessibilityHint={t.opensInBrowser}
            onPress={() => void openPage(privacyPolicyUrl)}
          />
        ) : null}
        {termsUrl ? (
          <LinkRow
            icon="info"
            label={t.terms}
            trailingIcon="openInNew"
            accessibilityHint={t.opensInBrowser}
            onPress={() => void openPage(termsUrl)}
          />
        ) : null}
      </SettingsSection>

      <SettingsSection title={t.aboutTitle} icon="info">
        <InfoRow label={t.version} value={config.appVersion} />
        <InfoRow label={t.disclaimerTitle} value={tc.disclaimer} />
        <InfoRow label={t.licensesTitle} value={t.licensesBody} />
        {__DEV__ ? <InfoRow label={t.apiServer} value={host ?? t.apiNotConfigured} /> : null}
      </SettingsSection>
    </Screen>
  );
}
