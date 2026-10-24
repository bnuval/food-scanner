import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { IconButton } from '@/components/button';
import { useStrings } from '@/i18n';
import { common } from '@/i18n/common';
import { useTheme } from '@/theme';

import { ON_SCRIM } from './helpers';
import { MarketChip } from './market-chip';
import { scanStrings } from './strings';

type ScanTopBarProps = {
  topInset: number;
  torch: boolean;
  onToggleTorch: () => void;
};

/** Brand, market and torch, drawn over the dimmed camera preview below the status bar. */
export function ScanTopBar({ topInset, torch, onToggleTorch }: ScanTopBarProps) {
  const { spacing } = useTheme();
  const tc = useStrings(common);
  const t = useStrings(scanStrings);
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.bar,
        { paddingTop: topInset + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
      ]}>
      <AppText variant="titleLarge" accessibilityRole="header" numberOfLines={1} style={styles.brand}>
        {tc.appName}
      </AppText>
      <MarketChip overCamera />
      <IconButton
        variant="scrim"
        icon={torch ? 'flashOn' : 'flashOff'}
        selected={torch}
        accessibilityLabel={torch ? t.torchOff : t.torchOn}
        onPress={onToggleTorch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center' },
  brand: {
    flex: 1,
    color: ON_SCRIM,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
});
