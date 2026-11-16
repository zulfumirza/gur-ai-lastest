import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradientOverlay } from '@/components/fx/overlay';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChat } from '@/store/chat';
import { colors, fonts } from '@/theme';
import { FiberField, Orb } from '@/components/fx/effects';
import { CloseIcon, LockIcon, SearchIcon } from '@/components/icons';
import { IconButton } from '@/components/ui';

const SOON = ['Code', 'Design', 'Research', 'Work'];

function when(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  if (days === 0) {
    return Date.now() - ts < 60_000 ? 'Şimdi' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (days === 1) return 'Dün';
  if (days < 7) return `${days} gün`;
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

/** Tam ekran menü: yeni sohbet, modlar ve yerel sohbet geçmişi. */
export default function Menu() {
  const insets = useSafeAreaInsets();
  const conversations = useChat((s) => s.conversations);
  const remove = useChat((s) => s.remove);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('tr-TR');
    return needle
      ? conversations.filter((c) => c.title.toLocaleLowerCase('tr-TR').includes(needle))
      : conversations;
  }, [q, conversations]);

  const confirmDelete = (id: string, title: string) =>
    Alert.alert('Sohbet silinsin mi?', `"${title}" bu cihazdan kalıcı olarak silinecek.`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => remove(id) },
    ]);

  return (
    <View style={styles.root}>
      <FiberField style={{ opacity: 0.9 }} />
      <LinearGradientOverlay />
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.wordmark}>
          <Orb size={38} />
          <Text style={styles.word}>Gur</Text>
        </View>
        <IconButton label="Kapat" onPress={() => router.back()}>
          <CloseIcon />
        </IconButton>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} keyboardShouldPersistTaps="handled">
        <View style={styles.search}>
          <SearchIcon />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Sohbetlerde ara"
            placeholderTextColor={colors.faint}
            style={styles.searchInput}
            selectionColor={colors.gold}
          />
        </View>

        <View style={styles.big}>
          <Pressable style={styles.bigRow} onPress={() => router.dismissTo('/')}>
            <Text style={styles.bigText}>Yeni sohbet</Text>
            <Text style={[styles.tag, { color: colors.gold }]}>＋</Text>
          </Pressable>
          {SOON.map((m) => (
            <View key={m} style={styles.bigRow}>
              <Text style={[styles.bigText, { color: colors.faint }]}>{m}</Text>
              <Text style={styles.tag}>YAKINDA</Text>
            </View>
          ))}
        </View>

        <View style={styles.sep} />
        <View style={styles.labelRow}>
          <Text style={styles.label}>SON SOHBETLER</Text>
          <Text style={styles.label}>{conversations.length || ''}</Text>
        </View>
        {filtered.length === 0 && (
          <Text style={styles.empty}>{q ? 'Eşleşen sohbet yok.' : 'Henüz sohbet yok. İlk soruyu sor.'}</Text>
        )}
        {filtered.map((c) => (
          <Pressable
            key={c.id}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}
            onPress={() => router.dismissTo({ pathname: '/chat/[id]', params: { id: c.id } })}
            onLongPress={() => confirmDelete(c.id, c.title)}
            delayLongPress={350}
          >
            <Text style={styles.itemText} numberOfLines={1}>{c.title}</Text>
            <Text style={styles.itemTime}>{when(c.updated_at)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={[styles.profile, { bottom: insets.bottom + 16 }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>G</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.pName}>Misafir</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <LockIcon color={colors.gold} />
            <Text style={styles.pSub}>Sohbetler yalnızca bu cihazda, şifreli</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 24, paddingRight: 18 },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  word: { color: colors.text, fontFamily: fonts.serif, fontSize: 34 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 22,
    marginTop: 20,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.sans, fontSize: 15 },
  big: { paddingHorizontal: 28, paddingTop: 22 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingVertical: 4 },
  bigText: { color: colors.text, fontFamily: fonts.serif, fontSize: 38, lineHeight: 46 },
  tag: { color: colors.faint, fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 1.5 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginHorizontal: 28, marginTop: 20 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 28, paddingTop: 20, paddingBottom: 8 },
  label: { color: colors.faint, fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2 },
  empty: { color: colors.faint, fontFamily: fonts.sans, fontSize: 14, paddingHorizontal: 28, paddingVertical: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 28, paddingVertical: 10 },
  itemText: { flex: 1, color: '#CFCAC0', fontFamily: fonts.sans, fontSize: 15 },
  itemTime: { color: colors.faint, fontFamily: fonts.sans, fontSize: 12.5 },
  profile: {
    position: 'absolute',
    left: 22,
    right: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(20,20,23,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#151210', fontFamily: fonts.serif, fontSize: 20 },
  pName: { color: colors.text, fontFamily: fonts.sansMedium, fontSize: 15 },
  pSub: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12 },
});
