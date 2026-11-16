import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useChat } from '@/store/chat';
import { colors, fonts } from '@/theme';
import { BorderBeam } from './fx/effects';
import { ArrowUp, ChevronDown, EffortBars, PlusIcon, StopIcon } from './icons';
import { ModelSheet } from './ModelSheet';

const EFFORT_LABEL = { low: 'Hızlı', medium: 'Orta', high: 'Derin' } as const;
const EFFORT_LEVEL = { low: 1, medium: 2, high: 3 } as const;

/** Mesaj kutusu: model seçici, düşünme seviyesi, gönder / durdur. */
export function Composer({ onSend, busy }: { onSend: (text: string) => void; busy: boolean }) {
  const [text, setText] = useState('');
  const [sheet, setSheet] = useState(false);
  const { models, model, effort, stop } = useChat();
  const current = models.find((m) => m.id === model);
  const canSend = text.trim().length > 0 && !busy;

  const submit = () => {
    if (!canSend) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(text);
    setText('');
  };

  return (
    <>
      <BorderBeam radius={28} active={busy} style={styles.beam}>
        <View style={styles.card}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={busy ? 'Yanıt yazılıyor…' : "Gur'a sor…"}
            placeholderTextColor={colors.faint}
            multiline
            style={styles.input}
            selectionColor={colors.gold}
            accessibilityLabel="Mesaj"
          />
          <View style={styles.row}>
            <Pressable style={styles.chip} onPress={() => setSheet(true)} accessibilityLabel="Model seç">
              <View style={styles.dot} />
              <Text style={styles.chipText}>{current?.name.replace(/^Gur /, '') ?? 'Model'}</Text>
              <ChevronDown />
            </Pressable>
            {current?.reasoning && (
              <Pressable style={styles.chip} onPress={() => setSheet(true)} accessibilityLabel="Düşünme seviyesi">
                <EffortBars level={EFFORT_LEVEL[effort]} />
                <Text style={[styles.chipText, { color: colors.muted }]}>{EFFORT_LABEL[effort]}</Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            <Pressable style={styles.ghost} accessibilityLabel="Ek ekle (yakında)" disabled>
              <PlusIcon size={17} color={colors.faint} />
            </Pressable>
            {busy ? (
              <Pressable style={styles.action} onPress={stop} accessibilityLabel="Durdur">
                <StopIcon />
              </Pressable>
            ) : (
              <Pressable
                style={[styles.action, !canSend && styles.actionOff]}
                onPress={submit}
                disabled={!canSend}
                accessibilityLabel="Gönder"
              >
                <ArrowUp color={canSend ? '#151210' : colors.faint} />
              </Pressable>
            )}
          </View>
        </View>
      </BorderBeam>
      <ModelSheet visible={sheet} onClose={() => setSheet(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  beam: { borderRadius: 28 },
  card: {
    borderRadius: 28,
    backgroundColor: colors.composer,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 10,
  },
  input: {
    color: colors.text,
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 8,
    paddingTop: 2,
    paddingBottom: 14,
    minHeight: 40,
    maxHeight: 160,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipText: { color: '#CFCAC0', fontFamily: fonts.sansMedium, fontSize: 12.5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  ghost: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  action: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
  },
  actionOff: { backgroundColor: 'rgba(255,255,255,0.06)' },
});
