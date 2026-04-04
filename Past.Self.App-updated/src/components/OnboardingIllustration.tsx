import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Rect, Line, Path, Ellipse, G } from 'react-native-svg';
import { colors } from '../styles/theme';

interface Props { index: number; size?: number; }

export function OnboardingIllustration({ index, size = 100 }: Props) {
  const s = size;
  const c = s / 2;
  const stroke = colors.danger;
  const strokeW = s * 0.04;
  const accent = colors.accent;

  if (index === 0) {
    // Microphone illustration
    return (
      <Svg width={s} height={s} viewBox="0 0 100 100">
        {/* Mic body */}
        <Rect x="35" y="15" width="30" height="45" rx="15" fill="none" stroke={stroke} strokeWidth={strokeW} />
        {/* Mic center line */}
        <Line x1="35" y1="37" x2="65" y2="37" stroke={stroke} strokeWidth={strokeW * 0.6} />
        {/* Stand arc */}
        <Path d="M25 55 Q25 75 50 75 Q75 75 75 55" fill="none" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" />
        {/* Stand line */}
        <Line x1="50" y1="75" x2="50" y2="88" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" />
        {/* Base */}
        <Line x1="35" y1="88" x2="65" y2="88" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" />
      </Svg>
    );
  }

  if (index === 1) {
    // Clock / alarm illustration
    return (
      <Svg width={s} height={s} viewBox="0 0 100 100">
        {/* Clock face */}
        <Circle cx="50" cy="52" r="32" fill="none" stroke={stroke} strokeWidth={strokeW} />
        {/* Hour hand */}
        <Line x1="50" y1="52" x2="50" y2="32" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" />
        {/* Minute hand */}
        <Line x1="50" y1="52" x2="65" y2="60" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" />
        {/* Center dot */}
        <Circle cx="50" cy="52" r="3" fill={stroke} />
        {/* Bell left */}
        <Line x1="25" y1="28" x2="18" y2="18" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" />
        <Circle cx="17" cy="16" r="4" fill="none" stroke={stroke} strokeWidth={strokeW * 0.8} />
        {/* Bell right */}
        <Line x1="75" y1="28" x2="82" y2="18" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" />
        <Circle cx="83" cy="16" r="4" fill="none" stroke={stroke} strokeWidth={strokeW * 0.8} />
        {/* Tick marks */}
        <Line x1="50" y1="22" x2="50" y2="26" stroke={stroke} strokeWidth={strokeW * 0.6} strokeLinecap="round" />
        <Line x1="50" y1="78" x2="50" y2="82" stroke={stroke} strokeWidth={strokeW * 0.6} strokeLinecap="round" />
        <Line x1="20" y1="52" x2="24" y2="52" stroke={stroke} strokeWidth={strokeW * 0.6} strokeLinecap="round" />
        <Line x1="76" y1="52" x2="80" y2="52" stroke={stroke} strokeWidth={strokeW * 0.6} strokeLinecap="round" />
      </Svg>
    );
  }

  // index === 2: Sparkle / star illustration
  return (
    <Svg width={s} height={s} viewBox="0 0 100 100">
      {/* Large star */}
      <Path
        d="M50 10 L56 38 L85 38 L62 55 L70 83 L50 67 L30 83 L38 55 L15 38 L44 38 Z"
        fill="none" stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round"
      />
      {/* Small sparkles */}
      <Line x1="82" y1="15" x2="82" y2="25" stroke={accent} strokeWidth={strokeW * 0.8} strokeLinecap="round" />
      <Line x1="77" y1="20" x2="87" y2="20" stroke={accent} strokeWidth={strokeW * 0.8} strokeLinecap="round" />
      <Line x1="15" y1="65" x2="15" y2="73" stroke={accent} strokeWidth={strokeW * 0.8} strokeLinecap="round" />
      <Line x1="11" y1="69" x2="19" y2="69" stroke={accent} strokeWidth={strokeW * 0.8} strokeLinecap="round" />
      <Circle cx="80" cy="70" r="3" fill="none" stroke={accent} strokeWidth={strokeW * 0.7} />
      <Circle cx="20" cy="25" r="2" fill={accent} />
    </Svg>
  );
}
