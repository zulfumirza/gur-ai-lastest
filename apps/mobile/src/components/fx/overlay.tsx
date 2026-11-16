import React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { useWindowDimensions } from 'react-native';

/** Arka plan efektinin üstünde, yazıları okunur tutan dikey koyulaştırma. */
export function LinearGradientOverlay() {
  const { width, height } = useWindowDimensions();
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={['rgba(8,8,10,0.35)', 'rgba(8,8,10,0.55)', 'rgba(8,8,10,0.92)']}
          positions={[0, 0.45, 0.75]}
        />
      </Rect>
    </Canvas>
  );
}
