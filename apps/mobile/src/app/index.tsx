import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChat } from '@/store/chat';
import { colors, fonts } from '@/theme';
import { Composer } from '@/components/Composer';
import { LightRays, Orb } from '@/components/fx/effects';
import { ChevronDown, MenuIcon, PlusIcon } from '@/components/icons';
import { ModelSheet } from '@/components/ModelSheet';
import { IconButton } from '@/components/ui';

const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MODES = ['Sohbet', 'Code', 'Design', 'Research', 'Work'];
const SUGGESTIONS = [
  { t: 'Bu haftanın işlerini önceliklendir', c: 'Planlama' },
  { t: 'Bir e-postayı daha net yaz', c: 'Yazı' },
  { t: 'Kara delikleri basitçe anlat', c: 'Öğren' },
  { t: 'Bir Rust hatasını birlikte çözelim', c: 'Kod' },
];

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 5) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const { send, streaming, models, model } = useChat();
  const [sheet, setSheet] = useState(false);
  const now = new Date();
  const current = models.find((m) => m.id === model);

  const start = (text: string) => {
    const id = send(text);
    if (id) router.push({ pathname: '/chat/[id]', params: { id } });
  };

  return (
    <View style={styles.root}>
      <LightRays intensity={0.7} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <IconButton label="Menü" onPress={() => router.push('/menu')}>
            <MenuIcon />
          </IconButton>
          <Pressable style={styles.model} onPress={() => setSheet(true)} accessibilityLabel="Model seç">
            <View style={styles.dot} />
            <Text style={styles.modelText}>{current?.name ?? 'Gur'}</Text>
            <ChevronDown />
          </Pressable>
          <IconButton label="Yeni sohbet" onPress={() => {}}>
            <PlusIcon />
          </IconButton>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Orb size={64} active={!!streaming} />
            <View style={styles.kickerRow}>
              <View style={styles.kickerLine} />
              <Text style={styles.kicker}>
                {`${DAYS[now.getDay()]} · ${now.getDate()} ${MONTHS[now.getMonth()]}`.toLocaleUpperCase('tr-TR')}
              </Text>
            </View>
            <Text style={styles.h1}>
              {greeting(now)}.{'\n'}
              <Text style={styles.h1Muted}>Neye </Text>
              <Text style={styles.h1Gold}>bakalım?</Text>
            </Text>
          </View>

          <View style={styles.modes}>
            {MODES.map((m, i) => (
              <View key={m} style={[styles.mode, i === 0 && styles.modeOn]}>
                <Text style={[styles.modeText, i === 0 && { color: colors.bg }]}>{m}</Text>
              </View>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s.t} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]} onPress={() => start(s.t)}>
                <Text style={styles.cardText}>{s.t}</Text>
                <Text style={styles.cardCat}>{s.c}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </ScrollView>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}>
          <Composer onSend={start} busy={false} />
        </View>
      </KeyboardAvoidingView>
      <ModelSheet visible={sheet} onClose={() => setSheet(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 6 },
  model: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  modelText: { color: colors.text, fontFamily: fonts.sansMedium, fontSize: 14 },
  hero: { paddingHorizontal: 28, paddingTop: 36 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22 },
  kickerLine: { width: 22, height: 1, backgroundColor: colors.gold },
  kicker: { color: colors.gold, fontFamily: fonts.sansMedium, fontSize: 12, letterSpacing: 2.4 },
  h1: { color: colors.text, fontFamily: fonts.serif, fontSize: 46, lineHeight: 48, marginTop: 16, letterSpacing: -0.5 },
  h1Muted: { color: colors.muted },
  h1Gold: { color: colors.gold, fontFamily: fonts.serifItalic },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 28, marginTop: 30 },
  mode: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
  modeOn: { backgroundColor: colors.text, borderColor: colors.text },
  modeText: { color: colors.muted, fontFamily: fonts.sansMedium, fontSize: 13.5 },
  cards: { gap: 10, paddingHorizontal: 28, marginTop: 24 },
  card: {
    width: 168,
    height: 112,
    borderRadius: 22,
    padding: 16,
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  cardText: { color: '#D9D4CA', fontFamily: fonts.sans, fontSize: 14, lineHeight: 19 },
  cardCat: { color: colors.faint, fontFamily: fonts.sans, fontSize: 11.5 },
  bottom: { paddingHorizontal: 14, paddingTop: 6 },
});
