import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { useStrings, type Lang } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { MIN_TOUCH, useTheme } from '@/theme';

import { resultStrings } from './strings';

type LanguageToggleProps = { value: Lang; onChange: (lang: Lang) => void };

/**
 * Material 3 two-segment button ("English | हिन्दी") that switches the AI explanation
 * language. Exposed to TalkBack as a radio group.
 */
export function LanguageToggle({ value, onChange }: LanguageToggleProps) {
  const { colors, radii, spacing } = useTheme();
  const t = useStrings(resultStrings);
  const options: { lang: Lang; label: string; a11y: string }[] = [
    { lang: 'en', label: t.langEnglish, a11y: t.langEnglishA11y },
    { lang: 'hi', label: t.langHindi, a11y: t.langHindiA11y },
  ];

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t.explanationLanguage}
      style={[styles.group, { borderColor: colors.outline, borderRadius: radii.full }]}>
      {options.map((option, index) => {
        const selected = option.lang === value;
        return (
          <Pressable
            key={option.lang}
            accessibilityRole="radio"
            accessibilityLabel={option.a11y}
            accessibilityState={{ checked: selected }}
            android_ripple={{ color: `${colors.onSurface}1F` }}
            onPress={() => {
              if (selected) return;
              haptic('tick');
              onChange(option.lang);
            }}
            style={[
              styles.segment,
              {
                gap: spacing.sm,
                paddingHorizontal: spacing.md,
                backgroundColor: selected ? colors.secondaryContainer : 'transparent',
                borderLeftWidth: index > 0 ? 1 : 0,
                borderColor: colors.outline,
              },
            ]}>
            {selected ? <Icon name="check" size={18} color="onSecondaryContainer" /> : null}
            <AppText variant="labelLarge" color={selected ? 'onSecondaryContainer' : 'onSurface'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', borderWidth: 1, overflow: 'hidden' },
  segment: { flex: 1, minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
