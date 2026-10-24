import { useColorScheme } from 'react-native';

import { useSettings } from '@/state/settings';

import { darkColors, lightColors, motion, radii, spacing, typography, type Colors } from './tokens';

export * from './tokens';

export type Theme = {
  dark: boolean;
  colors: Colors;
  typography: typeof typography;
  spacing: typeof spacing;
  radii: typeof radii;
  motion: typeof motion;
};

const light: Theme = { dark: false, colors: lightColors, typography, spacing, radii, motion };
const dark: Theme = { dark: true, colors: darkColors, typography, spacing, radii, motion };

/** Active theme: the user's Settings choice, otherwise the system light/dark mode. */
export function useTheme(): Theme {
  const system = useColorScheme();
  const { theme } = useSettings();
  const isDark = theme === 'system' ? system === 'dark' : theme === 'dark';
  return isDark ? dark : light;
}
