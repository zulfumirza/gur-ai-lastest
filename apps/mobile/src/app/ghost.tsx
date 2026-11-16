import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useChat } from '@/store/chat';
import { colors, fonts } from '@/theme';
import { Composer } from '@/components/Composer';
import { LightRays } from '@/components/fx/effects';
import { CloseIcon, GhostIcon } from '@/components/icons';
import { Thread } from '@/components/Thread';
import { IconButton } from '@/components/ui';

const POINTS = ['Geçmişte görünmez', 'Cihaza kaydedilmez', 'Kapatınca silinir'];

/**
 * Hayalet sohbet: mesajlar yalnızca bellekte tutulur. Sohbet geçmişine eklenmez,
 * şifreli veritabanına yazılmaz; ekran kapanınca tamamen silinir.
 */
export default function Ghost() {
  const insets = useSafeAreaInsets();
  const [id] = useState(() => Crypto.randomUUID());
  const busy = useChat((s) => s.streaming !== null);
  const send = useChat((s) => s.send);
  const discard = useChat((s) => s.discard);

  useEffect(() => () => discard(id), [id, discard]);

  const empty = (
    <Animated.View entering={FadeIn.duration(500)} style={styles.empty}>
      <View style={styles.badge}>
        <GhostIcon size={30} color={colors.ghost} />
      </View>
      <Text style={styles.h1}>Hayalet sohbet</Text>
      <Text style={styles.lead}>İz bırakmadan sor. Bu sohbet yalnızca sen ekrandayken var.</Text>
      <View style={styles.points}>
        {POINTS.map((p, i) => (
          <Animated.View key={p} entering={FadeInDown.delay(150 + i * 90).duration(450)} style={styles.point}>
            <View style={styles.pointDot} />
            <Text style={styles.pointText}>{p}</Text>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.root}>
      <LightRays intensity={0.45} color={colors.ghost} style={{ opacity: 0.7 }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <IconButton label="Hayalet sohbeti kapat" onPress={() => router.back()}>
            <CloseIcon />
          </IconButton>
          <View style={styles.pill}>
            <GhostIcon size={14} color={colors.ghost} />
            <Text style={styles.pillText}>Hayalet</Text>
          </View>
          <View style={{ width: 42 }} />
        </View>

        <Thread id={id} accent={colors.ghost} style={{ flex: 1 }} ListEmptyComponent={empty} />

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}>
          <Composer
            onSend={(t) => send(t, id, { ghost: true })}
            busy={busy}
            placeholder="Kayıt tutulmadan sor…"
            accent={colors.ghost}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070709' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(201,206,216,0.25)',
    backgroundColor: 'rgba(201,206,216,0.06)',
  },
  pillText: { color: colors.ghost, fontFamily: fonts.sansMedium, fontSize: 13, letterSpacing: 0.4 },
  empty: { flex: 1, justifyContent: 'center', paddingHorizontal: 8, paddingBottom: 40 },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(201,206,216,0.3)',
    backgroundColor: 'rgba(201,206,216,0.05)',
  },
  h1: { color: colors.text, fontFamily: fonts.display, fontSize: 40, lineHeight: 46, marginTop: 22, letterSpacing: -0.6 },
  lead: { color: colors.muted, fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, marginTop: 10, maxWidth: 300 },
  points: { marginTop: 26, gap: 12 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.ghost, opacity: 0.8 },
  pointText: { color: colors.textSoft, fontFamily: fonts.sans, fontSize: 14 },
  bottom: { paddingHorizontal: 14, paddingTop: 6 },
});
