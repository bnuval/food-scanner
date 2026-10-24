import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { ScoreRing } from '@/components/score-ring';
import { Card } from '@/components/surfaces';
import { VerdictPill } from '@/components/verdict';
import { fmt, useStrings } from '@/i18n';
import type { ScanRecord } from '@/lib/history';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme';

import { formatScanDate } from './format';
import { resultStrings } from './strings';

const THUMB_SIZE = 72;
const RING_SIZE = 148;

/** Product identity (thumbnail, brand, name, category, date) plus the score ring and verdict. */
export function ResultHero({ record }: { record: ScanRecord }) {
  const { spacing } = useTheme();
  const { lang } = useSettings();
  const t = useStrings(resultStrings);
  const { result } = record;

  const date = formatScanDate(record.createdAt, lang);
  const meta = [result.category, date ? fmt(t.scannedOn, { date }) : '']
    .filter((part) => part.length > 0)
    .join(' · ');

  return (
    <Card>
      <View style={[styles.identity, { gap: spacing.lg }]}>
        <Thumbnail uri={record.thumbUri} />
        <View style={[styles.identityText, { gap: spacing.xxs }]}>
          {result.brandName ? (
            <AppText variant="labelLarge" color="primary">
              {result.brandName}
            </AppText>
          ) : null}
          <AppText variant="titleLarge" accessibilityRole="header">
            {result.productName || t.productFallback}
          </AppText>
          {meta ? (
            <AppText variant="bodySmall" color="onSurfaceVariant">
              {meta}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={[styles.score, { gap: spacing.lg, marginTop: spacing.xl }]}>
        <ScoreRing score={result.healthScore} size={RING_SIZE} />
        {/* The pill aligns itself to flex-start; this wrapper shrinks to it so it centres. */}
        <View>
          <VerdictPill verdict={result.verdict} size="large" />
        </View>
      </View>
    </Card>
  );
}

/** Label photo thumbnail (decorative); a neutral tile when there is none or it fails to load. */
function Thumbnail({ uri }: { uri: string | null }) {
  const { colors, radii } = useTheme();
  const [failed, setFailed] = useState(false);
  const frame = { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: radii.md };

  if (!uri || failed) {
    return (
      <View style={[styles.placeholder, frame, { backgroundColor: colors.surfaceContainerHighest }]}>
        <Icon name="image" size={28} color="onSurfaceVariant" />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      contentFit="cover"
      cachePolicy="memory"
      transition={150}
      onError={() => setFailed(true)}
      style={[frame, { backgroundColor: colors.surfaceContainerHighest }]}
    />
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'flex-start' },
  identityText: { flex: 1 },
  score: { alignItems: 'center' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
