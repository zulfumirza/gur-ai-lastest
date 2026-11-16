import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '@/theme';

type P = { size?: number; color?: string };
const stroke = (color: string, w = 1.6) => ({
  stroke: color,
  strokeWidth: w,
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const MenuIcon = ({ size = 19, color = colors.text }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 9h16M4 15h10" {...stroke(color)} /></Svg>
);
export const PlusIcon = ({ size = 19, color = colors.text }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" {...stroke(color)} /></Svg>
);
export const CloseIcon = ({ size = 19, color = colors.text }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" {...stroke(color)} /></Svg>
);
export const ChevronDown = ({ size = 12, color = colors.muted }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" {...stroke(color, 2)} /></Svg>
);
export const SearchIcon = ({ size = 17, color = colors.faint }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={11} cy={11} r={7} {...stroke(color, 1.7)} /><Path d="M20 20l-4-4" {...stroke(color, 1.7)} /></Svg>
);
export const ArrowUp = ({ size = 16, color = '#151210' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 14 14"><Path d="M7 12V2M7 2L2.5 6.5M7 2L11.5 6.5" {...stroke(color, 1.9)} /></Svg>
);
export const StopIcon = ({ size = 14, color = '#151210' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 14 14"><Rect x={3.5} y={3.5} width={7} height={7} rx={1.5} fill={color} /></Svg>
);
export const CopyIcon = ({ size = 15, color = colors.faint }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={9} y={9} width={12} height={12} rx={2} {...stroke(color, 1.8)} /><Path d="M5 15V5a2 2 0 012-2h10" {...stroke(color, 1.8)} /></Svg>
);
export const RetryIcon = ({ size = 15, color = colors.faint }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3 12a9 9 0 0115.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 01-15.5 6.2L3 16M3 21v-5h5" {...stroke(color, 1.8)} /></Svg>
);
export const LockIcon = ({ size = 12, color = colors.faint }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={5} y={11} width={14} height={10} rx={2} {...stroke(color, 2)} /><Path d="M8 11V7a4 4 0 018 0v4" {...stroke(color, 2)} /></Svg>
);
export const TrashIcon = ({ size = 16, color = colors.danger }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" {...stroke(color, 1.7)} /></Svg>
);
export const EffortBars = ({ level, color = colors.muted }: { level: 1 | 2 | 3; color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 14 14">
    <Rect x={1.5} y={8} width={2.5} height={4.5} rx={1} fill={color} />
    <Rect x={5.75} y={5} width={2.5} height={7.5} rx={1} fill={color} opacity={level >= 2 ? 1 : 0.3} />
    <Rect x={10} y={2} width={2.5} height={10.5} rx={1} fill={color} opacity={level >= 3 ? 1 : 0.3} />
  </Svg>
);
