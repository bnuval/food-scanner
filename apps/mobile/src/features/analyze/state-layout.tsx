import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { useTheme, type ColorRole } from '@/theme';

type LayoutProps = {
  children: ReactNode;
  /** Actions pinned below the scrolling content, within thumb reach. */
  footer?: ReactNode;
};

/** Scrolling body plus an optional pinned footer; fills the space under the app bar. */
export function StateLayout({ children, footer }: LayoutProps) {
  const { spacing } = useTheme();
  return (
    <>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={{ gap: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg }}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {footer ? <View style={{ gap: spacing.sm, paddingTop: spacing.md }}>{footer}</View> : null}
    </>
  );
}

type Tone = 'warning' | 'error' | 'info';

const TONE: Record<Tone, { bg: ColorRole; fg: ColorRole }> = {
  warning: { bg: 'warningContainer', fg: 'onWarningContainer' },
  error: { bg: 'errorContainer', fg: 'onErrorContainer' },
  info: { bg: 'tertiaryContainer', fg: 'onTertiaryContainer' },
};

type HeaderProps = {
  icon: IconName;
  tone: Tone;
  title: string;
  body?: string;
  /** Announce the title when it appears (skip when a Banner below already announces). */
  announce?: boolean;
};

/** Centered icon, headline and supporting text for an outcome state. */
export function StateHeader({ icon, tone, title, body, announce = false }: HeaderProps) {
  const { colors, spacing } = useTheme();
  const palette = TONE[tone];
  return (
    <View style={[styles.header, { gap: spacing.md, paddingTop: spacing.lg }]}>
      <View style={[styles.badge, { backgroundColor: colors[palette.bg] }]}>
        <Icon name={icon} size={36} color={palette.fg} />
      </View>
      <AppText
        variant="headlineSmall"
        align="center"
        accessibilityRole="header"
        accessibilityLiveRegion={announce ? 'polite' : 'none'}>
        {title}
      </AppText>
      {body ? (
        <AppText variant="bodyLarge" color="onSurfaceVariant" align="center">
          {body}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { alignItems: 'center' },
  badge: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
