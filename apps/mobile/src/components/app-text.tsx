import { Text, type TextProps, type TextStyle } from 'react-native';

import { DEVANAGARI_LINE_HEIGHT, fonts, useTheme, type ColorRole, type TypeVariant } from '@/theme';

const DEVANAGARI = /[ऀ-ॿ]/;

export type AppTextProps = TextProps & {
  variant?: TypeVariant;
  color?: ColorRole;
  /** 'auto' detects Devanagari in string children and switches to Hindi typography. */
  lang?: 'auto' | 'en' | 'hi';
  align?: TextStyle['textAlign'];
};

/**
 * The only text primitive in the app: Material 3 type scale + theme colours, and
 * Noto Sans Devanagari with taller line height for Hindi so matras never clip.
 */
export function AppText({
  variant = 'bodyMedium',
  color = 'onSurface',
  lang = 'auto',
  align,
  style,
  children,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  const base = theme.typography[variant];
  const isHindi = lang === 'hi' || (lang === 'auto' && typeof children === 'string' && DEVANAGARI.test(children));

  const hindi: TextStyle | null = isHindi
    ? {
        fontFamily: Number(base.fontWeight) >= 600 ? fonts.devanagariSemiBold : fonts.devanagari,
        // Custom font files carry their own weight; let Android not synthesize bold.
        fontWeight: 'normal',
        lineHeight: Math.round(base.fontSize * DEVANAGARI_LINE_HEIGHT),
        letterSpacing: 0,
      }
    : null;

  return (
    <Text
      {...rest}
      style={[base, { color: theme.colors[color] }, hindi, align ? { textAlign: align } : null, style]}>
      {children}
    </Text>
  );
}
