import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChat } from '@/store/chat';
import { colors, fonts } from '@/theme';
import { Composer } from '@/components/Composer';
import { LightRays } from '@/components/fx/effects';
import { MenuIcon, PlusIcon } from '@/components/icons';
import { Thread } from '@/components/Thread';
import { IconButton } from '@/components/ui';

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const title = useChat((s) => s.conversations.find((c) => c.id === id)?.title ?? 'Sohbet');
  const modelName = useChat((s) => s.models.find((m) => m.id === s.model)?.name ?? 'Gur');
  const busy = useChat((s) => s.streaming !== null);
  const { openConversation, send } = useChat.getState();

  useEffect(() => {
    openConversation(id);
  }, [id, openConversation]);

  return (
    <View style={styles.root}>
      <LightRays intensity={0.35} style={{ opacity: 0.8 }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <IconButton label="Menü" onPress={() => router.push('/menu')}>
            <MenuIcon />
          </IconButton>
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.subtitle}>{modelName}</Text>
          </View>
          <IconButton label="Yeni sohbet" onPress={() => router.dismissTo('/')}>
            <PlusIcon />
          </IconButton>
        </View>

        <Thread id={id} style={{ flex: 1 }} />

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}>
          <Composer onSend={(t) => send(t, id)} busy={busy} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 8 },
  titleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 12 },
  title: { color: colors.text, fontFamily: fonts.sansMedium, fontSize: 15 },
  subtitle: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, marginTop: 1 },
  bottom: { paddingHorizontal: 14, paddingTop: 6 },
});
