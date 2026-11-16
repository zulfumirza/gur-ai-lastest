import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useChat } from '@/store/chat';
import { colors, fonts } from '@/theme';
import type { Effort } from '@/lib/api';

const EFFORTS: { id: Effort; label: string }[] = [
  { id: 'low', label: 'Hızlı' },
  { id: 'medium', label: 'Orta' },
  { id: 'high', label: 'Derin' },
];

/** Alttan açılan model ve düşünme seviyesi seçici. */
export function ModelSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { models, model, effort, setModel, setEffort } = useChat();
  const current = models.find((m) => m.id === model);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Kapat" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.grip} />
        <Text style={styles.kicker}>MODEL</Text>
        {models.map((m) => {
          const on = m.id === model;
          return (
            <Pressable
              key={m.id}
              disabled={!m.available}
              onPress={() => {
                Haptics.selectionAsync();
                setModel(m.id);
              }}
              style={[styles.row, on && styles.rowOn, !m.available && { opacity: 0.35 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{m.name}</Text>
                <Text style={styles.tag}>{m.available ? m.tagline : 'Yakında'}</Text>
              </View>
              {on && <View style={styles.dot} />}
            </Pressable>
          );
        })}
        {current?.reasoning && (
          <>
            <Text style={[styles.kicker, { marginTop: 18 }]}>DÜŞÜNME</Text>
            <View style={styles.seg}>
              {EFFORTS.map((e) => (
                <Pressable
                  key={e.id}
                  onPress={() => setEffort(e.id)}
                  style={[styles.segItem, effort === e.id && styles.segOn]}
                >
                  <Text style={[styles.segText, effort === e.id && { color: colors.bg }]}>{e.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        {current?.poweredBy ? <Text style={styles.powered}>Altyapı: {current.poweredBy}</Text> : null}
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
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18 },
  rowOn: { backgroundColor: colors.surfaceStrong },
  name: { color: colors.text, fontFamily: fonts.serif, fontSize: 24 },
  tag: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12.5, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  seg: { flexDirection: 'row', gap: 6, paddingHorizontal: 4 },
  segItem: { flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
  segOn: { backgroundColor: colors.text, borderColor: colors.text },
  segText: { color: colors.muted, fontFamily: fonts.sansMedium, fontSize: 13.5 },
  powered: { color: colors.faint, fontFamily: fonts.sans, fontSize: 11.5, textAlign: 'center', marginTop: 18 },
});
