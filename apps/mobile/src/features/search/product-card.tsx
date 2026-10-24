import { StyleSheet, View } from 'react-native';

import { useShowMessage } from '@/components/alert';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Skeleton } from '@/components/skeleton';
import { Card } from '@/components/surfaces';
import { ScoreBadge } from '@/components/verdict';
import { fmt, useStrings } from '@/i18n';
import { common } from '@/i18n/common';
import { openStoreLink } from '@/lib/open-link';
import type { Product } from '@/shared/api-schema';
import { useTheme } from '@/theme';

import { searchStrings } from './strings';

/**
 * One vetted product from the clean-product search. Every field is AI-generated and
 * rendered as plain text only; store links go through the allowlisted openStoreLink.
 */
export function ProductCard({ product }: { product: Product }) {
  const { colors, radii, spacing } = useTheme();
  const t = useStrings(searchStrings);
  const c = useStrings(common);
  const showMessage = useShowMessage();
  const displayName = product.brand ? `${product.brand} ${product.productName}` : product.productName;

  const openStore = async (url: string) => {
    const opened = await openStoreLink(url, colors.surface);
    if (!opened) showMessage(c.linkBlocked);
  };

  return (
    <Card variant="outlined" style={{ gap: spacing.md }}>
      <View style={[styles.header, { gap: spacing.md }]}>
        <View style={styles.fill}>
          {product.brand ? (
            <AppText variant="labelMedium" color="primary" style={styles.brand}>
              {product.brand}
            </AppText>
          ) : null}
          <AppText variant="titleMedium" accessibilityRole="header">
            {product.productName}
          </AppText>
        </View>
        <ScoreBadge score={product.healthScore} />
      </View>

      {product.verdictReason ? (
        <AppText variant="bodyMedium" color="onSurfaceVariant">
          {product.verdictReason}
        </AppText>
      ) : null}

      {product.highlights.length > 0 ? (
        <View
          accessible
          accessibilityLabel={fmt(t.highlightsA11y, { list: product.highlights.join(', ') })}
          style={[styles.wrap, { gap: spacing.sm }]}>
          {product.highlights.map((highlight, i) => (
            <View
              key={`${i}-${highlight}`}
              style={[
                styles.tag,
                {
                  backgroundColor: colors.surfaceContainerHigh,
                  borderRadius: radii.sm,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  gap: spacing.xs,
                },
              ]}>
              <Icon name="check" size={16} color="primary" />
              <AppText variant="labelMedium" color="onSurfaceVariant" style={styles.tagText}>
                {highlight}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      {product.keyIngredients.length > 0 ? (
        <AppText variant="bodySmall" color="onSurfaceVariant">
          {fmt(t.keyIngredients, { list: product.keyIngredients.join(', ') })}
        </AppText>
      ) : null}

      {product.stores.length > 0 ? (
        <View
          style={[
            styles.stores,
            { borderTopColor: colors.outlineVariant, paddingTop: spacing.md, gap: spacing.sm },
          ]}>
          <AppText variant="labelMedium" color="onSurfaceVariant">
            {t.buyOn}
          </AppText>
          <View style={[styles.wrap, { gap: spacing.sm }]}>
            {product.stores.map((store, i) => (
              <Button
                key={`${i}-${store.url}`}
                label={store.name}
                icon="openInNew"
                variant={i === 0 ? 'tonal' : 'outlined'}
                accessibilityLabel={fmt(t.storeA11y, { product: displayName, store: store.name })}
                accessibilityRole="link"
                onPress={() => void openStore(store.url)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

/** Placeholder with the same rough shape as ProductCard. */
export function ProductCardSkeleton() {
  const { radii, spacing } = useTheme();
  return (
    <Card variant="outlined" style={{ gap: spacing.md }}>
      <View style={[styles.header, { gap: spacing.md }]}>
        <View style={[styles.fill, { gap: spacing.sm }]}>
          <Skeleton width="30%" height={12} />
          <Skeleton width="75%" height={18} />
        </View>
        <Skeleton width={72} height={28} radius={radii.full} />
      </View>
      <View style={{ gap: spacing.xs }}>
        <Skeleton height={14} />
        <Skeleton width="85%" height={14} />
      </View>
      <View style={[styles.wrap, { gap: spacing.sm }]}>
        <Skeleton width={96} height={24} radius={radii.sm} />
        <Skeleton width={120} height={24} radius={radii.sm} />
      </View>
      <View style={[styles.wrap, { gap: spacing.sm }]}>
        <Skeleton width={112} height={40} radius={radii.full} />
        <Skeleton width={112} height={40} radius={radii.full} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  brand: { textTransform: 'uppercase' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', maxWidth: '100%' },
  tagText: { flexShrink: 1 },
  stores: { borderTopWidth: StyleSheet.hairlineWidth },
});
