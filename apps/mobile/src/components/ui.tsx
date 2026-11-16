import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme';

/** Yuvarlak, ince çerçeveli simge butonu. */
export function IconButton({
  children,
  onPress,
  label,
  bare,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  label: string;
  bare?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, bare && styles.bare, pressed && { opacity: 0.6 }, style]}
    >
      {children}
    </Pressable>
  );
}

/** Ekranın en arkasındaki çok hafif doku ve vinyet. */
export function Backdrop({ children }: { children?: React.ReactNode }) {
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>{children}</View>;
}

const styles = StyleSheet.create({
  btn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  bare: { backgroundColor: 'transparent', borderWidth: 0 },
});
