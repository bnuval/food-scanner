import { NativeTabs } from 'expo-router/native-tabs';

import { useStrings } from '@/i18n';
import { common } from '@/i18n/common';
import { useTheme } from '@/theme';

/** Native Material bottom navigation (Android BottomNavigationView / iOS UITabBar). */
export default function TabsLayout() {
  const { colors } = useTheme();
  const t = useStrings(common);

  return (
    <NativeTabs
      backgroundColor={colors.surfaceContainer}
      indicatorColor={colors.secondaryContainer}
      rippleColor={colors.primary}
      iconColor={{ default: colors.onSurfaceVariant, selected: colors.onSecondaryContainer }}
      labelStyle={{ default: { color: colors.onSurfaceVariant, fontSize: 12 }, selected: { color: colors.onSurface } }}
      labelVisibilityMode="labeled"
      backBehavior="initialRoute">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t.tabScan}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="barcode.viewfinder" md="document_scanner" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>{t.tabSearch}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>{t.tabHistory}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="clock" md="history" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{t.tabSettings}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
