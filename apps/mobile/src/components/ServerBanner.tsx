import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useChat } from '@/store/chat';
import { colors, fonts } from '@/theme';

/** Sunucuya ulaşılamadığında görünen ince uyarı; "Tekrar dene" bağlantıyı yeniden sınar. */
export function ServerBanner() {
  const online = useChat((s) => s.online);
  const checkServer = useChat((s) => s.checkServer);
  const [busy, setBusy] = useState(false);

  if (online !== false) return null;

  const retry = async () => {
    setBusy(true);
    const ok = await checkServer();
    setBusy(false);
    Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
  };

  return (
    <Animated.View entering={FadeInDown.duration(400)} exiting={FadeOut.duration(250)} style={styles.wrap}>
      <View style={styles.dot} />
      <Text style={styles.text} numberOfLines={1}>Sunucuya ulaşılamıyor</Text>
      <Pressable onPress={retry} disabled={busy} hitSlop={10} accessibilityLabel="Bağlantıyı tekrar dene">
        {busy ? (
          <ActivityIndicator size="small" color={colors.gold} />
        ) : (
          <Text style={styles.action}>Tekrar dene</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 14,
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(229,140,122,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(229,140,122,0.28)',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger },
  text: { flex: 1, color: colors.textSoft, fontFamily: fonts.sans, fontSize: 13.5 },
  action: { color: colors.gold, fontFamily: fonts.sansMedium, fontSize: 13.5 },
});
