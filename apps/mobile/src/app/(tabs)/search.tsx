import { skipToken, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';

import { useShowMessage } from '@/components/alert';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { isRetryable, useErrorMessage } from '@/components/error-message';
import { Icon, type IconName } from '@/components/icon';
import { OfflineBanner } from '@/components/offline-banner';
import { Screen, ScreenHeader } from '@/components/screen';
import { Banner, Card, Chip, SectionHeader } from '@/components/surfaces';
import { ProductCard, ProductCardSkeleton } from '@/features/search/product-card';
import { useRecentSearches } from '@/features/search/recent-searches';
import { SearchField } from '@/features/search/search-field';
import { searchStrings, TRENDING } from '@/features/search/strings';
import { useMarketName } from '@/i18n/markets';
import { fmt, useStrings } from '@/i18n';
import { common } from '@/i18n/common';
import { isApiError, searchProducts } from '@/lib/api';
import { openAppStoreListing } from '@/lib/open-link';
import { recheckOnline } from '@/lib/query';
import { searchKeys } from '@/lib/query-keys';
import { SearchRequestSchema, type SearchCategory, type SearchRequest } from '@/shared/api-schema';
import type { Market } from '@/shared/market';
import { useSettings } from '@/state/settings';
import { MIN_TOUCH, useTheme, type ColorRole } from '@/theme';

type Phase = 'idle' | 'loading' | 'paused' | 'error' | 'empty' | 'results';

function toRequest(query: string, categoryType: SearchCategory, userCountry: Market): SearchRequest | null {
  const parsed = SearchRequestSchema.safeParse({ query, categoryType, userCountry });
  return parsed.success ? parsed.data : null;
}

/** Clean-product finder (mirrors the web /search page). */
export default function SearchScreen() {
  const t = useStrings(searchStrings);
  const c = useStrings(common);
  const { spacing } = useTheme();
  const { effectiveMarket: market } = useSettings();
  const errorMessage = useErrorMessage();
  const showMessage = useShowMessage();
  const recent = useRecentSearches();

  const [category, setCategory] = useState<SearchCategory>('food');
  const [text, setText] = useState('');
  /** The query whose results are shown ('' = nothing submitted yet). */
  const [submitted, setSubmitted] = useState('');

  const request = submitted ? toRequest(submitted, category, market) : null;
  const results = useQuery({
    queryKey: searchKeys.results(market, category, submitted),
    queryFn: request ? ({ signal }) => searchProducts(request, { signal }) : skipToken,
  });

  let phase: Phase = 'idle';
  if (request) {
    if (results.data) phase = results.data.products.length > 0 ? 'results' : 'empty';
    // Paused = waiting for the device to reconnect; it resumes on its own.
    else if (results.isPaused) phase = 'paused';
    else if (results.isError && !results.isFetching) phase = 'error';
    else phase = 'loading';
  }
  const products = phase === 'results' ? (results.data?.products ?? []) : [];
  const error = results.error;
  // A forced upgrade can't be retried; offer the store listing instead (Android only).
  const canUpdate = isApiError(error) && error.kind === 'upgrade_required' && Platform.OS === 'android';

  const updateApp = async () => {
    if (!(await openAppStoreListing())) showMessage(c.linkBlocked);
  };

  const retryWhenPaused = async () => {
    // In case a reconnect event was missed; a paused search continues once online.
    await recheckOnline();
    void results.refetch();
  };

  const submit = (raw: string) => {
    const valid = toRequest(raw, category, market);
    if (!valid) return;
    Keyboard.dismiss();
    setText(valid.query);
    recent.add({ query: valid.query, category });
    // Same search again after a failure: the key doesn't change, so fetch explicitly.
    if (valid.query.toLowerCase() === submitted.trim().toLowerCase() && results.isError) void results.refetch();
    setSubmitted(valid.query);
  };

  const changeCategory = (next: SearchCategory) => {
    if (next === category) return;
    setCategory(next);
    setSubmitted('');
  };

  const marketName = useMarketName();
  const marketLabel = marketName(market);
  const recentForCategory = recent.items.filter((s) => s.category === category);

  return (
    <Screen topInset scrollProps={{ keyboardDismissMode: 'on-drag' }}>
      <ScreenHeader title={t.title} subtitle={fmt(t.subtitle, { market: marketLabel })} />
      <OfflineBanner />

      <View accessibilityRole="radiogroup" accessibilityLabel={t.categoryLabel} style={[styles.row, { gap: spacing.sm }]}>
        <Chip
          label={t.categoryFood}
          accessibilityRole="radio"
          selected={category === 'food'}
          onPress={() => changeCategory('food')}
        />
        <Chip
          label={t.categoryCosmetics}
          accessibilityRole="radio"
          selected={category === 'cosmetics'}
          onPress={() => changeCategory('cosmetics')}
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <SearchField
          value={text}
          onChangeText={setText}
          onSubmit={() => submit(text)}
          onClear={() => setSubmitted('')}
          placeholder={category === 'food' ? t.placeholderFood : t.placeholderCosmetics}
          accessibilityLabel={category === 'food' ? t.fieldA11yFood : t.fieldA11yCosmetics}
        />
        <View style={[styles.wrap, { gap: spacing.sm }]}>
          <View style={[styles.trendingLabel, { gap: spacing.xs }]}>
            <Icon name="trendingUp" size={18} color="onSurfaceVariant" />
            <AppText variant="labelLarge" color="onSurfaceVariant">
              {t.trending}
            </AppText>
          </View>
          {TRENDING[category].map((term) => (
            <Chip
              key={term}
              label={term}
              accessibilityLabel={fmt(t.trendingA11y, { term })}
              onPress={() => submit(term)}
            />
          ))}
        </View>
      </View>

      {phase === 'idle' ? (
        <>
          {recentForCategory.length > 0 ? (
            <View>
              <SectionHeader
                title={t.recent}
                icon="history"
                trailing={
                  <Button
                    label={t.clearRecent}
                    variant="text"
                    accessibilityLabel={t.clearRecentA11y}
                    onPress={() => recent.clear(category)}
                  />
                }
              />
              <View style={[styles.wrap, { gap: spacing.sm }]}>
                {recentForCategory.map((item) => (
                  <Chip
                    key={item.query.toLowerCase()}
                    label={item.query}
                    icon="history"
                    accessibilityLabel={fmt(t.recentA11y, { term: item.query })}
                    onPress={() => submit(item.query)}
                  />
                ))}
              </View>
            </View>
          ) : null}
          <StateCard icon="eco" tone="primary" title={t.introTitle} body={t.introBody} />
        </>
      ) : null}

      {request ? (
        <View style={{ gap: spacing.md }}>
          {/* One persistent live region whose content changes with the phase, so TalkBack
              reliably announces "loading" → result count / empty / error. */}
          <View accessibilityLiveRegion="polite" collapsable={false}>
            {phase === 'loading' ? (
              <AppText variant="bodyMedium" color="onSurfaceVariant">
                {t.loading}
              </AppText>
            ) : phase === 'paused' ? (
              <Banner
                tone="warning"
                icon="cloudOff"
                message={t.waiting}
                action={<Button label={c.retry} icon="refresh" variant="tonal" onPress={() => void retryWhenPaused()} />}
              />
            ) : phase === 'error' ? (
              <Banner
                tone="error"
                title={t.errorTitle}
                message={errorMessage(error)}
                action={
                  canUpdate ? (
                    <Button
                      label={c.updateApp}
                      icon="openInNew"
                      variant="tonal"
                      accessibilityLabel={t.updateA11y}
                      onPress={() => void updateApp()}
                    />
                  ) : isRetryable(error) ? (
                    <Button label={c.retry} icon="refresh" variant="tonal" onPress={() => void results.refetch()} />
                  ) : undefined
                }
              />
            ) : phase === 'empty' ? (
              <StateCard icon="search" tone="neutral" title={t.emptyTitle} body={t.emptyBody} />
            ) : (
              <SectionHeader
                title={t.resultsTitle}
                subtitle={fmt(t.resultsSubtitle, { market: marketLabel })}
                icon="shield"
                trailing={
                  <CountPill
                    label={products.length === 1 ? t.vettedCountOne : fmt(t.vettedCount, { n: products.length })}
                    accessibilityLabel={
                      products.length === 1 ? t.resultsA11yOne : fmt(t.resultsA11y, { n: products.length })
                    }
                  />
                }
              />
            )}
          </View>
          {phase === 'loading' ? (
            <>
              <ProductCardSkeleton />
              <ProductCardSkeleton />
              <ProductCardSkeleton />
            </>
          ) : null}
          {products.map((product, i) => (
            <ProductCard key={`${i}-${product.brand}-${product.productName}`} product={product} />
          ))}
        </View>
      ) : null}

      <View style={[styles.disclaimer, { gap: spacing.sm, paddingTop: spacing.sm }]}>
        <Icon name="info" size={16} color="onSurfaceVariant" />
        <AppText variant="bodySmall" color="onSurfaceVariant" style={styles.fill}>
          {c.disclaimer}
        </AppText>
      </View>
    </Screen>
  );
}

/** Centered icon + title + explanation, used for the intro and empty states. */
function StateCard({ icon, tone, title, body }: { icon: IconName; tone: 'primary' | 'neutral'; title: string; body: string }) {
  const { colors, radii, spacing } = useTheme();
  const bg: ColorRole = tone === 'primary' ? 'primaryContainer' : 'surfaceContainerHighest';
  const fg: ColorRole = tone === 'primary' ? 'onPrimaryContainer' : 'onSurfaceVariant';
  return (
    <Card style={[styles.stateCard, { gap: spacing.md, paddingVertical: spacing.xl }]}>
      <View style={[styles.stateIcon, { backgroundColor: colors[bg], borderRadius: radii.xl }]}>
        <Icon name={icon} size={36} color={fg} />
      </View>
      <AppText variant="titleMedium" align="center" accessibilityRole="header">
        {title}
      </AppText>
      <AppText variant="bodyMedium" color="onSurfaceVariant" align="center" style={styles.stateBody}>
        {body}
      </AppText>
    </Card>
  );
}

function CountPill({ label, accessibilityLabel }: { label: string; accessibilityLabel: string }) {
  const { colors, radii, spacing } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.pill,
        { backgroundColor: colors.primaryContainer, borderRadius: radii.full, paddingHorizontal: spacing.md },
      ]}>
      <AppText variant="labelMedium" color="onPrimaryContainer">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  trendingLabel: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH - 16 },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start' },
  stateCard: { alignItems: 'center' },
  stateIcon: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  stateBody: { maxWidth: 340 },
  pill: { minHeight: 24, justifyContent: 'center' },
});
