import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { BlurMask, Canvas, Circle, Group, Path, RoundedRect, Skia, vec } from '@shopify/react-native-skia';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts } from '@/theme';

/** Uygulama simgesindeki G: açıklığı sağ üstte olan halka + içe dönen kol. */
export function gPath(cx: number, cy: number, R: number) {
  return Skia.PathBuilder.Make()
    .addArc(Skia.XYWHRect(cx - R, cy - R, R * 2, R * 2), -62, -298)
    .lineTo(cx + R * 0.2, cy)
    .build();
}

const DRAW_MS = 1150;
const REVEAL_AT = 1950;
const DONE_AT = 2500;

/**
 * Açılış animasyonu: altın G halkası çizilir, ucunda yıldız parlar, "Gur" yükselir,
 * sonra perde aralanır. Dokununca atlanır.
 */
export function Intro({ onReveal, onDone }: { onReveal: () => void; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const S = Math.min(width * 0.42, 190);
  const cx = S / 2;
  const cy = S / 2;
  const R = S * 0.36;
  const g = useMemo(() => gPath(cx, cy, R), [cx, cy, R]);
  const sx = cx + R * Math.cos((-62 * Math.PI) / 180);
  const sy = cy + R * Math.sin((-62 * Math.PI) / 180);

  const draw = useSharedValue(0);
  const star = useSharedValue(0);
  const word = useSharedValue(0);
  const curtain = useSharedValue(1);

  useEffect(() => {
    draw.value = withTiming(1, { duration: DRAW_MS, easing: Easing.bezier(0.65, 0, 0.35, 1) });
    star.value = withDelay(
      DRAW_MS - 180,
      withSequence(
        withTiming(1.35, { duration: 260, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 380, easing: Easing.inOut(Easing.quad) }),
      ),
    );
    word.value = withDelay(DRAW_MS, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
    curtain.value = withDelay(REVEAL_AT, withTiming(0, { duration: DONE_AT - REVEAL_AT, easing: Easing.inOut(Easing.quad) }));
    const t1 = setTimeout(onReveal, REVEAL_AT);
    const t2 = setTimeout(onDone, DONE_AT);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // Animasyon yalnızca bir kez, bağlanınca oynar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const starTransform = useDerivedValue(() => [{ scale: star.value }]);
  const starOpacity = useDerivedValue(() => Math.min(star.value, 1));
  const glowOpacity = useDerivedValue(() => 0.25 + 0.45 * draw.value);

  const rootStyle = useAnimatedStyle(() => ({ opacity: curtain.value }));
  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.94 + 0.06 * curtain.value }, { translateY: (1 - curtain.value) * -40 }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: (1 - word.value) * 14 }],
    letterSpacing: 2 + word.value * 6,
  }));
  const L = S * 0.16;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]}>
      <Pressable
        style={[StyleSheet.absoluteFill, styles.center]}
        onPress={() => {
          onReveal();
          onDone();
        }}
        accessibilityLabel="Açılışı geç"
      >
        <Animated.View style={[styles.center, markStyle, { marginTop: -height * 0.06 }]}>
          <Canvas style={{ width: S, height: S }}>
            <Path path={g} style="stroke" strokeWidth={7} strokeCap="round" color={colors.gold} end={draw} opacity={glowOpacity}>
              <BlurMask blur={10} style="normal" />
            </Path>
            <Path path={g} style="stroke" strokeWidth={2.4} strokeCap="round" color={colors.goldLight} end={draw} />
            <Group transform={starTransform} origin={vec(sx, sy)} opacity={starOpacity}>
              <Circle cx={sx} cy={sy} r={10} color={colors.goldLight} opacity={0.5}>
                <BlurMask blur={8} style="normal" />
              </Circle>
              <RoundedRect x={sx - L} y={sy - 0.8} width={L * 2} height={1.6} r={0.8} color={colors.goldLight}>
                <BlurMask blur={0.6} style="normal" />
              </RoundedRect>
              <RoundedRect x={sx - 0.8} y={sy - L} width={1.6} height={L * 2} r={0.8} color={colors.goldLight}>
                <BlurMask blur={0.6} style="normal" />
              </RoundedRect>
              <Circle cx={sx} cy={sy} r={2.6} color="#FFFDF6" />
            </Group>
          </Canvas>
          <Animated.Text style={[styles.word, wordStyle]}>Gur</Animated.Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg, zIndex: 10 },
  center: { alignItems: 'center', justifyContent: 'center' },
  word: { color: colors.text, fontFamily: fonts.display, fontSize: 40, marginTop: 18 },
});
