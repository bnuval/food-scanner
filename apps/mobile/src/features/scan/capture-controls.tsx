import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/button';
import { Icon } from '@/components/icon';
import { useStrings } from '@/i18n';
import { useTheme } from '@/theme';

import { scanStrings } from './strings';

const SIDE = 56;
const SHUTTER = 72;

type CaptureControlsProps = {
  shutterLabel: string;
  shutterDisabled: boolean;
  processing: boolean;
  galleryDisabled: boolean;
  onShutter: () => void;
  onGallery: () => void;
  /** Omitted when the system document scanner is unavailable. */
  onDocScan?: () => void;
};

/** Gallery · shutter · document scanner, with the shutter centred. */
export function CaptureControls({
  shutterLabel,
  shutterDisabled,
  processing,
  galleryDisabled,
  onShutter,
  onGallery,
  onDocScan,
}: CaptureControlsProps) {
  const t = useStrings(scanStrings);
  return (
    <View style={styles.row}>
      <IconButton
        variant="tonal"
        size={SIDE}
        icon="photoLibrary"
        accessibilityLabel={t.gallery}
        disabled={galleryDisabled}
        onPress={onGallery}
      />
      <ShutterButton label={shutterLabel} disabled={shutterDisabled} processing={processing} onPress={onShutter} />
      {onDocScan ? (
        <IconButton
          variant="tonal"
          size={SIDE}
          icon="documentScanner"
          accessibilityLabel={t.docScan}
          disabled={galleryDisabled}
          onPress={onDocScan}
        />
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

type ShutterButtonProps = { label: string; disabled: boolean; processing: boolean; onPress: () => void };

/** 72dp Material-style shutter: ring + filled disc; spinner while a photo is being prepared. */
function ShutterButton({ label, disabled, processing, onPress }: ShutterButtonProps) {
  const { colors } = useTheme();
  const inactive = disabled && !processing;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || processing}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || processing, busy: processing }}
      android_ripple={{ color: `${colors.primary}40`, borderless: true, radius: SHUTTER / 2 }}
      style={[styles.shutter, { borderColor: inactive ? colors.outlineVariant : colors.primary }]}>
      {({ pressed }) => (
        <View
          style={[
            styles.disc,
            {
              backgroundColor: inactive ? colors.surfaceContainerHighest : colors.primary,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}>
          {processing ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Icon name="camera" size={28} color={inactive ? 'onSurfaceVariant' : 'onPrimary'} />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
  spacer: { width: SIDE, height: SIDE },
  shutter: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: SHUTTER / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: { width: SHUTTER - 16, height: SHUTTER - 16, borderRadius: (SHUTTER - 16) / 2, alignItems: 'center', justifyContent: 'center' },
});
