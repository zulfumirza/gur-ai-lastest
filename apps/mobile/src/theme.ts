export const colors = {
  bg: '#08080A',
  surface: 'rgba(255,255,255,0.035)',
  surfaceStrong: 'rgba(255,255,255,0.06)',
  composer: 'rgba(20,20,23,0.94)',
  hairline: 'rgba(255,255,255,0.075)',
  text: '#F2EEE6',
  textSoft: '#DCD7CD',
  muted: '#8E897F',
  faint: '#5C5852',
  gold: '#D9C49E',
  goldLight: '#F3E6CB',
  goldDeep: '#A8895C',
  danger: '#E58C7A',
  ghost: '#C9CED8',
} as const;

export const fonts = {
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  sans: 'Geist_400Regular',
  sansMedium: 'Geist_500Medium',
  sansSemi: 'Geist_600SemiBold',
  mono: 'GeistMono_400Regular',
  display: 'InstrumentSerif_400Regular',
  displayItalic: 'InstrumentSerif_400Regular_Italic',
} as const;

export const radius = { sm: 12, md: 18, lg: 22, xl: 28, pill: 999 } as const;

/** Hex rengi Skia/GLSL için 0..1 aralığında [r,g,b] dizisine çevirir. */
export function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}
