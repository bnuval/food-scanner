import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { Chip } from '@/components/surfaces';
import { fmt, useStrings } from '@/i18n';
import { useMarketName } from '@/i18n/markets';
import { useSettings } from '@/state/settings';
import { MIN_TOUCH, useTheme } from '@/theme';

import { ON_SCRIM, ON_SCRIM_RIPPLE, SCRIM_STRONG } from './helpers';
import { scanStrings } from './strings';

/** The market the verdict is tailored to; tapping it opens Settings to change it. */
export function MarketChip({ overCamera = false }: { overCamera?: boolean }) {
  const { radii, spacing } = useTheme();
  const t = useStrings(scanStrings);
  const { effectiveMarket } = useSettings();
  const marketName = useMarketName();
  const label = marketName(effectiveMarket);
  const a11yLabel = fmt(t.marketA11y, { market: label });
  const openSettings = () => router.navigate('/settings');

  if (!overCamera) {
    return <Chip label={label} icon="globe" onPress={openSettings} accessibilityLabel={a11yLabel} />;
  }
  return (
    <View style={[styles.wrap, { borderRadius: radii.full }]}>
      <Pressable
        onPress={openSettings}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        android_ripple={{ color: ON_SCRIM_RIPPLE }}
        style={[styles.pill, { backgroundColor: SCRIM_STRONG, paddingHorizontal: spacing.md, gap: spacing.xs }]}>
        <Icon name="globe" size={18} color={ON_SCRIM} />
        <AppText variant="labelLarge" numberOfLines={1} style={styles.text}>
          {label}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', flexShrink: 1 },
  pill: { minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center' },
  text: { color: ON_SCRIM, flexShrink: 1 },
});
