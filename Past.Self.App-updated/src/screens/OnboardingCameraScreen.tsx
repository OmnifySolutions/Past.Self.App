import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Rect } from 'react-native-svg';
import { RootStackParamList } from '../../App';
import { fonts, spacing, radius } from '../styles/theme';

const { width, height } = Dimensions.get('window');
type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingCamera'>;

// Pure camera: body, bump, lens, flash dot — nothing else
const CameraIcon = ({ size = 48, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <Rect x="13" y="8" width="10" height="5" rx="2.5" stroke={color} strokeWidth="1.8" />
    <Rect x="3" y="13" width="34" height="24" rx="6" stroke={color} strokeWidth="2.2" />
    <Circle cx="20" cy="25" r="8" stroke={color} strokeWidth="2" />
    <Circle cx="20" cy="25" r="3.5" fill={color} opacity={0.75} />
    <Circle cx="32" cy="19" r="1.8" fill={color} opacity={0.55} />
  </Svg>
);

// Sparkle — same gentle animation as splash but on dark background
const Sparkle = ({ x, y, delay, size }: { x: number; y: number; delay: number; size: number }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.4)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = 3200 + Math.random() * 2000;
    const loop = () => {
      opacity.setValue(0);
      scale.setValue(0.4);
      translateY.setValue(0);
      Animated.sequence([
        Animated.delay(delay + Math.random() * 800),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.45, duration: duration * 0.4, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: duration * 0.4, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: duration * 0.6, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -7, duration: duration * 0.6, useNativeDriver: true }),
        ]),
      ]).start(() => setTimeout(loop, 1000 + Math.random() * 2000));
    };
    loop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity,
        transform: [{ scale }, { translateY }],
      }}
    >
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#e8c4cc',
      }} />
    </Animated.View>
  );
};

const SPARKLES = [
  { x: width * 0.15, y: height * 0.12, delay: 0,    size: 2.5 },
  { x: width * 0.75, y: height * 0.18, delay: 700,  size: 3 },
  { x: width * 0.88, y: height * 0.38, delay: 1300, size: 2 },
  { x: width * 0.08, y: height * 0.45, delay: 400,  size: 3 },
  { x: width * 0.55, y: height * 0.10, delay: 1000, size: 2.5 },
  { x: width * 0.35, y: height * 0.70, delay: 200,  size: 2 },
  { x: width * 0.80, y: height * 0.65, delay: 1600, size: 3 },
  { x: width * 0.22, y: height * 0.30, delay: 900,  size: 2 },
  { x: width * 0.65, y: height * 0.55, delay: 500,  size: 2.5 },
  { x: width * 0.42, y: height * 0.82, delay: 1200, size: 2 },
  { x: width * 0.05, y: height * 0.22, delay: 550,  size: 3 },
  { x: width * 0.92, y: height * 0.14, delay: 850,  size: 2.5 },
  { x: width * 0.48, y: height * 0.05, delay: 1400, size: 3.5 },
  { x: width * 0.28, y: height * 0.50, delay: 300,  size: 2 },
  { x: width * 0.72, y: height * 0.90, delay: 1100, size: 2.5 },
  { x: width * 0.12, y: height * 0.75, delay: 1800, size: 3 },
  { x: width * 0.60, y: height * 0.40, delay: 650,  size: 2 },
  { x: width * 0.90, y: height * 0.78, delay: 1550, size: 3.5 },
  { x: width * 0.38, y: height * 0.92, delay: 80,   size: 2.5 },
  { x: width * 0.18, y: height * 0.08, delay: 1250, size: 2 },
  { x: width * 0.82, y: height * 0.48, delay: 420,  size: 3 },
  { x: width * 0.50, y: height * 0.60, delay: 980,  size: 2 },
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
      if (!isCyclingRef.current) {
        isCyclingRef.current = true;
        cyclePrompts(0);
      }
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
            .start(({ finished: outFinished }) => {
              if (!outFinished) return;
              setTimeout(() => cyclePrompts(index + 1), 120);
            });
        }, 1800);
      });
  };

  return (
    <LinearGradient
      colors={['#6b3f52', '#52303f', '#35202c']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      {/* Sparkles */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {SPARKLES.map((s, i) => (
          <Sparkle key={i} {...s} />
        ))}
      </View>

      <View style={[styles.content, { paddingTop: insets.top + spacing.xl }]}>
        <Animated.View style={[styles.inner, {
          opacity: contentOpacity,
          transform: [{ translateY: contentY }],
        }]}>

          {/* Icon — centered in circle */}
          <View style={styles.iconWrap}>
            <CameraIcon size={44} color="#fff" />
          </View>

          <Text style={styles.instruction}>
            Record a message for{'\n'}your future self
          </Text>
          <Text style={styles.nextTime}>next time you</Text>

          <View style={styles.promptContainer}>
            <Animated.Text
              style={[styles.prompt, { opacity: promptOpacity }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {PROMPTS[promptIndex]}
            </Animated.Text>
          </View>

        </Animated.View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Text style={styles.hint}>
          Be honest. Be direct.{'\n'}Your future self is listening.
        </Text>
        <TouchableOpacity
          style={styles.recordBtn}
          onPress={() => navigation.navigate('Record', { prefill: undefined })}
          activeOpacity={0.85}
        >
          <CameraIcon size={20} color="#fff" />
          <Text style={styles.recordBtnText}>Start Recording</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  inner: {
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  // Icon circle — fixed size, centered content
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  instruction: {
    fontFamily: fonts.montserratBold,
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 32,
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
  hint: {
    fontFamily: fonts.inter,
    fontSize: 13,
    color: 'rgba(255,255,255,0.38)',
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 20,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
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
  recordBtnText: {
    fontFamily: fonts.montserratBold,
    fontSize: 16,
    color: '#fff',
  },
});
