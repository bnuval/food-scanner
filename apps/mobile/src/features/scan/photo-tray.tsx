import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { fmt, useStrings } from '@/i18n';
import { PHOTO_SLOTS, type SessionPhoto } from '@/state/scan-session';
import { useTheme } from '@/theme';

import { slotLabel } from './helpers';
import { scanStrings } from './strings';

const THUMB = 52;

type PhotoTrayProps = {
  photos: SessionPhoto[];
  /** Shows a spinner in the next empty slot while a photo is being prepared. */
  processing: boolean;
  onRemove: (id: string) => void;
};

/**
 * One slot per suggested photo (ingredients, nutrition, front/barcode). A filled slot is a
 * 52dp button that removes that photo; its close badge makes the action visible.
 */
export function PhotoTray({ photos, processing, onRemove }: PhotoTrayProps) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.row, { gap: spacing.sm }]}>
      {PHOTO_SLOTS.map((slot, index) => {
        const photo = photos[index];
        if (photo) {
          return <Thumb key={photo.id} photo={photo} index={index} onRemove={onRemove} />;
        }
        return <EmptySlot key={slot} index={index} next={index === photos.length} processing={processing} />;
      })}
    </View>
  );
}

function Thumb({ photo, index, onRemove }: { photo: SessionPhoto; index: number; onRemove: (id: string) => void }) {
  const { colors, radii } = useTheme();
  const t = useStrings(scanStrings);
  const label = fmt(t.removePhoto, { n: index + 1, slot: slotLabel(t, PHOTO_SLOTS[index]) });
  return (
    <View style={[styles.cell, { borderRadius: radii.sm }]}>
      <Pressable
        onPress={() => onRemove(photo.id)}
        accessibilityRole="button"
        accessibilityLabel={label}
        android_ripple={{ color: '#FFFFFF55', foreground: true }}
        style={styles.fill}>
        <Image
          source={{ uri: photo.uri }}
          style={styles.fill}
          contentFit="cover"
          cachePolicy="memory"
          recyclingKey={photo.id}
          transition={120}
          accessible={false}
        />
        <View style={[styles.badge, { backgroundColor: colors.inverseSurface }]}>
          <Icon name="close" size={14} color={colors.inverseOnSurface} />
        </View>
      </Pressable>
    </View>
  );
}

function EmptySlot({ index, next, processing }: { index: number; next: boolean; processing: boolean }) {
  const { colors, radii } = useTheme();
  const t = useStrings(scanStrings);
  const busy = next && processing;
  return (
    <View
      accessible
      accessibilityLabel={busy ? t.processing : fmt(t.emptySlot, { n: index + 1, slot: slotLabel(t, PHOTO_SLOTS[index]) })}
      style={[
        styles.cell,
        styles.empty,
        {
          borderRadius: radii.sm,
          borderColor: next ? colors.primary : colors.outline,
          borderStyle: next ? 'solid' : 'dashed',
          backgroundColor: next ? colors.surfaceContainerHigh : 'transparent',
        },
      ]}>
      {busy ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <AppText variant="titleMedium" color={next ? 'primary' : 'onSurfaceVariant'}>
          {String(index + 1)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  cell: { width: THUMB, height: THUMB, overflow: 'hidden' },
  fill: { flex: 1 },
  empty: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
