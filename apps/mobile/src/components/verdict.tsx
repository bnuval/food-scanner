import { StyleSheet, View } from 'react-native';

import { common } from '@/i18n/common';
import { fmt, useStrings } from '@/i18n';
import { scoreBand, type HealthVerdict, type ScoreBand } from '@/shared/api-schema';
import { useTheme, type ColorRole } from '@/theme';

import { AppText } from './app-text';
import { Icon } from './icon';

const BAND_COLOR: Record<ScoreBand, ColorRole> = {
  excellent: 'bandExcellent',
  good: 'bandGood',
  okay: 'bandOkay',
  bad: 'bandBad',
};

export function bandColor(score: number): ColorRole {
  return BAND_COLOR[scoreBand(score)];
}

/** Localized four-tier verdict label for a score. */
export function useBandLabel() {
  const t = useStrings(common);
  return (score: number) => {
    const band = scoreBand(score);
    return band === 'excellent' ? t.bandExcellent : band === 'good' ? t.bandGood : band === 'okay' ? t.bandOkay : t.bandBad;
  };
}

/** Verdict pill: icon, localized tier label, and color are always used together. */
export function VerdictPill({
  verdict,
  tierVerdict,
  size = 'medium',
}: {
  verdict: 'BUY' | 'AVOID';
  tierVerdict?: HealthVerdict;
  size?: 'small' | 'medium' | 'large';
}) {
  const { colors, radii } = useTheme();
  const t = useStrings(common);
  const avoid = tierVerdict ? tierVerdict === 'Avoid Frequent Use' : verdict === 'AVOID';
  const okay = tierVerdict === 'Okay to Buy';
  const label = tierVerdict === 'Must Buy'
    ? t.verdictMustBuy
    : tierVerdict === 'Recommended Buy'
      ? t.verdictRecommendedBuy
      : tierVerdict === 'Okay to Buy'
        ? t.verdictOkayToBuy
        : tierVerdict === 'Avoid Frequent Use'
          ? t.verdictAvoidFrequentUse
          : avoid ? t.verdictAvoid : t.verdictBuy;
  const bg = avoid ? colors.avoid : okay ? colors.warningContainer : colors.buy;
  const fg = avoid ? colors.onAvoid : okay ? colors.onWarningContainer : colors.onBuy;
  const dims = size === 'large' ? { h: 44, icon: 24, pad: 18 } : size === 'small' ? { h: 26, icon: 16, pad: 10 } : { h: 32, icon: 18, pad: 14 };
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.pill, { backgroundColor: bg, borderRadius: radii.full, minHeight: dims.h, paddingHorizontal: dims.pad }]}>
      <Icon name={avoid ? 'block' : 'checkCircle'} size={dims.icon} color={fg} />
      <AppText
        variant={size === 'large' ? 'titleLarge' : size === 'small' ? 'labelMedium' : 'labelLarge'}
        style={{ color: fg, textTransform: 'uppercase', fontWeight: '700' }}>
        {label}
      </AppText>
    </View>
  );
}

/** Compact "86" score badge tinted by band, used in lists. */
export function ScoreBadge({ score }: { score: number }) {
  const { colors, radii } = useTheme();
  const t = useStrings(common);
  const band = useBandLabel();
  return (
    <View
      accessible
      accessibilityLabel={fmt(t.scoreA11y, { score, band: band(score) })}
      style={[styles.badge, { borderColor: colors[bandColor(score)], borderRadius: radii.full }]}>
      <View style={[styles.dot, { backgroundColor: colors[bandColor(score)] }]} />
      {/* One text run: Android may break a separate "/100" Text after the slash and clip it. */}
      <AppText variant="labelLarge" numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
        {String(score)}
        <AppText variant="labelSmall" color="onSurfaceVariant">
          /100
        </AppText>
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, paddingHorizontal: 10, minHeight: 28, flexShrink: 0 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 2 },
});
