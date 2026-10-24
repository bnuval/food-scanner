import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Card, SectionHeader } from '@/components/surfaces';
import { fmt, useStrings, type Lang } from '@/i18n';
import type { FlaggedIngredient } from '@/shared/api-schema';
import { useTheme } from '@/theme';

import { pickText } from './format';
import { resultStrings } from './strings';

const COLLAPSED_LINES = 3;

type IngredientListProps = { items: FlaggedIngredient[]; textLang: Lang };

/** "Ingredients of concern": warning rows whose long explanations collapse to 3 lines. */
export function IngredientList({ items, textLang }: IngredientListProps) {
  const { colors, spacing } = useTheme();
  const t = useStrings(resultStrings);

  return (
    <View>
      <SectionHeader
        title={t.ingredientsTitle}
        subtitle={items.length > 0 ? fmt(t.ingredientsCount, { count: items.length }) : undefined}
        icon="warning"
        iconColor="avoid"
      />
      <Card padded={false}>
        {items.length === 0 ? (
          <View style={[styles.row, { padding: spacing.lg, gap: spacing.md }]}>
            <Icon name="checkCircle" size={20} color="buy" />
            <AppText variant="bodyMedium" color="onSurfaceVariant" style={styles.fill}>
              {t.noFlagged}
            </AppText>
          </View>
        ) : (
          items.map((item, index) => (
            <View
              key={`${index}-${item.name}`}
              style={
                index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.outlineVariant } : null
              }>
              <IngredientRow name={item.name} concern={pickText(item.concern, item.concernHindi, textLang)} />
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

function IngredientRow({ name, concern }: { name: string; concern: string }) {
  const { spacing } = useTheme();
  const t = useStrings(resultStrings);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  return (
    <View style={[styles.row, { padding: spacing.lg, paddingBottom: overflows ? spacing.xs : spacing.lg, gap: spacing.md }]}>
      <View style={{ paddingTop: spacing.xxs }}>
        <Icon name="warning" size={20} color="avoid" />
      </View>
      <View style={[styles.fill, { gap: spacing.xs }]}>
        <AppText variant="titleSmall">{name}</AppText>
        {concern ? (
          <View>
            <AppText
              variant="bodyMedium"
              color="onSurfaceVariant"
              numberOfLines={expanded ? undefined : COLLAPSED_LINES}
              // Screen readers always get the full text, even while it is visually collapsed.
              accessibilityLabel={concern}>
              {concern}
            </AppText>
            {/* Invisible full-length copy, measured to decide whether "Show more" is needed. */}
            <AppText
              variant="bodyMedium"
              importantForAccessibility="no"
              accessibilityElementsHidden
              onTextLayout={(event) => setOverflows(event.nativeEvent.lines.length > COLLAPSED_LINES)}
              style={styles.measure}>
              {concern}
            </AppText>
          </View>
        ) : null}
        {overflows ? (
          <Button
            variant="text"
            label={expanded ? t.showLess : t.showMore}
            accessibilityLabel={fmt(expanded ? t.showLessA11y : t.showMoreA11y, { name })}
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((value) => !value)}
            style={styles.toggle}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  measure: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0, pointerEvents: 'none' },
  // Text buttons carry 12dp of side padding; pull it back so the label lines up with the text.
  toggle: { alignSelf: 'flex-start', marginLeft: -12 },
});
