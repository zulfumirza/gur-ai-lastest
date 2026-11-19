import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useChat } from '@/store/chat';
import { colors, fonts } from '@/theme';
import { Composer } from '@/components/Composer';
import { Glow, Orb } from '@/components/fx/effects';
import { GhostIcon, MenuIcon } from '@/components/icons';
import { Intro } from '@/components/Intro';
import { ServerBanner } from '@/components/ServerBanner';
import { IconButton } from '@/components/ui';

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

/** Açılış animasyonu uygulama her açıldığında bir kez oynar. */
let introPlayed = false;

export default function Home() {
  const insets = useSafeAreaInsets();
  const { send, streaming } = useChat();
  const [intro, setIntro] = useState(!introPlayed);
  const [revealed, setRevealed] = useState(introPlayed);

  const start = (text: string) => {
    const id = send(text);
    if (id) router.push({ pathname: '/chat/[id]', params: { id } });
  };

  // Giriş sırasında içerik, perde aralanırken sırayla belirir.
  const enter = (i: number) => (introPlayed && !intro ? undefined : FadeInDown.delay(i * 90).duration(700));

  return (
    <View style={styles.root}>
      <Glow intensity={1} />
      {revealed && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <Animated.View entering={enter(0) && FadeIn.duration(700)} style={[styles.header, { paddingTop: insets.top + 6 }]}>
            <IconButton label="Menü" onPress={() => router.push('/menu')}>
              <MenuIcon />
            </IconButton>
            <Text style={styles.word} accessibilityRole="header">Gur</Text>
            <IconButton label="Hayalet sohbet" onPress={() => router.push('/ghost')}>
              <GhostIcon />
            </IconButton>
          </Animated.View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <Animated.View entering={enter(1)}>
                <Orb size={64} active={!!streaming} />
              </Animated.View>
              <Animated.Text entering={enter(2)} style={styles.h1}>
                {greeting(new Date())}.
              </Animated.Text>
              <Animated.Text entering={enter(3)} style={styles.h2}>
                <Text style={styles.h2Muted}>Neye </Text>
                <Text style={styles.h2Gold}>bakalım?</Text>
              </Animated.Text>
            </View>
          </ScrollView>

          <Animated.View entering={enter(4) && FadeInUp.delay(380).duration(700)}>
            <ServerBanner />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cards}
              keyboardShouldPersistTaps="handled"
            >
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s.t}
                  style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
                  onPress={() => start(s.t)}
                  accessibilityLabel={s.t}
                >
                  <Text style={styles.cardCat}>{s.c.toLocaleUpperCase('tr-TR')}</Text>
                  <Text style={styles.cardText} numberOfLines={2}>{s.t}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}>
              <Composer onSend={start} busy={false} />
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      )}
      {intro && (
        <Intro
          onReveal={() => setRevealed(true)}
          onDone={() => {
            introPlayed = true;
            setIntro(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 6 },
  word: { color: colors.text, fontFamily: fonts.serif, fontSize: 28, letterSpacing: -0.3 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingBottom: 24 },
  hero: { paddingHorizontal: 28 },
  h1: { color: colors.text, fontFamily: fonts.display, fontSize: 46, lineHeight: 50, marginTop: 26, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.displayItalic, fontSize: 46, lineHeight: 50, letterSpacing: -0.4 },
  h2Muted: { color: colors.muted },
  h2Gold: { color: colors.gold },
  cards: { gap: 8, paddingHorizontal: 14, paddingBottom: 10 },
  card: {
    width: 190,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 5,
    backgroundColor: 'rgba(20,20,23,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  cardText: { color: colors.textSoft, fontFamily: fonts.sans, fontSize: 14, lineHeight: 19 },
  cardCat: { color: colors.gold, fontFamily: fonts.sansMedium, fontSize: 10.5, letterSpacing: 1.6, opacity: 0.85 },
  bottom: { paddingHorizontal: 14, paddingTop: 2 },
});
