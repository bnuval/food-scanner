import Svg, { Path } from 'react-native-svg';

import { useTheme, type ColorRole } from '@/theme';

import { ICON_PATHS, type IconName } from './icon-paths';

export type { IconName };

type IconProps = {
  name: IconName;
  size?: number;
  /** Theme colour role, or any colour string. */
  color?: ColorRole | (string & {});
};

/** Decorative by default: the surrounding control carries the accessible label. */
export function Icon({ name, size = 24, color = 'onSurface' }: IconProps) {
  const { colors } = useTheme();
  const fill = color in colors ? colors[color as ColorRole] : color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false} importantForAccessibility="no">
      <Path d={ICON_PATHS[name]} fill={fill} />
    </Svg>
  );
}
