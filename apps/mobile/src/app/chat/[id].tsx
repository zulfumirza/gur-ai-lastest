import React, { useEffect, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useChat, type Message } from '@/store/chat';
import { colors, fonts } from '@/theme';
import { Composer } from '@/components/Composer';
import { LightRays, Orb } from '@/components/fx/effects';
import { CopyIcon, MenuIcon, PlusIcon, RetryIcon } from '@/components/icons';
import { Markdown } from '@/components/Markdown';
import { ThoughtLine } from '@/components/ThoughtLine';
import { IconButton } from '@/components/ui';

const EMPTY: Message[] = [];

function AssistantMessage({ m, conversationId, isLast }: { m: Message; conversationId: string; isLast: boolean }) {
  const streaming = useChat((s) => (s.streaming?.messageId === m.id ? s.streaming : null));
  const models = useChat((s) => s.models);
  const retry = useChat((s) => s.retry);
  const name = models.find((x) => x.id === m.model)?.name ?? 'Gur';
  const thinking = streaming?.phase === 'thinking';
  const showThought = thinking || m.reasoning.length > 0;

  return (
    <View style={styles.assistant}>
      <View style={styles.who}>
        <Orb size={22} active={!!streaming} />
        <Text style={styles.whoText}>{name.toLocaleUpperCase('tr-TR')}</Text>
      </View>
      {showThought && <ThoughtLine working={thinking} ms={m.thoughtMs} reasoning={m.reasoning} />}
      {m.content.length > 0 && <Markdown source={m.content + (streaming ? ' ▍' : '')} />}
      {m.error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>{m.error}</Text>
        </View>
      )}
      {!streaming && (
        <View style={styles.actions}>
          {m.content.length > 0 && (
            <Pressable hitSlop={8} onPress={() => Clipboard.setStringAsync(m.content)} accessibilityLabel="Kopyala">
              <CopyIcon />
            </Pressable>
          )}
          {isLast && (
            <Pressable hitSlop={8} onPress={() => retry(conversationId)} accessibilityLabel="Yeniden üret">
              <RetryIcon />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const messages = useChat((s) => s.messages[id] ?? EMPTY);
  const title = useChat((s) => s.conversations.find((c) => c.id === id)?.title ?? 'Sohbet');
  const modelName = useChat((s) => s.models.find((m) => m.id === s.model)?.name ?? 'Gur');
  const busy = useChat((s) => s.streaming !== null);
  const { openConversation, send } = useChat.getState();
  const list = useRef<FlatList<Message>>(null);

  useEffect(() => {
    openConversation(id);
  }, [id, openConversation]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')?.id;

  return (
    <View style={styles.root}>
      <LightRays intensity={0.35} style={{ opacity: 0.8 }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <IconButton label="Menü" onPress={() => router.push('/menu')}>
            <MenuIcon />
          </IconButton>
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.subtitle}>{modelName}</Text>
          </View>
          <IconButton label="Yeni sohbet" onPress={() => router.replace('/')}>
            <PlusIcon />
          </IconButton>
        </View>

        <FlatList
          ref={list}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) =>
            item.role === 'user' ? (
              <View style={styles.user}>
                <Text style={styles.userText} selectable>{item.content}</Text>
              </View>
            ) : (
              <AssistantMessage m={item} conversationId={id} isLast={item.id === lastAssistant} />
            )
          }
        />

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
  list: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 24, gap: 26 },
  user: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    borderBottomRightRadius: 6,
    backgroundColor: colors.surfaceStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  userText: { color: colors.text, fontFamily: fonts.sans, fontSize: 15, lineHeight: 21 },
  assistant: {},
  who: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  whoText: { color: colors.gold, fontFamily: fonts.sansMedium, fontSize: 12, letterSpacing: 1.6 },
  error: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(229,140,122,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(229,140,122,0.3)',
    marginBottom: 8,
  },
  errorText: { color: colors.danger, fontFamily: fonts.sans, fontSize: 13.5 },
  actions: { flexDirection: 'row', gap: 18, marginTop: 2 },
  bottom: { paddingHorizontal: 14, paddingTop: 6 },
});
