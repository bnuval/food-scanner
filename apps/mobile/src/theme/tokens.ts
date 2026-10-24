import type { TextStyle } from 'react-native';

/**
 * Material 3 colour roles generated from the PureBite brand seed (emerald #10B981).
 * Verdict colours are fixed (not seed-derived), differ in lightness as well as hue so
 * they survive colour-blindness / grayscale, and are always paired with an icon + text.
 */
export const lightColors = {
  primary: '#006C4C',
  onPrimary: '#FFFFFF',
  primaryContainer: '#89F8C7',
  onPrimaryContainer: '#002114',
  secondary: '#4C6358',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#CEE9DA',
  onSecondaryContainer: '#092016',
  tertiary: '#3D6373',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#C1E8FB',
  onTertiaryContainer: '#001F29',
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  background: '#F5FBF5',
  onBackground: '#171D1A',
  surface: '#F5FBF5',
  onSurface: '#171D1A',
  surfaceVariant: '#DBE5DD',
  onSurfaceVariant: '#404943',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#EFF5EF',
  surfaceContainer: '#E9EFE9',
  surfaceContainerHigh: '#E4EAE4',
  surfaceContainerHighest: '#DEE4DE',
  outline: '#707973',
  outlineVariant: '#BFC9C2',
  inverseSurface: '#2C322E',
  inverseOnSurface: '#ECF2ED',
  inversePrimary: '#6CDBAC',
  scrim: '#000000',

  buy: '#1E7A46',
  onBuy: '#FFFFFF',
  buyContainer: '#C8F0D4',
  onBuyContainer: '#00210E',
  avoid: '#A8231B',
  onAvoid: '#FFFFFF',
  avoidContainer: '#FFDAD4',
  onAvoidContainer: '#3E0402',
  warning: '#7A5900',
  warningContainer: '#FFDF9E',
  onWarningContainer: '#261A00',

  bandExcellent: '#1E7A46',
  bandGood: '#3F7A1E',
  bandPoor: '#B05A00',
  bandBad: '#A8231B',
} as const;

export type ColorRole = keyof typeof lightColors;
export type Colors = Record<ColorRole, string>;

export const darkColors: Colors = {
  primary: '#6CDBAC',
  onPrimary: '#003825',
  primaryContainer: '#005138',
  onPrimaryContainer: '#89F8C7',
  secondary: '#B3CCBF',
  onSecondary: '#1E352A',
  secondaryContainer: '#354B40',
  onSecondaryContainer: '#CEE9DA',
  tertiary: '#A5CCDF',
  onTertiary: '#073543',
  tertiaryContainer: '#244C5B',
  onTertiaryContainer: '#C1E8FB',
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
  background: '#0F1512',
  onBackground: '#DEE4DE',
  surface: '#0F1512',
  onSurface: '#DEE4DE',
  surfaceVariant: '#404943',
  onSurfaceVariant: '#BFC9C2',
  surfaceContainerLowest: '#0A0F0D',
  surfaceContainerLow: '#171D1A',
  surfaceContainer: '#1B211E',
  surfaceContainerHigh: '#252B28',
  surfaceContainerHighest: '#303633',
  outline: '#8A938C',
  outlineVariant: '#404943',
  inverseSurface: '#DEE4DE',
  inverseOnSurface: '#2C322E',
  inversePrimary: '#006C4C',
  scrim: '#000000',

  buy: '#7BDB9C',
  onBuy: '#00391B',
  buyContainer: '#0F5230',
  onBuyContainer: '#C8F0D4',
  avoid: '#FFB4A8',
  onAvoid: '#690003',
  avoidContainer: '#8A1A12',
  onAvoidContainer: '#FFDAD4',
  warning: '#F2BF48',
  warningContainer: '#5C4300',
  onWarningContainer: '#FFDF9E',

  bandExcellent: '#7BDB9C',
  bandGood: '#B4D98B',
  bandPoor: '#FFB86E',
  bandBad: '#FFB4A8',
};

/** Material 3 type scale (sp). Line heights are generous enough for Devanagari at 1x. */
export const typography = {
  displaySmall: { fontSize: 36, lineHeight: 44, fontWeight: '400' },
  headlineLarge: { fontSize: 32, lineHeight: 40, fontWeight: '400' },
  headlineMedium: { fontSize: 28, lineHeight: 36, fontWeight: '400' },
  headlineSmall: { fontSize: 24, lineHeight: 32, fontWeight: '400' },
  titleLarge: { fontSize: 22, lineHeight: 28, fontWeight: '500' },
  titleMedium: { fontSize: 16, lineHeight: 24, fontWeight: '600', letterSpacing: 0.15 },
  titleSmall: { fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: 0.1 },
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0.25 },
  bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: '400', letterSpacing: 0.2 },
  bodySmall: { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0.3 },
  labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: 0.1 },
  labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4 },
  labelSmall: { fontSize: 11, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4 },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof typography;

/** Devanagari needs ~1.55x line height; matra and conjuncts clip at Latin metrics. */
export const DEVANAGARI_LINE_HEIGHT = 1.55;

export const fonts = {
  devanagari: 'NotoSansDevanagari_400Regular',
  devanagariSemiBold: 'NotoSansDevanagari_600SemiBold',
} as const;

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radii = { xs: 4, sm: 8, md: 12, lg: 16, xl: 28, full: 999 } as const;

/** Content never stretches wider than this on tablets / foldables / landscape. */
export const MAX_CONTENT_WIDTH = 600;

/** Minimum touch target (dp). */
export const MIN_TOUCH = 48;

export const motion = {
  short: 150,
  medium: 300,
  long: 500,
  scoreRing: 700,
  spring: { damping: 18, stiffness: 180, mass: 1 },
} as const;
