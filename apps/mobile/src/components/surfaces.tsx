import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { MIN_TOUCH, useTheme, type ColorRole } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

type CardProps = ViewProps & {
  variant?: 'filled' | 'outlined' | 'elevated';
  padded?: boolean;
};

/** Material 3 card. */
export function Card({ variant = 'filled', padded = true, style, ...rest }: CardProps) {
  const { colors, radii, spacing } = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: radii.lg,
          backgroundColor: variant === 'outlined' ? colors.surface : colors.surfaceContainerLow,
          borderWidth: variant === 'outlined' ? 1 : 0,
          borderColor: colors.outlineVariant,
          padding: padded ? spacing.lg : 0,
          elevation: variant === 'elevated' ? 1 : 0,
        },
        style,
      ]}
      {...rest}
    />
  );
}

type ChipProps = {
  label: string;
  selected?: boolean;
  icon?: IconName;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** 'radio' for single-select filter groups (announced as "radio button, checked"). */
  accessibilityRole?: 'button' | 'radio';
  /**
   * Let a long label wrap onto more lines instead of ellipsizing. Defaults to true for
   * non-pressable chips (e.g. AI highlights must be fully readable) and false for
   * interactive ones, which stay single-line.
   */
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Material 3 filter chip (with onPress) or assist/suggestion chip. At least 48x48dp touch target. */
export function Chip({
  label,
  selected = false,
  icon,
  onPress,
  accessibilityLabel,
  accessibilityRole = 'button',
  wrap = !onPress,
  style,
}: ChipProps) {
  const { colors, radii } = useTheme();
  const content = (
    <View
      style={[
        styles.chip,
        wrap && styles.chipWrap,
        {
          borderRadius: radii.sm,
          backgroundColor: selected ? colors.secondaryContainer : 'transparent',
          borderColor: selected ? colors.secondaryContainer : colors.outline,
        },
      ]}>
      {selected ? (
        <Icon name="check" size={18} color="onSecondaryContainer" />
      ) : icon ? (
        <Icon name={icon} size={18} color="primary" />
      ) : null}
      <AppText
        variant="labelLarge"
        color={selected ? 'onSecondaryContainer' : 'onSurfaceVariant'}
        numberOfLines={wrap ? undefined : 1}
        style={styles.chipLabel}>
        {label}
      </AppText>
    </View>
  );
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={accessibilityRole === 'radio' ? { checked: selected } : { selected }}
      hitSlop={{ top: (MIN_TOUCH - 32) / 2, bottom: (MIN_TOUCH - 32) / 2 }}
      android_ripple={{ color: `${colors.onSurface}1F`, borderless: false }}
      style={[{ borderRadius: radii.sm, overflow: 'hidden' }, style]}>
      {content}
    </Pressable>
  );
}

type BannerTone = 'info' | 'warning' | 'error' | 'success';

const BANNER: Record<BannerTone, { bg: ColorRole; fg: ColorRole; icon: IconName }> = {
  info: { bg: 'tertiaryContainer', fg: 'onTertiaryContainer', icon: 'info' },
  warning: { bg: 'warningContainer', fg: 'onWarningContainer', icon: 'warning' },
  error: { bg: 'errorContainer', fg: 'onErrorContainer', icon: 'warning' },
  success: { bg: 'buyContainer', fg: 'onBuyContainer', icon: 'checkCircle' },
};

type BannerProps = {
  tone?: BannerTone;
  icon?: IconName;
  title?: string;
  message: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Inline status message. Announced politely to screen readers when it appears. */
export function Banner({ tone = 'info', icon, title, message, action, style }: BannerProps) {
  const { colors, radii, spacing } = useTheme();
  const palette = BANNER[tone];
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole={tone === 'error' ? 'alert' : 'summary'}
      style={[
        styles.banner,
        { backgroundColor: colors[palette.bg], borderRadius: radii.md, padding: spacing.md, gap: spacing.md },
        style,
      ]}>
      <Icon name={icon ?? palette.icon} size={22} color={palette.fg} />
      <View style={styles.bannerBody}>
        {title ? (
          <AppText variant="titleSmall" color={palette.fg}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="bodyMedium" color={palette.fg}>
          {message}
        </AppText>
        {action ? <View style={{ marginTop: spacing.sm, alignItems: 'flex-start' }}>{action}</View> : null}
      </View>
    </View>
  );
}

type SectionHeaderProps = { title: string; subtitle?: string; icon?: IconName; iconColor?: ColorRole; trailing?: ReactNode };

export function SectionHeader({ title, subtitle, icon, iconColor = 'primary', trailing }: SectionHeaderProps) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.sectionHeader, { gap: spacing.sm, marginBottom: spacing.sm }]}>
      {icon ? <Icon name={icon} size={20} color={iconColor} /> : null}
      <View style={styles.bannerBody}>
        <AppText variant="titleMedium" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="bodySmall" color="onSurfaceVariant">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  chipLabel: { flexShrink: 1 },
  // minWidth keeps short labels ("All") at a 48dp-wide touch target; hitSlop covers the height.
  chip: {
    minHeight: 32,
    minWidth: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  // Only visible once a wrapped label grows past one line.
  chipWrap: { paddingVertical: 4 },
  banner: { flexDirection: 'row', alignItems: 'flex-start' },
  bannerBody: { flex: 1, gap: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center' },
});
