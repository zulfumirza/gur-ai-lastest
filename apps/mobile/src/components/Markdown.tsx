import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { parseMarkdown, type Inline } from '@/lib/markdown';
import { colors, fonts } from '@/theme';

function Inlines({ items }: { items: Inline[] }) {
  return (
    <>
      {items.map((x, i) => {
        switch (x.k) {
          case 'bold':
            return <Text key={i} style={styles.bold}>{x.v}</Text>;
          case 'italic':
            return <Text key={i} style={styles.italic}>{x.v}</Text>;
          case 'code':
            return <Text key={i} style={styles.icode}>{x.v}</Text>;
          case 'link':
            return (
              <Text key={i} style={styles.link} onPress={() => Linking.openURL(x.href)}>
                {x.v}
              </Text>
            );
          default:
            return <Text key={i}>{x.v}</Text>;
        }
      })}
    </>
  );
}

function CodeBlock({ lang, text }: { lang: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <View style={styles.code}>
      <View style={styles.codeBar}>
        <Text style={styles.codeLang}>{(lang || 'kod').toUpperCase()}</Text>
        <Pressable
          hitSlop={10}
          onPress={async () => {
            await Clipboard.setStringAsync(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
        >
          <Text style={styles.codeLang}>{copied ? 'Kopyalandı' : 'Kopyala'}</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 14 }}>
        <Text style={styles.codeText} selectable>{text}</Text>
      </ScrollView>
    </View>
  );
}

/** Yanıt metnini biçimli gösterir; akış sırasında da güvenle yeniden çizilir. */
export function Markdown({ source }: { source: string }) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  return (
    <View>
      {blocks.map((b, i) => {
        switch (b.k) {
          case 'h':
            return (
              <Text key={i} style={[styles.h, b.level === 1 && { fontSize: 26 }]}>
                <Inlines items={b.inl} />
              </Text>
            );
          case 'p':
            return (
              <Text key={i} style={styles.p} selectable>
                <Inlines items={b.inl} />
              </Text>
            );
          case 'code':
            return <CodeBlock key={i} lang={b.lang} text={b.text} />;
          case 'list':
            return (
              <View key={i} style={{ marginBottom: 12 }}>
                {b.items.map((it, j) => (
                  <View key={j} style={styles.li}>
                    {b.ordered ? (
                      <Text style={styles.num}>{j + 1}.</Text>
                    ) : (
                      <View style={styles.dash} />
                    )}
                    <Text style={[styles.p, { flex: 1, marginBottom: 0 }]} selectable>
                      <Inlines items={it} />
                    </Text>
                  </View>
                ))}
              </View>
            );
          case 'quote':
            return (
              <View key={i} style={styles.quote}>
                <Text style={[styles.p, { color: colors.muted, marginBottom: 0 }]}>
                  <Inlines items={b.inl} />
                </Text>
              </View>
            );
          case 'hr':
            return <View key={i} style={styles.hr} />;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  p: { color: colors.textSoft, fontFamily: fonts.sans, fontSize: 15.5, lineHeight: 25, marginBottom: 12 },
  h: { color: colors.text, fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, marginTop: 4, marginBottom: 10 },
  bold: { color: colors.text, fontFamily: fonts.sansSemi },
  italic: { fontFamily: fonts.serifItalic, fontSize: 17 },
  icode: { fontFamily: fonts.mono, fontSize: 13.5, color: colors.goldLight },
  link: { color: colors.gold, textDecorationLine: 'underline' },
  li: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  dash: { width: 7, height: 1, backgroundColor: colors.gold, marginTop: 13 },
  num: { color: colors.gold, fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 25 },
  quote: { borderLeftWidth: 2, borderLeftColor: colors.goldDeep, paddingLeft: 12, marginBottom: 12 },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginVertical: 14 },
  code: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: '#0E0E11',
    overflow: 'hidden',
    marginBottom: 14,
  },
  codeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  codeLang: { color: colors.muted, fontFamily: fonts.sansMedium, fontSize: 11.5, letterSpacing: 0.6 },
  codeText: { color: '#C9C4BA', fontFamily: fonts.mono, fontSize: 12.5, lineHeight: 21 },
});
