import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import {
  BlurMask,
  Canvas,
  Fill,
  RoundedRect,
  Shader,
  SweepGradient,
  useClock,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { colors, rgb } from '@/theme';
import { fibers, glow, lightRays, orb } from './shaders';

function useSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };
  return [size, onLayout] as const;
}

const GOLD = rgb(colors.gold);

/** Ekran arka planı: üstten altın ışık hüzmeleri. */
export function LightRays({
  intensity = 0.7,
  color = colors.gold,
  style,
}: {
  intensity?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [size, onLayout] = useSize();
  const clock = useClock();
  const tint = rgb(color);
  const uniforms = useDerivedValue(() => ({
    res: [size.width, size.height],
    time: clock.value / 1000,
    color: tint,
    intensity,
  }));
  return (
    <View style={[StyleSheet.absoluteFill, style]} onLayout={onLayout} pointerEvents="none">
      {size.width > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill>
            <Shader source={lightRays} uniforms={uniforms} />
          </Fill>
        </Canvas>
      )}
    </View>
  );
}

/** Ana sayfa arka planı: sakin, yumuşak üst ışık. */
export function Glow({ intensity = 1, style }: { intensity?: number; style?: StyleProp<ViewStyle> }) {
  const [size, onLayout] = useSize();
  const clock = useClock();
  const uniforms = useDerivedValue(() => ({
    res: [size.width, size.height],
    time: clock.value / 1000,
    intensity,
    tint: GOLD,
  }));
  return (
    <View style={[StyleSheet.absoluteFill, style]} onLayout={onLayout} pointerEvents="none">
      {size.width > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill>
            <Shader source={glow} uniforms={uniforms} />
          </Fill>
        </Canvas>
      )}
    </View>
  );
}

/** Menü arka planı: altın parçacık ipliği. */
export function FiberField({ style }: { style?: StyleProp<ViewStyle> }) {
  const [size, onLayout] = useSize();
  const clock = useClock();
  const uniforms = useDerivedValue(() => ({ res: [size.width, size.height], time: clock.value / 1000 }));
  return (
    <View style={[StyleSheet.absoluteFill, style]} onLayout={onLayout} pointerEvents="none">
      {size.width > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill>
            <Shader source={fibers} uniforms={uniforms} />
          </Fill>
        </Canvas>
      )}
    </View>
  );
}

/** Gur'un canlı logosu. `active` iken iplikler hızlanır ve parlar. */
export function Orb({ size, active = false }: { size: number; active?: boolean }) {
  const clock = useClock();
  const uniforms = useDerivedValue(() => ({
    res: [size, size],
    time: clock.value / 1000,
    energy: active ? 1 : 0,
  }));
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Fill>
        <Shader source={orb} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}

/** Kenarında dolaşan altın ışık (Border Beam'in mobil karşılığı). */
export function BorderBeam({
  children,
  radius = 28,
  active = true,
  style,
}: {
  children: React.ReactNode;
  radius?: number;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [size, onLayout] = useSize();
  const clock = useClock();
  const speed = active ? 1 : 0.35;
  const rotation: SharedValue<{ rotate: number }[]> = useDerivedValue(() => [
    { rotate: ((clock.value / 1000) * speed * 1.4) % (Math.PI * 2) },
  ]);
  const { width: w, height: h } = size;
  const c = vec(w / 2, h / 2);
  const beamColors = ['rgba(217,196,158,0)', 'rgba(217,196,158,0)', colors.goldLight, colors.gold, 'rgba(217,196,158,0)'];
  return (
    <View style={style} onLayout={onLayout}>
      {children}
      {w > 0 && (
        <Canvas style={[StyleSheet.absoluteFill, { margin: -6 }]} pointerEvents="none">
          {[
            { blur: 6, stroke: 3, opacity: 0.55 },
            { blur: 0, stroke: 1.2, opacity: 1 },
          ].map((layer, i) => (
            <RoundedRect
              key={i}
              x={6.5}
              y={6.5}
              width={w - 1}
              height={h - 1}
              r={radius}
              style="stroke"
              strokeWidth={layer.stroke}
              opacity={layer.opacity}
            >
              <SweepGradient c={vec(c.x + 6, c.y + 6)} colors={beamColors} positions={[0, 0.62, 0.8, 0.86, 1]} transform={rotation} origin={vec(c.x + 6, c.y + 6)} />
              {layer.blur > 0 && <BlurMask blur={layer.blur} style="normal" />}
            </RoundedRect>
          ))}
        </Canvas>
      )}
    </View>
  );
}
