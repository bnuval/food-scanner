import { Linking, StyleSheet, View } from 'react-native';

import { useShowMessage } from '@/components/alert';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Card } from '@/components/surfaces';
import { fmt, useStrings } from '@/i18n';
import { common } from '@/i18n/common';
import { config } from '@/lib/config';
import { useTheme } from '@/theme';

import { buildReportMailto } from './format';
import { resultStrings } from './strings';

type ResultFooterProps = { product: string; createdAt: number };

/** Medical disclaimer and a "Report a problem" email link (hidden when no support address is configured). */
export function ResultFooter({ product, createdAt }: ResultFooterProps) {
  const { colors, spacing } = useTheme();
  const t = useStrings(resultStrings);
  const c = useStrings(common);
  const email = config.supportEmail;
  const showMessage = useShowMessage();

  const report = async () => {
    if (!email) return;
    try {
      await Linking.openURL(buildReportMailto(t, { email, product, createdAt }));
    } catch {
      showMessage(fmt(t.noEmailApp, { email }));
    }
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Card style={[styles.disclaimer, { gap: spacing.md, backgroundColor: colors.surfaceContainer }]}>
        <Icon name="info" size={18} color="onSurfaceVariant" />
        <AppText variant="bodySmall" color="onSurfaceVariant" style={styles.fill}>
          {c.disclaimer}
        </AppText>
      </Card>
      {email ? (
        <Button variant="text" icon="flag" label={t.reportProblem} onPress={() => void report()} style={styles.report} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start' },
  report: { alignSelf: 'center', maxWidth: '100%' },
});
