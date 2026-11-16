import React, { useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useChat, type Message } from '@/store/chat';
import { colors, fonts } from '@/theme';
import { Orb } from './fx/effects';
import { CopyIcon, RetryIcon } from './icons';
import { Markdown } from './Markdown';
import { ThoughtLine } from './ThoughtLine';

const EMPTY: Message[] = [];

function AssistantMessage({ m, conversationId, isLast, accent }: { m: Message; conversationId: string; isLast: boolean; accent: string }) {
  const streaming = useChat((s) => (s.streaming?.messageId === m.id ? s.streaming : null));
  const models = useChat((s) => s.models);
  const retry = useChat((s) => s.retry);
  const name = models.find((x) => x.id === m.model)?.name ?? 'Gur';
  const thinking = streaming?.phase === 'thinking';
  const showThought = thinking || m.reasoning.length > 0;

  return (
    <View>
      <View style={styles.who}>
        <Orb size={22} active={!!streaming} />
        <Text style={[styles.whoText, { color: accent }]}>{name.toLocaleUpperCase('tr-TR')}</Text>
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

/** Bir sohbetin mesaj akışı. Normal ve hayalet sohbet aynı listeyi kullanır. */
export function Thread({
  id,
  accent = colors.gold,
  style,
  ListEmptyComponent,
}: {
  id: string;
  accent?: string;
  style?: StyleProp<ViewStyle>;
  ListEmptyComponent?: React.ReactElement;
}) {
  const messages = useChat((s) => s.messages[id] ?? EMPTY);
  const list = useRef<FlatList<Message>>(null);
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')?.id;

  return (
    <FlatList
      ref={list}
      style={style}
      data={messages}
      keyExtractor={(m) => m.id}
      contentContainerStyle={[styles.list, messages.length === 0 && { flexGrow: 1 }]}
      onContentSizeChange={() => messages.length && list.current?.scrollToEnd({ animated: true })}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={ListEmptyComponent}
      renderItem={({ item }) =>
        item.role === 'user' ? (
          <View style={styles.user}>
            <Text style={styles.userText} selectable>{item.content}</Text>
          </View>
        ) : (
          <AssistantMessage m={item} conversationId={id} isLast={item.id === lastAssistant} accent={accent} />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
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
  who: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  whoText: { fontFamily: fonts.sansMedium, fontSize: 12, letterSpacing: 1.6 },
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
});
