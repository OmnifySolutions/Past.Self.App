import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Rect, G } from 'react-native-svg';
import { RootStackParamList } from '../../App';
import { fonts, spacing, radius } from '../styles/theme';

const { width, height } = Dimensions.get('window');
type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingCamera'>;

// Larger standalone camera icon — no circle
const CameraIcon = ({ size = 80, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <Rect x="13" y="8" width="10" height="5" rx="2.5" stroke={color} strokeWidth="1.8" />
    <Rect x="3" y="13" width="42" height="28" rx="6" stroke={color} strokeWidth="2.2" />
    <Circle cx="24" cy="27" r="9" stroke={color} strokeWidth="2" />
    <Circle cx="24" cy="27" r="4" fill={color} opacity={0.75} />
    <Circle cx="38" cy="19" r="2" fill={color} opacity={0.55} />
  </Svg>
);

const Sparkle = ({ x, y, delay, size }: { x: number; y: number; delay: number; size: number }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.4)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dur = 2800 + Math.random() * 3000;
    const loop = () => {
      opacity.setValue(0); scale.setValue(0.4); drift.setValue(0);
      Animated.sequence([
        Animated.delay(delay + Math.random() * 500),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.45, duration: dur * 0.35, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: dur * 0.35, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: dur * 0.65, useNativeDriver: true }),
          Animated.timing(drift, { toValue: -7, duration: dur * 0.65, useNativeDriver: true }),
        ]),
      ]).start(() => setTimeout(loop, 1000 + Math.random() * 4000));
    };
    loop();
  }, []);

  return (
    <Animated.View style={{ position: 'absolute', left: x, top: y, opacity, transform: [{ scale }, { translateY: drift }] }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#e8c4cc' }} />
    </Animated.View>
  );
};

const SPARKLES = [
  { x: width * 0.65, y: height * 0.55, delay: 76, size: 2.1 },
  { x: width * 0.33, y: height * 0.61, delay: 4917, size: 2.0 },
  { x: width * 0.49, y: height * 0.88, delay: 4741, size: 2.6 },
  { x: width * 0.95, y: height * 0.36, delay: 4610, size: 1.7 },
  { x: width * 0.01, y: height * 0.85, delay: 2137, size: 3.1 },
  { x: width * 0.49, y: height * 0.74, delay: 4735, size: 2.3 },
  { x: width * 0.68, y: height * 0.09, delay: 5597, size: 1.7 },
  { x: width * 0.04, y: height * 0.71, delay: 1551, size: 2.9 },
  { x: width * 0.69, y: height * 0.22, delay: 1906, size: 2.2 },
  { x: width * 0.45, y: height * 0.08, delay: 4233, size: 2.5 },
  { x: width * 0.13, y: height * 0.05, delay: 5178, size: 3.0 },
  { x: width * 0.84, y: height * 0.25, delay: 4248, size: 3.4 },
  { x: width * 0.57, y: height * 0.55, delay: 5305, size: 2.1 },
  { x: width * 0.58, y: height * 0.14, delay: 556, size: 2.0 },
  { x: width * 0.53, y: height * 0.36, delay: 1060, size: 1.7 },
  { x: width * 0.81, y: height * 0.5, delay: 5553, size: 3.1 },
  { x: width * 0.67, y: height * 0.99, delay: 4239, size: 2.1 },
  { x: width * 0.21, y: height * 0.65, delay: 2990, size: 3.1 },
  { x: width * 0.14, y: height * 0.04, delay: 5905, size: 1.8 },
  { x: width * 0.17, y: height * 0.82, delay: 3363, size: 2.1 },
  { x: width * 0.64, y: height * 0.1, delay: 4474, size: 3.4 },
  { x: width * 0.36, y: height * 0.77, delay: 2857, size: 3.1 },
  { x: width * 0.32, y: height * 0.41, delay: 115, size: 2.5 },
  { x: width * 0.38, y: height * 0.44, delay: 1228, size: 2.9 },
  { x: width * 0.51, y: height * 0.18, delay: 3470, size: 2.7 },
  { x: width * 0.2, y: height * 0.7, delay: 4758, size: 3.0 },
  { x: width * 0.94, y: height * 0.07, delay: 4600, size: 1.8 },
  { x: width * 0.38, y: height * 0.15, delay: 5455, size: 2.9 },
  { x: width * 0.56, y: height * 0.24, delay: 2876, size: 1.7 },
  { x: width * 0.53, y: height * 0.02, delay: 1824, size: 2.1 },
  { x: width * 0.93, y: height * 0.89, delay: 3929, size: 3.2 },
  { x: width * 0.59, y: height * 0.84, delay: 5328, size: 2.3 },
  { x: width * 0.77, y: height * 0.55, delay: 4492, size: 2.2 },
  { x: width * 0.49, y: height * 0.15, delay: 3917, size: 3.5 },
  { x: width * 0.67, y: height * 0.16, delay: 3429, size: 3.4 },
  { x: width * 0.05, y: height * 0.12, delay: 2613, size: 2.6 },
  { x: width * 0.24, y: height * 0.68, delay: 1736, size: 1.6 },
  { x: width * 0.22, y: height * 0.59, delay: 5597, size: 1.7 },
  { x: width * 0.18, y: height * 0.28, delay: 2909, size: 2.5 },
  { x: width * 0.94, y: height * 0.85, delay: 2344, size: 1.6 },
  { x: width * 0.5, y: height * 0.24, delay: 3321, size: 3.3 },
  { x: width * 0.73, y: height * 0.26, delay: 592, size: 3.1 },
  { x: width * 0.44, y: height * 0.22, delay: 1068, size: 2.9 },
  { x: width * 0.47, y: height * 0.44, delay: 5356, size: 2.3 },
  { x: width * 0.06, y: height * 0.04, delay: 2784, size: 3.5 },
  { x: width * 0.51, y: height * 0.8, delay: 5017, size: 2.3 },
  { x: width * 0.82, y: height * 0.79, delay: 1097, size: 2.0 },
  { x: width * 0.5, y: height * 0.09, delay: 5763, size: 1.8 },
  { x: width * 0.65, y: height * 0.34, delay: 915, size: 3.5 },
  { x: width * 0.59, y: height * 0.88, delay: 861, size: 3.1 },
  { x: width * 0.05, y: height * 0.72, delay: 524, size: 1.5 },
  { x: width * 0.1, y: height * 0.74, delay: 1768, size: 1.5 },
  { x: width * 0.72, y: height * 0.88, delay: 208, size: 1.7 },
  { x: width * 0.4, y: height * 0.02, delay: 2267, size: 2.2 },
  { x: width * 0.76, y: height * 0.26, delay: 2135, size: 1.6 },
  { x: width * 0.16, y: height * 0.89, delay: 5871, size: 3.3 },
  { x: width * 0.84, y: height * 0.66, delay: 5378, size: 1.6 },
  { x: width * 0.8, y: height * 0.76, delay: 1682, size: 2.9 },
  { x: width * 0.78, y: height * 0.96, delay: 5409, size: 3.3 },
  { x: width * 0.19, y: height * 0.65, delay: 1286, size: 3.3 }
];

const PROMPTS = [
  'feel like giving up.',
  'want to scroll instead of work.',
  'open Instagram out of habit.',
  'doubt yourself.',
  'need a push to start.',
  'want to stay consistent.',
];

export function OnboardingCameraScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [promptIndex, setPromptIndex] = useState(0);
  const promptOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(20)).current;
  const isCyclingRef = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(contentY, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start(() => {
      if (!isCyclingRef.current) { isCyclingRef.current = true; cyclePrompts(0); }
    });
  }, []);

  const cyclePrompts = (index: number) => {
    const realIndex = index % PROMPTS.length;
    setPromptIndex(realIndex);
    promptOpacity.setValue(0);
    Animated.timing(promptOpacity, { toValue: 1, duration: 350, useNativeDriver: true })
      .start(({ finished }) => {
        if (!finished) return;
        setTimeout(() => {
          Animated.timing(promptOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
            .start(({ finished: out }) => {
              if (!out) return;
              setTimeout(() => cyclePrompts(index + 1), 120);
            });
        }, 1800);
      });
  };

  return (
    <LinearGradient colors={['#6b3f52', '#52303f', '#35202c']} locations={[0, 0.5, 1]} style={styles.container}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {SPARKLES.map((s, i) => <Sparkle key={i} {...s} />)}
      </View>

      {/* Full screen flex column — icon centered naturally */}
      <View style={[styles.outer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Animated.View style={[styles.centerSection, { opacity: contentOpacity, transform: [{ translateY: contentY }] }]}>
          {/* Big camera icon — no circle, no wrapper, just the SVG */}
          <CameraIcon size={96} color="rgba(255,255,255,0.85)" />

          <Text style={styles.instruction}>{'Record a message for\nyour future self'}</Text>
          <Text style={styles.nextTime}>next time you</Text>

          <View style={styles.promptContainer}>
            <Animated.Text style={[styles.prompt, { opacity: promptOpacity }]} numberOfLines={1} adjustsFontSizeToFit>
              {PROMPTS[promptIndex]}
            </Animated.Text>
          </View>
        </Animated.View>

        <View style={styles.bottomSection}>
          <Text style={styles.hint}>{'Be honest. Be direct.\nYour future self is listening.'}</Text>
          <TouchableOpacity
            style={styles.recordBtn}
            onPress={() => navigation.navigate('Record', { prefill: undefined })}
            activeOpacity={0.85}
          >
            <CameraIcon size={20} color="#fff" />
            <Text style={styles.recordBtnText}>Start Recording</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  outer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  instruction: {
    fontFamily: fonts.montserratBold,
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 32,
    marginTop: spacing.lg,
  },
  nextTime: {
    fontFamily: fonts.montserratMedium,
    fontSize: 17,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  promptContainer: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: spacing.xs,
  },
  prompt: {
    fontFamily: fonts.montserratBold,
    fontSize: 19,
    color: '#9898d6',
    textAlign: 'center',
    lineHeight: 26,
  },
  bottomSection: {
    width: '100%',
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  hint: {
    fontFamily: fonts.inter,
    fontSize: 13,
    color: 'rgba(255,255,255,0.38)',
    textAlign: 'center',
    lineHeight: 20,
  },
  recordBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  recordBtnText: { fontFamily: fonts.montserratBold, fontSize: 16, color: '#fff' },
});
