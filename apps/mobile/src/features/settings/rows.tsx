import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { Card, SectionHeader } from '@/components/surfaces';
import { useTheme } from '@/theme';

/** Minimum height of a settings list item (Material 3 one-line list item). */
const ROW_HEIGHT = 56;

type SettingsSectionProps = { title: string; subtitle?: string; icon: IconName; children: ReactNode };

/** A titled card holding edge-to-edge rows (so ripples reach the card edges). */
export function SettingsSection({ title, subtitle, icon, children }: SettingsSectionProps) {
  const { spacing } = useTheme();
  return (
    <Card padded={false} style={styles.card}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <SectionHeader title={title} subtitle={subtitle} icon={icon} />
      </View>
      <View style={{ paddingBottom: spacing.sm }}>{children}</View>
    </Card>
  );
}

/** Groups RadioRows so TalkBack announces "n of m in <label>". */
export function RadioGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label}>
      {children}
    </View>
  );
}

type RadioRowProps = { label: string; description?: string; checked: boolean; onSelect: () => void };

export function RadioRow({ label, description, checked, onSelect }: RadioRowProps) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ checked }}
      accessibilityLabel={description ? `${label}, ${description}` : label}
      android_ripple={{ color: `${colors.onSurface}1F` }}
      style={[styles.row, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.lg }]}>
      <Icon
        name={checked ? 'radioChecked' : 'radioUnchecked'}
        size={24}
        color={checked ? 'primary' : 'onSurfaceVariant'}
      />
      <View style={styles.body}>
        <AppText variant="bodyLarge">{label}</AppText>
        {description ? (
          <AppText variant="bodySmall" color="onSurfaceVariant">
            {description}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

type LinkRowProps = {
  label: string;
  description?: string;
  icon?: IconName;
  /** chevronRight by default; openInNew for pages that leave the app. */
  trailingIcon?: IconName;
  accessibilityHint?: string;
  onPress: () => void;
};

export function LinkRow({
  label,
  description,
  icon,
  trailingIcon = 'chevronRight',
  accessibilityHint,
  onPress,
}: LinkRowProps) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={description ? `${label}, ${description}` : label}
      accessibilityHint={accessibilityHint}
      android_ripple={{ color: `${colors.onSurface}1F` }}
      style={[styles.row, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.lg }]}>
      {icon ? <Icon name={icon} size={24} color="onSurfaceVariant" /> : null}
      <View style={styles.body}>
        <AppText variant="bodyLarge">{label}</AppText>
        {description ? (
          <AppText variant="bodySmall" color="onSurfaceVariant">
            {description}
          </AppText>
        ) : null}
      </View>
      <Icon name={trailingIcon} size={24} color="onSurfaceVariant" />
    </Pressable>
  );
}

type ActionRowProps = {
  label: string;
  description?: string;
  icon: IconName;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onPress: () => void;
};

/** A row that performs an action in place; 'danger' for destructive ones. */
export function ActionRow({ label, description, icon, tone = 'default', disabled = false, onPress }: ActionRowProps) {
  const { colors, spacing } = useTheme();
  const fg = tone === 'danger' ? 'error' : 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={description ? `${label}, ${description}` : label}
      android_ripple={{ color: `${colors[fg]}1F` }}
      style={[
        styles.row,
        { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.lg, opacity: disabled ? 0.45 : 1 },
      ]}>
      <Icon name={icon} size={24} color={fg} />
      <View style={styles.body}>
        <AppText variant="labelLarge" color={fg}>
          {label}
        </AppText>
        {description ? (
          <AppText variant="bodySmall" color="onSurfaceVariant">
            {description}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

type InfoRowProps = { label: string; value: string; icon?: IconName };

/** Read-only label + value, read by TalkBack as one item. */
export function InfoRow({ label, value, icon }: InfoRowProps) {
  const { spacing } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.row, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.lg }]}>
      {icon ? <Icon name={icon} size={24} color="onSurfaceVariant" /> : null}
      <View style={styles.body}>
        <AppText variant="bodyLarge">{label}</AppText>
        <AppText variant="bodyMedium" color="onSurfaceVariant" selectable>
          {value}
        </AppText>
      </View>
    </View>
  );
}

/** Small explanatory text inside a section. */
export function SectionNote({ text, icon }: { text: string; icon?: IconName }) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.note, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm }]}>
      {icon ? <Icon name={icon} size={18} color="onSurfaceVariant" /> : null}
      <AppText variant="bodyMedium" color="onSurfaceVariant" style={styles.body}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: ROW_HEIGHT },
  body: { flex: 1, minWidth: 0 },
  note: { flexDirection: 'row', alignItems: 'flex-start' },
});
