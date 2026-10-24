import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';

import { IconButton } from '@/components/button';
import { Icon } from '@/components/icon';
import { useStrings } from '@/i18n';
import { MIN_TOUCH, useTheme } from '@/theme';

import { searchStrings } from './strings';

/** Matches SearchRequestSchema's query limit. */
const MAX_QUERY_LENGTH = 100;

type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  /** Called from the keyboard's search key and the trailing submit button. */
  onSubmit: () => void;
  /** Called after the field has been emptied by the clear button. */
  onClear: () => void;
  placeholder: string;
  accessibilityLabel: string;
};

/**
 * Material 3 search bar: pill on surfaceContainerHigh, leading search icon, trailing
 * clear + submit actions. Grows with font scale (min height only, no fixed height).
 */
export function SearchField({ value, onChangeText, onSubmit, onClear, placeholder, accessibilityLabel }: SearchFieldProps) {
  const { colors, radii, spacing, typography } = useTheme();
  const t = useStrings(searchStrings);
  const inputRef = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);
  const canSubmit = value.trim().length > 0;

  const clear = () => {
    onChangeText('');
    onClear();
    inputRef.current?.focus();
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surfaceContainerHigh,
          borderRadius: radii.full,
          // Always 2dp so focusing doesn't shift the layout; only the colour changes.
          borderColor: focused ? colors.primary : 'transparent',
          paddingLeft: spacing.lg,
          paddingRight: spacing.xs,
          gap: spacing.md,
        },
      ]}>
      <Icon name="search" size={24} color={focused ? 'primary' : 'onSurfaceVariant'} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={() => {
          if (canSubmit) onSubmit();
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceVariant}
        cursorColor={colors.primary}
        selectionColor={`${colors.primary}55`}
        selectionHandleColor={colors.primary}
        underlineColorAndroid="transparent"
        returnKeyType="search"
        submitBehavior="blurAndSubmit"
        maxLength={MAX_QUERY_LENGTH}
        autoCapitalize="sentences"
        autoComplete="off"
        importantForAutofill="no"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={t.fieldHint}
        style={[
          styles.input,
          {
            color: colors.onSurface,
            fontSize: typography.bodyLarge.fontSize,
            letterSpacing: typography.bodyLarge.letterSpacing,
            paddingVertical: spacing.md,
          },
        ]}
      />
      <View style={styles.actions}>
        {value.length > 0 ? <IconButton icon="close" accessibilityLabel={t.clearText} onPress={clear} /> : null}
        <IconButton
          icon="arrowForward"
          variant={canSubmit ? 'filled' : 'standard'}
          accessibilityLabel={t.submit}
          disabled={!canSubmit}
          onPress={onSubmit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH + 8, borderWidth: 2 },
  // Keep Android font padding: Devanagari matras clip without it.
  input: { flex: 1, minHeight: MIN_TOUCH, textAlignVertical: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center' },
});
