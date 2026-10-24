import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { MIN_TOUCH, useTheme, type ColorRole } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

type Variant = 'filled' | 'tonal' | 'outlined' | 'text' | 'danger';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  /** 'large' = 56dp primary call-to-action. */
  size?: 'medium' | 'large';
  fullWidth?: boolean;
  /**
   * Keep the label on one line (ellipsized, font scaling capped at SINGLE_LINE_MAX_SCALE).
   * Only for buttons in a constrained row; by default labels wrap and the button grows taller.
   */
  singleLine?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Font-scale cap for single-line labels, so large text doesn't ellipsize them in tight rows. */
const SINGLE_LINE_MAX_SCALE = 1.5;

const PALETTE: Record<Variant, { bg: ColorRole | null; fg: ColorRole; border: ColorRole | null }> = {
  filled: { bg: 'primary', fg: 'onPrimary', border: null },
  tonal: { bg: 'secondaryContainer', fg: 'onSecondaryContainer', border: null },
  outlined: { bg: null, fg: 'primary', border: 'outline' },
  text: { bg: null, fg: 'primary', border: null },
  danger: { bg: 'error', fg: 'onError', border: null },
};

/**
 * Material 3 common button. Always at least 48dp tall; ripple on Android. Long labels
 * (Hindi, large font sizes) wrap onto more lines instead of being cut off.
 */
export function Button({
  label,
  variant = 'filled',
  icon,
  loading = false,
  size = 'medium',
  fullWidth = false,
  singleLine = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { colors, radii } = useTheme();
  const palette = PALETTE[variant];
  const isDisabled = Boolean(disabled) || loading;
  const fg = colors[palette.fg];

  return (
    <View style={[{ borderRadius: radii.full, overflow: 'hidden' }, fullWidth && styles.fullWidth, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        android_ripple={{ color: variant === 'filled' || variant === 'danger' ? '#FFFFFF33' : `${colors.primary}33` }}
        style={({ pressed }) => [
          styles.base,
          {
            minHeight: size === 'large' ? 56 : MIN_TOUCH,
            paddingHorizontal: variant === 'text' ? 12 : 24,
            backgroundColor: palette.bg ? colors[palette.bg] : 'transparent',
            borderColor: palette.border ? colors[palette.border] : 'transparent',
            borderWidth: palette.border ? 1 : 0,
            borderRadius: radii.full,
            opacity: isDisabled ? 0.45 : pressed ? 0.92 : 1,
          },
        ]}
        {...rest}>
        {loading ? (
          <ActivityIndicator color={fg} size="small" />
        ) : icon ? (
          <Icon name={icon} size={20} color={fg} />
        ) : null}
        <AppText
          variant="labelLarge"
          style={[styles.label, { color: fg }]}
          numberOfLines={singleLine ? 1 : undefined}
          maxFontSizeMultiplier={singleLine ? SINGLE_LINE_MAX_SCALE : undefined}>
          {label}
        </AppText>
      </Pressable>
    </View>
  );
}

type IconButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  icon: IconName;
  /** Required: icon-only controls must have an accessible name. */
  accessibilityLabel: string;
  variant?: 'standard' | 'tonal' | 'filled' | 'scrim';
  size?: number;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** 48dp icon button. 'scrim' is for controls drawn over the camera preview. */
export function IconButton({ icon, variant = 'standard', size = 48, selected, disabled, style, ...rest }: IconButtonProps) {
  const { colors } = useTheme();
  const bg =
    variant === 'filled'
      ? colors.primary
      : variant === 'tonal'
        ? colors.secondaryContainer
        : variant === 'scrim'
          ? selected
            ? '#FFFFFFE6'
            : '#00000073'
          : 'transparent';
  const fg =
    variant === 'filled'
      ? colors.onPrimary
      : variant === 'tonal'
        ? colors.onSecondaryContainer
        : variant === 'scrim'
          ? selected
            ? '#000000'
            : '#FFFFFF'
          : colors.onSurfaceVariant;

  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(disabled), selected }}
        disabled={disabled}
        android_ripple={{ color: variant === 'scrim' ? '#FFFFFF40' : `${colors.onSurface}1F` }}
        style={[styles.iconButton, { backgroundColor: bg, opacity: disabled ? 0.4 : 1 }]}
        {...rest}>
        <Icon name={icon} size={24} color={fg} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Vertical padding only shows once a wrapped label outgrows the min height.
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  fullWidth: { alignSelf: 'stretch' },
  label: { flexShrink: 1, textAlign: 'center' },
  iconButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
