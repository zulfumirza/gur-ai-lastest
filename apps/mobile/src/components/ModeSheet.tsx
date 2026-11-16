import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useChat } from '@/store/chat';
import { MODES } from '@/lib/modes';
import { colors, fonts } from '@/theme';

/** Alttan açılan mod seçici: Sohbet, Code, Design, Research, Work. */
export function ModeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const mode = useChat((s) => s.mode);
  const setMode = useChat((s) => s.setMode);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Kapat" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.grip} />
        <Text style={styles.kicker}>MOD</Text>
        {MODES.map((m) => {
          const on = m.id === mode;
          return (
            <Pressable
              key={m.id}
              onPress={() => {
                Haptics.selectionAsync();
                setMode(m.id);
                onClose();
              }}
              style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && { opacity: 0.7 }]}
              accessibilityState={{ selected: on }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, on && { color: colors.gold }]}>{m.label}</Text>
                <Text style={styles.hint}>{m.hint}</Text>
              </View>
              {on && <View style={styles.dot} />}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(3,3,5,0.6)' },
  sheet: {
    backgroundColor: '#111113',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  grip: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: colors.hairline, marginBottom: 14 },
  kicker: { color: colors.faint, fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2, marginBottom: 8, marginLeft: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18 },
  rowOn: { backgroundColor: colors.surfaceStrong },
  name: { color: colors.text, fontFamily: fonts.display, fontSize: 24 },
  hint: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12.5, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
});
