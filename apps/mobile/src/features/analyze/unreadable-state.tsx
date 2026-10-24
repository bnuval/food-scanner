import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Card, SectionHeader } from '@/components/surfaces';
import { useStrings } from '@/i18n';
import { common } from '@/i18n/common';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme';

import { StateHeader, StateLayout } from './state-layout';
import { analyzeStrings } from './strings';

type Props = {
  /** Server explanation (untrusted AI text; may be empty). */
  reason: string;
  reasonHindi: string;
  onRetake: () => void;
  onRetry: () => void;
};

/** The backend answered but could not read the label: explain, coach, and offer a retake. */
export function UnreadableState({ reason, reasonHindi, onRetake, onRetry }: Props) {
  const { spacing } = useTheme();
  const { lang } = useSettings();
  const t = useStrings(analyzeStrings);
  const c = useStrings(common);
  const shownReason = lang === 'hi' && reasonHindi ? reasonHindi : reason;

  const tips: { icon: IconName; text: string }[] = [
    { icon: 'lightbulb', text: t.tipLight },
    { icon: 'flashOff', text: t.tipGlare },
    { icon: 'cropFree', text: t.tipFill },
    { icon: 'camera', text: t.tipSteady },
    { icon: 'checkCircle', text: t.tipFull },
  ];

  return (
    <StateLayout
      footer={
        <>
          <Button label={t.retake} icon="camera" size="large" fullWidth onPress={onRetake} />
          <Button label={c.retry} icon="refresh" variant="outlined" fullWidth onPress={onRetry} />
        </>
      }>
      <StateHeader icon="cropFree" tone="warning" title={t.unreadableTitle} body={t.unreadableBody} announce />
      {shownReason ? (
        <Card style={{ gap: spacing.xs }}>
          <AppText variant="labelLarge" color="onSurfaceVariant">
            {t.unreadableReason}
          </AppText>
          <AppText variant="bodyMedium">{shownReason}</AppText>
        </Card>
      ) : null}
      <Card variant="outlined">
        <SectionHeader title={t.tipsTitle} icon="lightbulb" />
        <View accessibilityRole="list" style={{ gap: spacing.sm }}>
          {tips.map((tip) => (
            <View key={tip.icon} style={[styles.tip, { gap: spacing.md }]}>
              <Icon name={tip.icon} size={20} color="primary" />
              <AppText variant="bodyMedium" style={styles.tipText}>
                {tip.text}
              </AppText>
            </View>
          ))}
        </View>
      </Card>
    </StateLayout>
  );
}

const styles = StyleSheet.create({
  tip: { flexDirection: 'row', alignItems: 'flex-start' },
  tipText: { flex: 1 },
});
