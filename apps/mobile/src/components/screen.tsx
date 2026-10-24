import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_CONTENT_WIDTH, useTheme } from '@/theme';

import { AppText } from './app-text';

type ScreenProps = {
  children: ReactNode;
  /** Scrollable column (default) or a fixed full-height column. */
  scroll?: boolean;
  /** Apply the top safe-area inset (tab roots without a native header). */
  topInset?: boolean;
  /** Apply the bottom safe-area inset (screens not inside the tab bar). */
  bottomInset?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: Omit<ScrollViewProps, 'children' | 'contentContainerStyle'>;
};

/**
 * Edge-to-edge screen container: theme background, safe-area padding, and content
 * capped at MAX_CONTENT_WIDTH so tablets / foldables / landscape stay readable.
 */
export function Screen({ children, scroll = true, topInset = false, bottomInset = false, contentStyle, scrollProps }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const padding: ViewStyle = {
    paddingTop: (topInset ? insets.top : 0) + spacing.sm,
    paddingBottom: (bottomInset ? insets.bottom : 0) + spacing.xl,
    paddingLeft: Math.max(insets.left, spacing.lg),
    paddingRight: Math.max(insets.right, spacing.lg),
  };

  if (!scroll) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <View style={[styles.fill, styles.column, padding, contentStyle]}>{children}</View>
      </View>
    );
  }
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={[styles.column, padding, { gap: spacing.lg }, contentStyle]}
        keyboardShouldPersistTaps="handled"
        {...scrollProps}>
        {children}
      </ScrollView>
      {/* Edge-to-edge: keep scrolled content from running under the status bar icons. */}
      {topInset ? (
        <View
          pointerEvents="none"
          style={[styles.statusScrim, { height: insets.top, backgroundColor: colors.background }]}
        />
      ) : null}
    </View>
  );
}

type ScreenHeaderProps = { title: string; subtitle?: string; trailing?: ReactNode };

/** Large in-content title for tab roots (Material 3 "medium top app bar" style). */
export function ScreenHeader({ title, subtitle, trailing }: ScreenHeaderProps) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.header, { gap: spacing.md, paddingTop: spacing.sm }]}>
      <View style={styles.fill}>
        <AppText variant="headlineMedium" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="bodyMedium" color="onSurfaceVariant">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-end' },
  statusScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
});
