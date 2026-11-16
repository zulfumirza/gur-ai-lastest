import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts } from '@/theme';

/**
 * "Düşünüyor" göstergesi (React Bits Thought Line'dan esinlenmiştir).
 * Çalışırken yıldız döner ve yazı nabız gibi parlar; bitince süreyi gösterir
 * ve dokununca modelin düşünce özetini açar.
 */
export function ThoughtLine({
  working,
  ms,
  reasoning,
}: {
  working: boolean;
  ms: number | null;
  reasoning: string;
}) {
  const [open, setOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const spin = useSharedValue(0);
  const glow = useSharedValue(1);

  useEffect(() => {
    if (!working) {
      cancelAnimation(spin);
      cancelAnimation(glow);
      glow.value = withTiming(1);
      return;
    }
    spin.value = withRepeat(withTiming(360, { duration: 2400, easing: Easing.linear }), -1);
    glow.value = withRepeat(withTiming(0.45, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
    const started = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - started), 100);
    return () => clearInterval(id);
  }, [working, spin, glow]);

  const starStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const textStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const seconds = ((working ? elapsed : ms ?? 0) / 1000).toFixed(1);
  const canOpen = !working && reasoning.length > 0;

  return (
    <View style={styles.wrap}>
      <Pressable
        disabled={!canOpen}
        onPress={() => setOpen((v) => !v)}
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={working ? 'Düşünüyor' : `${seconds} saniye düşündü`}
      >
        <Animated.View style={starStyle}>
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill={colors.gold} />
          </Svg>
        </Animated.View>
        <Animated.Text style={[styles.label, textStyle]}>
          {working ? `Düşünüyor ${seconds}s` : `${seconds} saniye düşündü`}
        </Animated.Text>
        {canOpen && (
          <Svg width={12} height={12} viewBox="0 0 24 24" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
            <Path d="M6 9l6 6 6-6" stroke={colors.muted} strokeWidth={2} fill="none" strokeLinecap="round" />
          </Svg>
        )}
      </Pressable>
      {open && (
        <View style={styles.panel}>
          <Text style={styles.reasoning}>{reasoning.trim()}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 2 },
  label: { color: colors.muted, fontFamily: fonts.sans, fontSize: 13 },
  panel: { marginTop: 8, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: colors.hairline },
  reasoning: { color: colors.faint, fontFamily: fonts.sans, fontSize: 13, lineHeight: 20 },
});
