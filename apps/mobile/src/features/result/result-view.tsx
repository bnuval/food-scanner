import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Banner, Card, Chip, SectionHeader } from '@/components/surfaces';
import { fmt, useStrings, type Lang } from '@/i18n';
import { useMarketName } from '@/i18n/markets';
import type { ScanRecord } from '@/lib/history';
import { useTheme } from '@/theme';

import { Alternatives } from './alternatives';
import { pickText, productLabel } from './format';
import { IngredientList } from './ingredient-list';
import { LanguageToggle } from './language-toggle';
import { ResultFooter } from './result-footer';
import { ResultHero } from './result-hero';
import { resultStrings } from './strings';

/** True when the AI returned any Hindi text, i.e. the English | हिन्दी toggle is worth showing. */
export function hasHindiText(record: ScanRecord): boolean {
  const { result } = record;
  return (
    result.primaryReasonHindi.length > 0 ||
    result.complianceNotesHindi.length > 0 ||
    result.flaggedIngredients.some((item) => item.concernHindi.length > 0)
  );
}

type ResultViewProps = {
  record: ScanRecord;
  /** Language for the AI explanation text (reasons, compliance notes, concerns). */
  textLang: Lang;
  /** Present only when Hindi text exists. */
  onChangeTextLang?: (lang: Lang) => void;
};

/** Body of the result screen. All AI text is rendered as plain text through AppText. */
export function ResultView({ record, textLang, onChangeTextLang }: ResultViewProps) {
  const { spacing } = useTheme();
  const t = useStrings(resultStrings);
  const { result } = record;
  const buy = result.verdict === 'BUY';
  const marketName = useMarketName();
  const market = marketName(record.market);
  const reason = pickText(result.primaryReason, result.primaryReasonHindi, textLang);
  const compliance = pickText(result.complianceNotes, result.complianceNotesHindi, textLang);

  const sections: { key: string; node: ReactNode }[] = [{ key: 'hero', node: <ResultHero record={record} /> }];

  if (!result.isReadable) {
    sections.push({ key: 'unreadable', node: <Banner tone="warning" message={t.unreadable} /> });
  }

  if (onChangeTextLang) {
    sections.push({ key: 'language', node: <LanguageToggle value={textLang} onChange={onChangeTextLang} /> });
  }

  sections.push({
    key: 'reason',
    node: (
      <View>
        <SectionHeader
          title={buy ? t.whyBuy : t.whyAvoid}
          icon={buy ? 'checkCircle' : 'block'}
          iconColor={buy ? 'buy' : 'avoid'}
        />
        {/* Announces the new text when the explanation language is switched. */}
        <Card accessibilityLiveRegion="polite">
          <AppText variant="bodyLarge" color={reason ? 'onSurface' : 'onSurfaceVariant'}>
            {reason || t.noReason}
          </AppText>
        </Card>
      </View>
    ),
  });

  sections.push({ key: 'ingredients', node: <IngredientList items={result.flaggedIngredients} textLang={textLang} /> });

  if (result.positiveHighlights.length > 0) {
    sections.push({
      key: 'highlights',
      node: (
        <View>
          <SectionHeader title={t.highlightsTitle} icon="eco" />
          <View style={[styles.chips, { gap: spacing.sm }]}>
            {result.positiveHighlights.map((highlight, i) => (
              <Chip key={`${i}-${highlight}`} label={highlight} icon="check" style={styles.chip} />
            ))}
          </View>
        </View>
      ),
    });
  }

  if (compliance) {
    sections.push({
      key: 'compliance',
      node: (
        <View>
          <SectionHeader title={fmt(t.complianceTitle, { market })} icon="shield" />
          <Card>
            <AppText variant="bodyMedium">{compliance}</AppText>
          </Card>
        </View>
      ),
    });
  }

  sections.push({
    key: 'alternatives',
    node: (
      <Alternatives items={result.alternatives} verdict={result.verdict} score={result.healthScore} marketName={market} />
    ),
  });

  sections.push({
    key: 'footer',
    node: (
      <ResultFooter
        product={productLabel(result.brandName, result.productName) || t.productFallback}
        createdAt={record.createdAt}
      />
    ),
  });

  return (
    <>
      {sections.map((section, index) => (
        <Section key={section.key} index={index}>
          {section.node}
        </Section>
      ))}
    </>
  );
}

/** Subtle staggered entrance; Reanimated skips it when the system "remove animations" setting is on. */
function Section({ index, children }: { index: number; children: ReactNode }) {
  const { motion } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(motion.medium).delay(Math.min(index, 6) * 50)}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { maxWidth: '100%' },
});
