import { StyleSheet, View } from 'react-native';

import { useShowMessage } from '@/components/alert';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Card, SectionHeader } from '@/components/surfaces';
import { ScoreBadge } from '@/components/verdict';
import { fmt, useStrings } from '@/i18n';
import { common } from '@/i18n/common';
import { openStoreLink } from '@/lib/open-link';
import type { Alternative } from '@/shared/api-schema';
import { storeNameFromUrl } from '@/shared/links';
import { useTheme } from '@/theme';

import { resultStrings } from './strings';

type AlternativesProps = {
  items: Alternative[];
  verdict: 'BUY' | 'AVOID';
  /** This product's score, to show how many points better each alternative is. */
  score: number;
  marketName: string;
};

/** "Healthier alternatives" (AVOID) or "Similar top-rated choices" (BUY), with store links. */
export function Alternatives({ items, verdict, score, marketName }: AlternativesProps) {
  const { spacing } = useTheme();
  const t = useStrings(resultStrings);
  const avoid = verdict === 'AVOID';

  return (
    <View>
      <SectionHeader
        title={avoid ? t.altAvoidTitle : t.altBuyTitle}
        subtitle={fmt(t.altSubtitle, { market: marketName })}
        icon={avoid ? 'trendingUp' : 'star'}
      />
      {items.length === 0 ? (
        <Card>
          <AppText variant="bodyMedium" color="onSurfaceVariant">
            {t.altEmpty}
          </AppText>
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {items.map((item, index) => (
            <AlternativeCard key={`${index}-${item.brand}-${item.productName}`} item={item} baseScore={score} />
          ))}
        </View>
      )}
    </View>
  );
}

function AlternativeCard({ item, baseScore }: { item: Alternative; baseScore: number }) {
  const { colors, spacing } = useTheme();
  const t = useStrings(resultStrings);
  const c = useStrings(common);
  const showMessage = useShowMessage();

  const title = item.productName || item.brand;
  const showBrand = item.brand.length > 0 && item.productName.length > 0;
  const gain = item.estimatedScore !== null ? item.estimatedScore - baseScore : 0;
  const url = item.purchaseUrl;
  const store = url ? storeNameFromUrl(url) : null;

  const openStore = async () => {
    if (!url) return;
    const opened = await openStoreLink(url, colors.surface);
    if (!opened) showMessage(c.linkBlocked);
  };

  return (
    <Card variant="outlined" style={{ gap: spacing.sm }}>
      <View style={[styles.header, { gap: spacing.md }]}>
        <View style={styles.fill}>
          {showBrand ? (
            <AppText variant="labelLarge" color="primary">
              {item.brand}
            </AppText>
          ) : null}
          <AppText variant="titleMedium">{title}</AppText>
        </View>
        {item.estimatedScore !== null ? <ScoreBadge score={item.estimatedScore} /> : null}
      </View>
      {gain > 0 ? (
        <View
          accessible
          accessibilityLabel={gain === 1 ? t.altPointsA11yOne : fmt(t.altPointsA11y, { n: gain })}
          style={[styles.gain, { gap: spacing.xs }]}>
          <Icon name="trendingUp" size={16} color="buy" />
          <AppText variant="labelMedium" color="buy">
            {gain === 1 ? t.altPointsOne : fmt(t.altPoints, { n: gain })}
          </AppText>
        </View>
      ) : null}
      {item.whyBetter ? (
        <AppText variant="bodyMedium" color="onSurfaceVariant">
          {item.whyBetter}
        </AppText>
      ) : null}
      {url && store ? (
        <Button
          variant="tonal"
          icon="openInNew"
          label={fmt(t.buyOn, { store })}
          accessibilityLabel={fmt(t.buyOnA11y, { product: title, store })}
          accessibilityRole="link"
          onPress={() => void openStore()}
          style={[styles.buy, { marginTop: spacing.xs }]}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  gain: { flexDirection: 'row', alignItems: 'center' },
  buy: { alignSelf: 'flex-start' },
});
